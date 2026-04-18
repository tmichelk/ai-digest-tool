export default function AIDigestOverview() {
  const categories = [
    { emoji: "🆕", label: "新ツール・サービス", sources: "OpenAI / Anthropic / Google / Meta", color: "#dbeafe", border: "#93c5fd" },
    { emoji: "🔬", label: "研究・技術", sources: "Hugging Face / ArXiv", color: "#dcfce7", border: "#86efac" },
    { emoji: "💼", label: "ビジネス活用", sources: "TechCrunch / VentureBeat / The Verge / Wired", color: "#fef9c3", border: "#fde047" },
    { emoji: "📋", label: "規制・政策", sources: "MIT Tech Review / Ars Technica", color: "#fce7f3", border: "#f9a8d4" },
    { emoji: "🖥️", label: "Cursor情報", sources: "Cursor Blog / Changelog / Reddit", color: "#ede9fe", border: "#c4b5fd" },
  ];

  const steps = [
    {
      step: "1",
      title: "毎朝7時に自動起動",
      subtitle: "GitHub Actions（無料）",
      icon: "⏰",
      color: "#f0f9ff",
      border: "#7dd3fc",
      detail: "スケジュール設定だけで\n毎朝自動で動き出す",
    },
    {
      step: "2",
      title: "ニュースを一括収集",
      subtitle: "RSS フィード 15ソース（無料）",
      icon: "📡",
      color: "#f0fdf4",
      border: "#86efac",
      detail: "過去24時間の記事を\n自動で取得・整理",
    },
    {
      step: "3",
      title: "AIが選別・要約",
      subtitle: "Claude AI（約$0.05/回）",
      icon: "🤖",
      color: "#fefce8",
      border: "#fde047",
      detail: "重要な記事を選び\n日本語で1〜2文に要約",
    },
    {
      step: "4",
      title: "LINEに送信",
      subtitle: "LINE Messaging API（無料）",
      icon: "💬",
      color: "#f5f3ff",
      border: "#c4b5fd",
      detail: "朝に届くので\n通勤中に読める",
    },
  ];

  return (
    <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", backgroundColor: "#f8fafc", minHeight: "100vh", padding: "32px 24px" }}>
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: "40px" }}>
        <div style={{ fontSize: "36px", marginBottom: "8px" }}>🤖</div>
        <h1 style={{ fontSize: "26px", fontWeight: "700", color: "#1e293b", margin: "0 0 8px" }}>
          AI Digest Tool
        </h1>
        <p style={{ fontSize: "15px", color: "#64748b", margin: 0 }}>
          最新AI情報を毎朝LINEに自動配信する仕組み
        </p>
      </div>

      {/* Flow Steps */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "center", gap: "0", marginBottom: "48px", flexWrap: "wrap" }}>
        {steps.map((s, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center" }}>
            <div style={{
              backgroundColor: s.color,
              border: `2px solid ${s.border}`,
              borderRadius: "16px",
              padding: "20px 16px",
              width: "148px",
              textAlign: "center",
              position: "relative",
            }}>
              <div style={{
                position: "absolute", top: "-12px", left: "50%", transform: "translateX(-50%)",
                backgroundColor: s.border, color: "#fff", borderRadius: "50%",
                width: "24px", height: "24px", display: "flex", alignItems: "center",
                justifyContent: "center", fontSize: "12px", fontWeight: "700",
              }}>
                {s.step}
              </div>
              <div style={{ fontSize: "28px", marginBottom: "8px" }}>{s.icon}</div>
              <div style={{ fontSize: "13px", fontWeight: "700", color: "#1e293b", marginBottom: "4px", lineHeight: "1.3" }}>{s.title}</div>
              <div style={{ fontSize: "10px", color: "#64748b", marginBottom: "8px" }}>{s.subtitle}</div>
              <div style={{ fontSize: "10px", color: "#475569", lineHeight: "1.5", whiteSpace: "pre-line" }}>{s.detail}</div>
            </div>
            {i < steps.length - 1 && (
              <div style={{ fontSize: "20px", color: "#94a3b8", padding: "0 4px", flexShrink: 0 }}>→</div>
            )}
          </div>
        ))}
      </div>

      {/* News Sources */}
      <div style={{ maxWidth: "820px", margin: "0 auto 40px" }}>
        <h2 style={{ fontSize: "16px", fontWeight: "700", color: "#1e293b", textAlign: "center", marginBottom: "20px" }}>
          📡 収集するニュースのカテゴリ（15ソース）
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "12px" }}>
          {categories.map((c, i) => (
            <div key={i} style={{
              backgroundColor: c.color,
              border: `1.5px solid ${c.border}`,
              borderRadius: "12px",
              padding: "14px 16px",
            }}>
              <div style={{ fontSize: "18px", marginBottom: "4px" }}>{c.emoji}</div>
              <div style={{ fontSize: "13px", fontWeight: "700", color: "#1e293b", marginBottom: "4px" }}>{c.label}</div>
              <div style={{ fontSize: "11px", color: "#64748b" }}>{c.sources}</div>
            </div>
          ))}
        </div>
      </div>

      {/* LINE Message Preview */}
      <div style={{ maxWidth: "820px", margin: "0 auto 40px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
        {/* Preview */}
        <div>
          <h2 style={{ fontSize: "16px", fontWeight: "700", color: "#1e293b", marginBottom: "16px" }}>
            💬 毎朝届くLINEメッセージのイメージ
          </h2>
          <div style={{
            backgroundColor: "#fff",
            borderRadius: "16px",
            padding: "16px",
            boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
            border: "1px solid #e2e8f0",
          }}>
            <div style={{
              backgroundColor: "#00b900",
              borderRadius: "12px 12px 12px 4px",
              padding: "14px 16px",
              color: "#fff",
              fontSize: "12px",
              lineHeight: "1.7",
              maxWidth: "300px",
              boxShadow: "0 2px 8px rgba(0,185,0,0.2)",
            }}>
              <div style={{ fontWeight: "700", marginBottom: "6px", fontSize: "13px" }}>🤖 AI Daily Digest｜4/10</div>
              <div style={{ borderTop: "1px solid rgba(255,255,255,0.3)", paddingTop: "6px", marginBottom: "8px" }} />
              <div style={{ fontWeight: "700", marginBottom: "4px" }}>🆕 新ツール・サービス</div>
              <div style={{ marginBottom: "8px" }}>
                <div>▶ GPT-5がリリース</div>
                <div style={{ opacity: 0.9 }}>推論能力が大幅向上。コーディングで最高スコアを記録。</div>
                <div style={{ opacity: 0.75, fontSize: "11px" }}>→ openai.com/blog/...</div>
              </div>
              <div style={{ borderTop: "1px solid rgba(255,255,255,0.2)", paddingTop: "8px", marginBottom: "4px" }} />
              <div style={{ fontWeight: "700", marginBottom: "4px" }}>🖥️ Cursor情報</div>
              <div>
                <div>▶ Cursor v0.50リリース</div>
                <div style={{ opacity: 0.9 }}>Background Agentが正式版に。並列タスク実行に対応。</div>
                <div style={{ opacity: 0.75, fontSize: "11px" }}>→ cursor.com/changelog</div>
              </div>
              <div style={{ borderTop: "1px solid rgba(255,255,255,0.2)", paddingTop: "8px", marginTop: "8px", opacity: 0.8, fontSize: "11px" }}>
                本日 28件収集 → 9件をピックアップ
              </div>
            </div>
            <div style={{ textAlign: "right", fontSize: "11px", color: "#94a3b8", marginTop: "6px" }}>7:00 AM ✓✓</div>
          </div>
        </div>

        {/* Cost & Setup */}
        <div>
          <h2 style={{ fontSize: "16px", fontWeight: "700", color: "#1e293b", marginBottom: "16px" }}>
            💰 料金と必要なもの
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {[
              { label: "GitHub Actions", cost: "無料", note: "月2,000分の無料枠内", free: true },
              { label: "RSSフィード", cost: "無料", note: "全15ソース", free: true },
              { label: "LINE Messaging API", cost: "無料", note: "月200通まで（1日1通なので余裕）", free: true },
              { label: "Claude API", cost: "有料", note: "1回あたり約$0.05（月$1〜3）", free: false },
            ].map((item, i) => (
              <div key={i} style={{
                backgroundColor: item.free ? "#f0fdf4" : "#fff7ed",
                border: `1px solid ${item.free ? "#bbf7d0" : "#fed7aa"}`,
                borderRadius: "10px",
                padding: "10px 14px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}>
                <div>
                  <div style={{ fontSize: "13px", fontWeight: "600", color: "#1e293b" }}>{item.label}</div>
                  <div style={{ fontSize: "11px", color: "#64748b" }}>{item.note}</div>
                </div>
                <div style={{
                  backgroundColor: item.free ? "#22c55e" : "#f97316",
                  color: "#fff",
                  borderRadius: "20px",
                  padding: "2px 10px",
                  fontSize: "12px",
                  fontWeight: "700",
                  whiteSpace: "nowrap",
                }}>
                  {item.cost}
                </div>
              </div>
            ))}
          </div>

          <h2 style={{ fontSize: "16px", fontWeight: "700", color: "#1e293b", margin: "20px 0 12px" }}>
            🔑 必要なアカウント
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {[
              { icon: "🐙", name: "GitHub", note: "コードの置き場所・自動実行の基盤" },
              { icon: "🤖", name: "Anthropic Console", note: "Claude APIキーの発行（$5チャージ必要）" },
              { icon: "💬", name: "LINE Developers", note: "LINEボットの作成（無料）" },
            ].map((a, i) => (
              <div key={i} style={{
                backgroundColor: "#fff",
                border: "1px solid #e2e8f0",
                borderRadius: "10px",
                padding: "10px 14px",
                display: "flex",
                alignItems: "center",
                gap: "10px",
              }}>
                <span style={{ fontSize: "20px" }}>{a.icon}</span>
                <div>
                  <div style={{ fontSize: "13px", fontWeight: "600", color: "#1e293b" }}>{a.name}</div>
                  <div style={{ fontSize: "11px", color: "#64748b" }}>{a.note}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Setup Steps */}
      <div style={{ maxWidth: "820px", margin: "0 auto" }}>
        <h2 style={{ fontSize: "16px", fontWeight: "700", color: "#1e293b", textAlign: "center", marginBottom: "20px" }}>
          🚀 セットアップの流れ（全4ステップ）
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px" }}>
          {[
            { step: "A", title: "GitHubに\nコードをpush", icon: "🐙", note: "リポジトリを作成してコードをアップロード" },
            { step: "B", title: "LINE公式\nアカウント作成", icon: "💬", note: "LINEボットを作り、自分のLINEに友だち追加" },
            { step: "C", title: "APIキーを\n3つ登録", icon: "🔑", note: "GitHub Secretsに Anthropic・LINEのキーを設定" },
            { step: "D", title: "手動実行で\n動作確認", icon: "▶️", note: "GitHub ActionsからRun workflowをクリック" },
          ].map((s, i) => (
            <div key={i} style={{
              backgroundColor: "#fff",
              border: "1.5px solid #e2e8f0",
              borderRadius: "12px",
              padding: "16px 12px",
              textAlign: "center",
            }}>
              <div style={{
                backgroundColor: "#1e293b",
                color: "#fff",
                width: "28px", height: "28px",
                borderRadius: "50%",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "13px", fontWeight: "700",
                margin: "0 auto 10px",
              }}>
                {s.step}
              </div>
              <div style={{ fontSize: "22px", marginBottom: "8px" }}>{s.icon}</div>
              <div style={{ fontSize: "12px", fontWeight: "700", color: "#1e293b", marginBottom: "6px", whiteSpace: "pre-line", lineHeight: "1.4" }}>{s.title}</div>
              <div style={{ fontSize: "10px", color: "#64748b", lineHeight: "1.4" }}>{s.note}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
