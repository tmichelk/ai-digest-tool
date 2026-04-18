#!/usr/bin/env node
'use strict';

const fs = require('fs');

const TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;
const USER_ID = process.env.LINE_USER_ID;
const LINE_API = 'https://api.line.me/v2/bot/message/push';
const MAX_CHARS = 4900;

function validate() {
  if (!TOKEN) {
    console.error('❌ 環境変数 LINE_CHANNEL_ACCESS_TOKEN が設定されていません');
    process.exit(1);
  }
  if (!USER_ID) {
    console.error('❌ 環境変数 LINE_USER_ID が設定されていません');
    process.exit(1);
  }
}

function splitMessage(text) {
  if (text.length <= MAX_CHARS) return [text];

  const SEPARATOR = '━━━━━━━━━━━━━━━━━━';
  const parts = text.split(SEPARATOR);
  const chunks = [];
  let current = '';

  for (let i = 0; i < parts.length; i++) {
    const sep = current ? SEPARATOR : '';
    const candidate = current + sep + parts[i];
    if (candidate.length > MAX_CHARS && current) {
      chunks.push(current.trim());
      current = parts[i];
    } else {
      current = candidate;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

async function pushMessages(chunks) {
  // LINE API は1リクエストで最大5メッセージ
  for (let i = 0; i < chunks.length; i += 5) {
    const batch = chunks.slice(i, i + 5).map((text) => ({ type: 'text', text }));
    const res = await fetch(LINE_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${TOKEN}`,
      },
      body: JSON.stringify({ to: USER_ID, messages: batch }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`LINE API ${res.status}: ${body}`);
    }
  }
}

async function main() {
  validate();

  const filePath = process.argv[2];
  if (!filePath) {
    console.error('使い方: node send-message.js <メッセージファイルパス>');
    process.exit(1);
  }

  const text = fs.readFileSync(filePath, 'utf8').trim();
  if (!text) {
    console.error('❌ メッセージファイルが空です');
    process.exit(1);
  }

  const chunks = splitMessage(text);
  console.log(`[line-sender] ${chunks.length} 件のメッセージを送信します...`);
  await pushMessages(chunks);
  console.log(`[line-sender] ✅ 送信完了`);
}

main().catch((err) => {
  console.error('[line-sender] ❌ エラー:', err.message);
  process.exit(1);
});
