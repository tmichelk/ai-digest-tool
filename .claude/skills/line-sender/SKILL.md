# LINE Sender スキル

LINEにメッセージを送信します。

## 使い方

```bash
node .claude/skills/line-sender/scripts/send-message.js /tmp/digest-message.txt
```

メッセージを `/tmp/digest-message.txt` に書き込んでから、このスクリプトを実行してください。

## 必要な環境変数

| 変数名 | 説明 |
|---|---|
| `LINE_CHANNEL_ACCESS_TOKEN` | LINE Messaging API のチャネルアクセストークン |
| `LINE_USER_ID` | 送信先のユーザーID（`U` から始まる文字列） |

## 動作仕様

- メッセージが4900字を超える場合、セクション区切り（`━━━`）で自動的に分割して複数送信
- LINE Messaging API の push エンドポイントを使用
- 送信失敗時は詳細なエラーメッセージを出力して exit 1

## 禁止事項

- curl で直接 LINE API を叩かない
- 独自の送信ロジックを書かない
- 必ずこのスクリプトを使用すること
