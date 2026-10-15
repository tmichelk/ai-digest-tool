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
const TEST_MAIL = process.argv.includes('--test-mail') || process.env.TEST_MAIL === 'true';

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
      const result = await parser.parseURL(encodeURI(feed.url));
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
LinkedInユーザーが「めっちゃ便利やん！」と思う点を、日本語で、おもしろおかしく具体的に説明してください。

【選ぶ基準】
- LinkedIn本体の新機能・改善・ベータ・提供予定の発表（公式・報道・ユーザー報告のいずれも可）
- ユーザー（個人・採用担当・マーケター等）の仕事や転職活動に実際に役立つもの

【除外】
- 一般的なLinkedIn活用ノウハウ、コラム、体験談
- 採用・業績・訴訟など機能と無関係なニュース
- 機能の詳細が全くない記事

【出力】
JSON配列のみ。最大${maxItems}件（厳選。3件に満たなければ無理に埋めない）。重要度の高い順。該当なしなら [] 。
各要素:
{
  "index": 番号,
  "title": "ツッコミ・誇張・たとえを効かせた大胆な見出し（40字以内）",
  "status": "提供開始" | "段階的に展開中" | "提供予定" | "ベータ" | "不明",
  "before": "「元々は○○だった」。従来の仕様・やり方・不便さを具体的に。ユーザーの『あるある』な苦労として描く。2〜3文。",
  "after": "「それが○○に進化した」。何がどう変わったかを、画面・操作・名称・数字・日付など記事にある事実で具体的に。『元々○○→今は○○』の対比がひと目で分かる書き方。2〜3文。",
  "wow": "「だからこうなる」。進化の結果、誰がどんな場面でどう楽になるかを、日常の具体的なシーン（例：月曜の朝、終電、上司の前）で描く。比喩・誇張・ツッコミ・大げさな実況を遠慮なく使い、笑えること最優先。4〜6文。",
  "who": "特に嬉しい人(20字以内)"
}

【文章ルール】
- ユーモアは大胆に。ボケ・ツッコミ・たとえ話・大げさな実況・自虐的あるあるを積極的に使う。ただし1文ごとに『何が変わったか』は必ず読み取れること（笑いだけで中身が消えるのは禁止）。
- 事実（変更内容・日付・名称・数字）は記事の記載から外れないこと。記事にないことを断定しない。笑いは表現と比喩で作り、事実は盛らない。
- 特定の個人・企業・属性を貶める表現は避ける。笑いのネタにするのは「仕様」と「ユーザーあるある」。
- 文字数制限はない。具体性と面白さを優先する。

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
      generationConfig: {
        maxOutputTokens: 8192,
        responseMimeType: 'application/json',
        thinkingConfig: { thinkingBudget: 0 },
      },
    }),
    signal: AbortSignal.timeout(90000),
  });
  if (!res.ok) throw new Error(`Gemini APIエラー ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    // 出力が途中で切れた場合、完結している要素だけ救出する
    const complete = text.slice(0, text.lastIndexOf('}') + 1).replace(/,\s*$/, '');
    parsed = JSON.parse(complete.endsWith(']') ? complete : complete + ']');
  }
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
        `■ ${it.title}【${it.status}】\n  🕰 元々は: ${it.before}\n  🚀 進化: ${it.after}\n  ✨ だからこうなる: ${it.wow}\n  👤 ${it.who}\n  📎 出典: ${it.source}（${it.origin === 'internal' ? 'LinkedIn公式' : '社外'}）\n  ${it.link}\n`
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
<div style="font-size:13px;color:#555;line-height:1.6;margin-bottom:6px">🕰 <b>元々は</b>：${escapeHtml(it.before)}</div>
<div style="font-size:14px;line-height:1.7;margin-bottom:6px">🚀 <b>それが進化</b>：${escapeHtml(it.after)}</div>
<div style="font-size:14px;line-height:1.7;background:#f3f8fe;border-radius:6px;padding:8px 10px">✨ <b>だからこうなる</b>　${escapeHtml(it.wow)}</div>
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
  if (TEST_MAIL) {
    // 送信経路（Gmail認証・宛先）だけを確認するテスト。記事の取得・判定は行わない。
    const mail = renderMail(
      [
        {
          title: 'テストメール：LinkedIn新機能モニター',
          status: 'テスト',
          before: '送信設定が合っているか、毎回ドキドキしていた。',
          after: '設定確認用のテストメールが届くようになった。',
          wow: 'このメールが届いていれば、Gmailでの送信設定は正常です。ドキドキは今日で卒業。新機能が見つかると、同じ形式でここに届きます。',
          who: '設定確認用',
          source: 'LinkedIn Watcher',
          origin: 'internal',
          link: 'https://github.com/tmichelk/ai-digest-tool',
        },
      ],
      new Date()
    );
    await sendMail(mail);
    console.log('✅ テストメールを送信しました。受信トレイ（迷惑メールも）を確認してください。');
    return;
  }

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
    .map((p) => ({
      ...candidates[p.index],
      title: p.title,
      status: p.status || '不明',
      before: p.before || '',
      after: p.after || '',
      wow: p.wow || '',
      who: p.who || '',
    }));

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

// 未クローズのソケットでプロセスが居残り、ジョブがタイムアウトするのを防ぐ
main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ エラー:', err.message);
    process.exit(1);
  });
