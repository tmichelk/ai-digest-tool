#!/usr/bin/env node
'use strict';

const { execSync } = require('child_process');
const fs = require('fs');

const MESSAGE_PATH = '/tmp/digest-message.txt';
const FEEDS_PATH = '/tmp/raw-feeds.json';

function buildPrompt(data) {
  const now = new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });
  const today = new Date().toLocaleDateString('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).replace(/\//g, '/');

  const categoryLabels = {
    tools:    { label: '新ツール・サービス', emoji: '🆕' },
    research: { label: '研究・技術',         emoji: '🔬' },
    business: { label: 'ビジネス活用',       emoji: '💼' },
    policy:   { label: '規制・政策',         emoji: '📋' },
    cursor:   { label: 'Cursor情報',         emoji: '🖥️' },
  };

  let articlesText = '';
  let totalCount = 0;
  for (const [cat, articles] of Object.entries(data.categories)) {
    if (!articles.length) continue;
    const info = categoryLabels[cat] || { label: cat, emoji: '📰' };
    articlesText += `\n【${info.emoji} ${info.label}】\n`;
    for (const a of articles) {
      articlesText += `- タイトル: ${a.title}\n  要約: ${a.summary}\n  URL: ${a.link}\n  出典: ${a.source}\n`;
      totalCount++;
    }
  }

  if (totalCount === 0) return 'NO_ARTICLES';

  return `あなたはAIニュースのキュレーターです。以下の記事リストを分析し、価値ある情報だけをLINEメッセージとして整形してください。

【現在時刻】${now}（JST）
【収集記事数】${totalCount}件

【記事一覧】
${articlesText}

【選定基準】
以下のいずれかに該当する記事を3〜5件選ぶ：
- 新モデル・新機能の発表（GPT・Claude・Gemini・Cursorなど）
- AIツールの重要なアップデート
- 便利な使い方・実践的なTips
- 業界の注目トピック・技術トレンド
- 公式ブログ・Changelogの最新情報

【除外すべき記事】
- 採用・資金調達のみのニュース（AI技術と無関係な場合）
- 内容が全くない薄い記事

【出力ルール】
- 必ず3件以上、最大5件を選んでください
- 全記事が本当に価値なし（採用・資金調達のみ等）の場合のみ「NO_CONTENT」とだけ出力してください
- カテゴリが偏らないよう、異なるソース・テーマから選ぶこと

価値ある記事がある場合は以下のフォーマットで出力してください（他の文章は一切不要）：

🤖 AI Digest｜${today}

━━━━━━━━━━━━━━━━━━
（該当カテゴリのみ表示。記事がないカテゴリは省略）
🆕 新ツール・サービス

▶ 記事タイトル（英語の場合は日本語に意訳）
要約（1〜2文・40〜60字）
→ URL

━━━━━━━━━━━━━━━━━━
🤖 AI Digest で自動生成`;
}

async function callGemini(prompt, apiKey) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 90000);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 2048 },
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Gemini APIエラー ${res.status}: ${err}`);
    }

    const data = await res.json();
    return data.candidates[0].content.parts[0].text.trim();
  } finally {
    clearTimeout(timer);
  }
}

async function main() {
  console.log('=== AI Digest Tool 起動 ===');

  // 1. RSSフィードを取得
  console.log('\n📡 RSSフィードを取得中...');
  execSync('node .claude/skills/rss-fetcher/scripts/fetch-feeds.js', { stdio: 'inherit' });

  // 2. 取得結果を読み込む
  const rawData = JSON.parse(fs.readFileSync(FEEDS_PATH, 'utf8'));
  const totalArticles = Object.values(rawData.categories).reduce((s, a) => s + a.length, 0);

  if (totalArticles === 0) {
    console.log('\n📭 記事が0件。送信をスキップします。');
    return;
  }

  console.log(`\n📰 ${totalArticles}件の記事を取得。Gemini AIで分析中...`);

  // 3. APIキーを確認
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('❌ 環境変数 GEMINI_API_KEY が設定されていません');
    process.exit(1);
  }

  const prompt = buildPrompt(rawData);
  if (prompt === 'NO_ARTICLES') {
    console.log('\n📭 記事なし。送信をスキップします。');
    return;
  }

  // 4. Gemini AIで分析
  console.log('🤖 Gemini APIにリクエスト送信中（最大90秒）...');
  const message = await callGemini(prompt, apiKey);
  console.log('✅ Gemini応答受信完了');

  // 5. 価値ある情報がなければ終了
  if (!message || message === 'NO_CONTENT') {
    console.log('\n📭 価値ある情報なし。LINEへの送信をスキップします。');
    return;
  }

  // 6. メッセージをファイルに書き出す
  fs.writeFileSync(MESSAGE_PATH, message, 'utf8');
  console.log('\n✅ メッセージ生成完了。LINEに送信中...');

  // 7. LINEに送信
  execSync(`node .claude/skills/line-sender/scripts/send-message.js ${MESSAGE_PATH}`, {
    stdio: 'inherit',
  });

  console.log('\n🎉 完了！');
}

main().catch((err) => {
  console.error('❌ エラー:', err.message);
  process.exit(1);
});
