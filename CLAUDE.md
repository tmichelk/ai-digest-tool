# AI Digest Tool

最新AIニュースをLINEに毎日配信するツール。

## 実行方法

```bash
claude "/daily-digest を実行してください"
```

## プロジェクト構造

```
configs/
└── digest.yml          # フィード設定・配信設定

.claude/
├── prompts/
│   └── daily-digest.md # メイン処理フロー
└── skills/
    ├── rss-fetcher/     # RSSフィード取得
    ├── news-analyzer/   # 記事選別・要約ルール
    └── line-sender/     # LINE送信
```

## スキル参照ガイド

| タイミング | スキル | 内容 |
|---|---|---|
| フィード取得時 | rss-fetcher | スクリプトの使い方・出力形式 |
| 記事選別・整形時 | news-analyzer | 選別基準・要約ルール・フォーマット |
| LINE送信時 | line-sender | 送信スクリプトの使い方 |

## GitHub Secrets

| シークレット名 | 用途 |
|---|---|
| `ANTHROPIC_API_KEY` | Claude API 認証 |
| `LINE_CHANNEL_ACCESS_TOKEN` | LINE Messaging API 認証 |
| `LINE_USER_ID` | 送信先ユーザーID |

## LINE送信ルール

Slackへの投稿は **必ず `line-sender` スキルを使用** してください。

```bash
node .claude/skills/line-sender/scripts/send-message.js /tmp/digest-message.txt
```

**禁止事項:**
- curl で直接 LINE API を呼び出す
- 独自の送信ロジックを書く
