#!/usr/bin/env node
'use strict';

// LinkedIn の新機能・アップデート情報を収集し、
// 「めっちゃ便利やん！」と言えるものだけを Gmail に送信する。

const fs = require('fs');
const path = require('path');
const Parser = require('rss-parser');
const yaml = require('js-yaml');
const nodemailer = require('nodemailer');

const CONFIG_PATH = path.resolve(__dirname, '../configs/linkedin.yml');
const STATE_PATH = process.env.LINKEDIN_STATE_PATH || path.resolve(__dirname, '../.state/linkedin-seen.json');
const DRY_RUN = process.argv.includes('--dry-run');

const parser = new Parser({
  timeout: 15000,
  headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ai-digest-tool/1.0)' },
});

const stripHtml = (s) => (s || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const escapeHtml = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function loadState() {
  try {
    return new Set(JSON.parse(fs.readFileSync(STATE_PATH, 'utf8')).seen || []);
  } catch {
    return new Set();
  }
}

function saveState(seen, limit) {
  fs.mkdirSync(path.dirname(STATE_PATH), { recursive: true });
  fs.writeFileSync(STATE_PATH, JSON.stringify({ seen: [...seen].slice(-limit) }), 'utf8');
}

async function collect(config, seen) {
  const { feeds, settings } = config;
  const cutoff = Date.now() - settings.lookback_hours * 3600 * 1000;
  const candidates = [];
  let failed = 0;

  for (const feed of feeds) {
    try {
      const result = await parser.parseURL(feed.url);
      for (const item of result.items) {
        const link = item.link || item.guid;
        const pub = item.isoDate || item.pubDate;
        if (!link || seen.has(link)) continue;
        if (pub && new Date(pub).getTime() < cutoff) continue;
        // 社外ソースは LinkedIn に関係する記事のみ
        const text = `${item.title} ${item.contentSnippet || ''}`;
        if (feed.origin === 'external' && !/linkedin|リンクトイン|リンクドイン/i.test(text)) continue;
        candidates.push({
          link,
          title: (item.title || '').trim(),
          summary: stripHtml(item['content:encoded'] || item.content || item.contentSnippet).slice(0, 400),
          source: feed.name,
          origin: feed.origin,
          published: pub ? new Date(pub).toISOString() : null,
        });
      }
      console.log(`  ${feed.name}: OK`);
    } catch (err) {
      failed++;
      console.log(`  ${feed.name}: ❌ ${err.message.slice(0, 80)}`);
    }
  }

  if (failed === feeds.length) throw new Error('全フィードの取得に失敗しました');

  // 重複URL除去 → 新しい順 → 上限
  const unique = [...new Map(candidates.map((c) => [c.link, c])).values()];
  unique.sort((a, b) => (b.published || '').localeCompare(a.published || ''));
  return unique.slice(0, settings.max_candidates);
}

function buildPrompt(candidates, maxItems) {
  const list = candidates
    .map((c, i) => `[${i}] (${c.origin === 'internal' ? 'LinkedIn公式' : '社外'}/${c.source})\nタイトル: ${c.title}\n概要: ${c.summary}`)
    .join('\n\n');

  return `あなたはLinkedInの新機能ウォッチャーです。以下の記事から、LinkedInに「追加された／追加予定の」新機能・アップデート・仕様変更を扱っているものだけを選び、
LinkedInユーザーが「めっちゃ便利やん！」と思う点を日本語で説明してください。

【選ぶ基準】
- LinkedIn本体の新機能・改善・ベータ・提供予定の発表（公式・報道・ユーザー報告のいずれも可）
- ユーザー（個人・採用担当・マーケター等）の仕事や転職活動に実際に役立つもの

【除外】
- 一般的なLinkedIn活用ノウハウ、コラム、体験談
- 採用・業績・訴訟など機能と無関係なニュース
- 機能の詳細が全くない記事

【出力】
JSON配列のみ。最大${maxItems}件。重要度の高い順。該当なしなら [] 。
各要素: {"index": 番号, "title": "日本語の見出し(30字以内)", "status": "提供開始" | "段階的に展開中" | "提供予定" | "ベータ" | "不明", "wow": "何がどう便利か。2〜3文・120字以内。具体的に。", "who": "特に嬉しい人(20字以内)"}

【記事一覧】
${list}`;
}

async function callGemini(prompt, apiKey) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: 4096, responseMimeType: 'application/json' },
    }),
    signal: AbortSignal.timeout(90000),
  });
  if (!res.ok) throw new Error(`Gemini APIエラー ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
  const parsed = JSON.parse(text);
  if (!Array.isArray(parsed)) throw new Error('Geminiの出力が配列ではありません');
  return parsed;
}

function renderMail(items, now) {
  const date = now.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo', dateStyle: 'medium', timeStyle: 'short' });
  const subject = `💡 LinkedIn新機能 ${items.length}件｜${items[0].title}`;

  const text = [
    `LinkedInの新情報をキャッチしました（${date} JST）`,
    '',
    ...items.map(
      (it) =>
        `■ ${it.title}【${it.status}】\n  ${it.wow}\n  👤 ${it.who}\n  📎 出典: ${it.source}（${it.origin === 'internal' ? 'LinkedIn公式' : '社外'}）\n  ${it.link}\n`
    ),
  ].join('\n');

  const html = `<div style="font-family:-apple-system,'Hiragino Sans',sans-serif;max-width:600px;margin:0 auto;color:#1a1a1a">
<h2 style="color:#0a66c2;margin-bottom:4px">💡 LinkedIn 新機能キャッチ</h2>
<p style="color:#666;margin-top:0;font-size:13px">${escapeHtml(date)} JST</p>
${items
  .map(
    (it) => `<div style="border:1px solid #e0e0e0;border-radius:8px;padding:14px 16px;margin:14px 0">
<div style="font-size:12px;color:#0a66c2;font-weight:600">${escapeHtml(it.status)}</div>
<div style="font-size:17px;font-weight:700;margin:4px 0 8px">${escapeHtml(it.title)}</div>
<div style="font-size:14px;line-height:1.6">${escapeHtml(it.wow)}</div>
<div style="font-size:13px;color:#444;margin-top:8px">👤 ${escapeHtml(it.who)}</div>
<div style="font-size:12px;margin-top:8px">📎 出典: <a href="${escapeHtml(it.link)}">${escapeHtml(it.source)}</a>（${it.origin === 'internal' ? 'LinkedIn公式' : '社外'}）</div>
</div>`
  )
  .join('\n')}
</div>`;

  return { subject, text, html };
}

async function sendMail({ subject, text, html }) {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) throw new Error('GMAIL_USER / GMAIL_APP_PASSWORD が設定されていません');

  const transporter = nodemailer.createTransport({ service: 'gmail', auth: { user, pass } });
  await transporter.sendMail({
    from: `LinkedIn Watcher <${user}>`,
    to: process.env.MAIL_TO || user,
    subject,
    text,
    html,
  });
}

async function main() {
  const config = yaml.load(fs.readFileSync(CONFIG_PATH, 'utf8'));
  const { settings } = config;
  const seen = loadState();

  console.log('📡 LinkedIn関連フィードを取得中...');
  const candidates = await collect(config, seen);
  console.log(`📰 未送信の候補: ${candidates.length}件`);
  if (!candidates.length) return;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY が設定されていません');

  const picks = await callGemini(buildPrompt(candidates, settings.max_items_per_mail), apiKey);
  const items = picks
    .filter((p) => candidates[p.index])
    .slice(0, settings.max_items_per_mail)
    .map((p) => ({ ...candidates[p.index], title: p.title, status: p.status || '不明', wow: p.wow, who: p.who || '' }));

  if (items.length) {
    const mail = renderMail(items, new Date());
    if (DRY_RUN) {
      console.log(mail.subject + '\n\n' + mail.text);
    } else {
      await sendMail(mail);
      console.log(`✅ メール送信完了（${items.length}件）`);
    }
  } else {
    console.log('📭 便利な新情報なし。送信をスキップします。');
  }

  // 判定済みは（選ばれなくても）再判定しない。送信成功後にのみ記録する。
  if (!DRY_RUN) {
    candidates.forEach((c) => seen.add(c.link));
    saveState(seen, settings.seen_limit);
  }
}

main().catch((err) => {
  console.error('❌ エラー:', err.message);
  process.exit(1);
});
