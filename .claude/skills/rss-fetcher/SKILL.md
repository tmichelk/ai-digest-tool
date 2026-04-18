# RSS Fetcher スキル

RSSフィードを取得して `/tmp/raw-feeds.json` に保存します。

## 使い方

```bash
node .claude/skills/rss-fetcher/scripts/fetch-feeds.js
```

設定ファイル `configs/digest.yml` のフィードリストを読み込み、
過去 `lookback_hours` 時間以内の記事を取得します。

## 出力形式 (/tmp/raw-feeds.json)

```json
{
  "fetched_at": "2026-04-10T22:00:00.000Z",
  "lookback_hours": 24,
  "categories": {
    "tools": [
      {
        "id": "openai",
        "source": "OpenAI Blog",
        "title": "GPT-5 is now available",
        "summary": "We're releasing...",
        "link": "https://openai.com/blog/gpt-5",
        "published": "2026-04-10T10:00:00.000Z"
      }
    ],
    "research": [...],
    "business": [...],
    "policy": [...],
    "cursor": [...]
  },
  "stats": {
    "total_fetched": 42,
    "total_filtered": 12,
    "failed_feeds": ["cursor_blog"]
  }
}
```

## 注意事項

- フィードの取得に失敗しても処理を継続する（`stats.failed_feeds` に記録）
- ArXiv は記事数が多いため上位 5 件のみ取得
- Reddit フィードは `<title>` と `<content>` から抜粋
