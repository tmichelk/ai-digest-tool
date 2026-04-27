#!/usr/bin/env node
'use strict';

const { execSync } = require('child_process');
const fs = require('fs');
const { JWT } = require('google-auth-library');

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

【送信すべき記事の基準】
以下のいずれかに該当するもののみ選ぶ：
- 重大な新モデルの発表（GPT・Claude・Geminiなどの新バージョン含む）
- 各AIツールの新機能・アップデートの正式発表
- 便利な使い方・実践的なTips
- 公式が発表した最新情報（ブログ・Changelog）

【除外すべき記事】
- 薄いプレスリリースや既報の焼き直し
- 採用・資金調達のみのニュース
- 内容が曖昧・不明確なもの

【出力ルール】
価値ある記事が1件もない場合は「NO_CONTENT」とだけ出力してください。

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

async function callGemini(prompt, credentialsJson) {
  const credentials = JSON.parse(credentialsJson);
  const projectId = credentials.project_id;

  // JWTでアクセストークンを取得
  console.log('🔑 Vertex AI認証中...');
  const jwtClient = new JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    scopes: ['https://www.googleapis.com/auth/cloud-platform'],
  });
  const tokenResponse = await jwtClient.getAccessToken();
  const token = tokenResponse.token;
  console.log('✅ 認証完了');

  const url = `https://us-central1-aiplatform.googleapis.com/v1/projects/${projectId}/locations/us-central1/publishers/google/models/gemini-2.0-flash:generateContent`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 90000);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 2048 },
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Vertex AI APIエラー ${res.status}: ${err}`);
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

  // 3. 認証情報を確認
  const credentialsJson = process.env.GOOGLE_CREDENTIALS_JSON;
  if (!credentialsJson) {
    console.error('❌ 環境変数 GOOGLE_CREDENTIALS_JSON が設定されていません');
    process.exit(1);
  }

  const prompt = buildPrompt(rawData);
  if (prompt === 'NO_ARTICLES') {
    console.log('\n📭 記事なし。送信をスキップします。');
    return;
  }

  // 4. Vertex AI Geminiで分析
  console.log('🤖 Vertex AI Geminiにリクエスト送信中（最大90秒）...');
  const message = await callGemini(prompt, credentialsJson);
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
