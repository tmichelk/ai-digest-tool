# AI Digest Tool

最新AIニュース（新ツール・研究・ビジネス活用・規制・Cursor情報）をClaudeが毎朝要約し、LINEに自動配信するツールです。

```
┌──────────────────────────────────────────────────────────────┐
│  🤖 AI Daily Digest｜2026/04/10                              │
│                                                              │
│  🆕 新ツール・サービス                                         │
│  ▶ GPT-5がリリース                                            │
│    推論能力が大幅向上。コーディング・数学で最高スコアを記録。     │
│    → https://openai.com/blog/gpt-5                           │
│                                                              │
│  🖥️ Cursor情報                                               │
│  ▶ Cursor v0.50リリース                                       │
│    Background Agentが正式版に。並列タスク実行に対応。            │
│    → https://cursor.com/changelog                            │
│                                                              │
│  🤖 AI Digest で自動生成                                      │
└──────────────────────────────────────────────────────────────┘
```

---

## 全体像

```
ai-digest-tool（GitHub Actions）
    │
    ├→ RSS フィードから最新AI記事を収集（15ソース）
    ├→ Claude API で記事を選別・日本語要約
    └→ LINE Messaging API でLINEに送信
```

---

## 料金について

| サービス | 用途 | 料金 |
|---|---|---|
| GitHub Actions | 定期実行 | 毎月 2,000 分無料 |
| RSS フィード | ニュース取得 | 無料 |
| Claude API | 記事の選別・要約 | 1回あたり約 $0.03〜0.10 |
| LINE Messaging API | メッセージ送信 | 月200通まで無料 |

---

## セットアップ

### Part A: ツール本体を GitHub に置く

#### 手順1: GitHub に新しいリポジトリを作る

1. https://github.com/new にアクセス
2. **Repository name** に `ai-digest-tool` と入力
3. **Private** を選択（APIキーを含むため必ずPrivateに）
4. 「Add a README file」のチェックは**外したまま**にする
5. 「Create repository」をクリック

#### 手順2: コードを GitHub にアップロードする

Cursor で AI に以下のように依頼してください:

> 「このコードを GitHub にpushして。リポジトリは `あなたのユーザー名/ai-digest-tool` です」

### Part B: LINE Messaging API を設定する

#### 手順1: LINE Developers Console でチャネルを作る

1. https://developers.line.biz/ にアクセスし、LINEアカウントでログイン
2. 「プロバイダー」→「作成」→ 任意の名前（例: `MyDigest`）で作成
3. 「チャネル設定」→「Messaging API」→「チャネルを作成」
   - チャネル名: `AI Digest`（任意）
   - 業種: 個人（任意）
4. 作成完了後、「Messaging API 設定」タブを開く

#### 手順2: チャネルアクセストークンを取得する

1. 「Messaging API 設定」タブの最下部
2. 「チャネルアクセストークン（長期）」の「発行」ボタンをクリック
3. 表示されたトークン（長い文字列）を**メモ帳に保存** → `LINE_CHANNEL_ACCESS_TOKEN` として使用

#### 手順3: ボットをLINEの友だちに追加する

1. 「Messaging API 設定」タブの「QRコード」からボットを友だち追加
2. LINEアプリでボットにメッセージを送る（なんでもOK）

#### 手順4: 自分のユーザーIDを確認する

1. 「チャネル基本設定」タブ → 「あなたのユーザーID」欄を確認
2. `U` で始まる文字列をコピー → `LINE_USER_ID` として使用

#### 手順5: 応答メッセージをオフにする（任意）

「Messaging API 設定」→「応答メッセージ」→「無効」にするとスッキリします。

### Part C: GitHub Secrets を設定する

リポジトリの Settings → Secrets and variables → Actions → 「New repository secret」

| シークレット名 | 値 |
|---|---|
| `ANTHROPIC_API_KEY` | `sk-ant-...` で始まるキー（https://console.anthropic.com/settings/keys） |
| `LINE_CHANNEL_ACCESS_TOKEN` | Part B 手順2で取得したトークン |
| `LINE_USER_ID` | Part B 手順4で確認したユーザーID（`U...`） |

> **Anthropic APIキーについて**: console.anthropic.com でアカウントを作成し、Billing（https://console.anthropic.com/settings/billing）で **$5 以上チャージ**してください。

### Part D: GitHub Actions を実行する

1. リポジトリの「**Actions**」タブを開く
2. 左サイドバーから「**AI Daily Digest**」をクリック
3. 「**Run workflow**」→「**Run workflow**」をクリック
4. 数分後、LINEにダイジェストが届きます

### チェックポイント

- [ ] LINEにダイジェストメッセージが届いた
- [ ] 各カテゴリの記事が日本語で要約されている
- [ ] Cursorセクションが含まれている

---

## カスタマイズ

### 定期実行を有効にする（毎朝7時）

`.github/workflows/daily-digest.yml` の `schedule` ブロックのコメントを外す:

変更前:
```yaml
  # schedule:
  #   - cron: '0 22 * * *'
```

変更後:
```yaml
  schedule:
    - cron: '0 22 * * *'
```

### フィードを追加・削除する

`configs/digest.yml` の `feeds` セクションを編集してください。

```yaml
feeds:
  - id: my_new_feed
    name: My New Feed
    url: https://example.com/feed.rss
    category: tools  # tools / research / business / policy / cursor
```

### 1カテゴリあたりの掲載件数を変更する

```yaml
settings:
  max_articles_per_category: 5  # デフォルト: 3
```

---

## ファイル構成

```
.claude/
├── prompts/
│   └── daily-digest.md          # メイン処理フロー
└── skills/
    ├── rss-fetcher/              # RSSフィード取得スクリプト
    ├── news-analyzer/            # 記事選別・要約ルール
    └── line-sender/              # LINE送信スクリプト

configs/
└── digest.yml                   # フィード設定

.github/workflows/
└── daily-digest.yml             # GitHub Actions 定義
```

---

## 困ったとき

| エラー | 原因 | 対処 |
|---|---|---|
| `Credit balance is too low` | Anthropic クレジット不足 | https://console.anthropic.com/settings/billing でチャージ |
| `LINE API 401` | LINE_CHANNEL_ACCESS_TOKEN が不正 | トークンを再発行してSecretを更新 |
| `LINE API 400: Invalid reply token` | LINE_USER_ID が不正 | LINE Developers Console でユーザーIDを再確認 |
| フィードが取得できない | RSSのURLが変更された | `configs/digest.yml` のURLを最新のものに更新 |
| Cursorセクションが空 | Cursor公式RSSが未提供の場合あり | Reddit r/cursor_ai のみ表示される場合は正常 |

---

## 技術スタック

| 項目 | 選定 | 理由 |
|---|---|---|
| 実行基盤 | GitHub Actions | 無料枠2,000分/月 |
| AI実行 | Claude Code Action | Skills機能で知識を分離・再利用 |
| ニュース取得 | RSS（rss-parser） | 無料・信頼性が高い |
| 通知 | LINE Messaging API | 月200通まで無料、スマホに即届く |
