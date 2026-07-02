export const About = () => {
  const modules = [
    { name: "Deal Success Prediction Engine", desc: "Logistic ensemble (XGBoost-equivalent) trained on 14 deal features: size, HHI, regulatory burden, governance resistance, financing certainty, payment mix, leverage. Outputs probability + SHAP-style attributions." },
    { name: "Spread Forecasting (LSTM/Transformer)", desc: "Hybrid time-series projection with 95% confidence band. Mean-reverting toward offer × P(success), shocked by VIX, interest rates, and scenario flags." },
    { name: "Regulatory Risk & Antitrust LLM", desc: "Claude Sonnet 4.5 streaming analysis with precedent citations (Microsoft-Activision, Nvidia-Arm, Adobe-Figma, Kroger-Albertsons). Rule-based 0–100 score + LLM narrative." },
    { name: "Shareholder Vote Simulator", desc: "Monte-Carlo (3,000 samples) over institutional/retail/activist blocs. Returns approval probability + 95% CI." },
    { name: "Geopolitical & Macro Risk", desc: "Cross-border friction score from 24-country friction index × cross-border multiplier × strictness of jurisdictional regulators." },
    { name: "Recovery / Fallback Engine", desc: "Multi-strategy recommender: revised offer, divestiture package, CVRs, termination fee optimization, Plan B targets." },
  ];
  const stack = [
    { layer: "Backend", t: "FastAPI (Python 3.11) · MongoDB (motor) · REST API" },
    { layer: "ML", t: "Logistic ensembles · Monte-Carlo simulators · time-series forecast" },
    { layer: "LLM", t: "Claude Sonnet 4.5 (Anthropic) · Streaming Analysis" },
    { layer: "Frontend", t: "React 19 · Recharts · react-force-graph-2d · TailwindCSS" },
    { layer: "Theme", t: "Bloomberg Terminal — JetBrains Mono · 1px grid borders · LED status" },
  ];
  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-4">
      <section className="terminal-panel">
        <div className="panel-header"><span>System Overview</span></div>
        <div className="p-5">
          <h1 className="mono text-3xl text-[var(--signal-cyan)]">Arbitrage<span className="text-white">.Terminal</span></h1>
          <p className="text-[var(--text-secondary)] mt-2 max-w-3xl">
            AI-Powered Merger Arbitrage & Deal Success Predictor with real-time regulatory
            risk scoring. Six integrated quantitative modules predict the probability a deal
            closes, model spread evolution, identify antitrust risks, simulate shareholder
            votes, score cross-border friction, and recommend remediation strategies — all
            grounded in deal features, historical precedent and a streaming LLM analyst.
          </p>
          <div className="mt-4 flex flex-wrap gap-2 mono text-[10px] uppercase tracking-wider">
            {["30 synthetic deals", "Includes Reliance/Viacom18", "Claude-Sonnet-4.5 RAG", "Force-directed ecosystem graph", "Monte-Carlo voting", "SHAP attributions"].map((t) => (
              <span key={t} className="px-2 py-0.5 border border-[#1f1f1f] text-[var(--text-secondary)]">{t}</span>
            ))}
          </div>
        </div>
      </section>

      <section className="terminal-panel">
        <div className="panel-header"><span>Quantitative Modules</span></div>
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          {modules.map((m, i) => (
            <div key={i} className="border-l-2 border-[var(--signal-cyan)] pl-3 py-1">
              <div className="mono text-sm font-semibold">{m.name}</div>
              <div className="text-[12px] text-[var(--text-secondary)]">{m.desc}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="terminal-panel">
        <div className="panel-header"><span>Technology Stack</span></div>
        <div className="p-4 space-y-1.5">
          {stack.map((s, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 border-b border-[#1f1f1f] pb-1.5">
              <span className="col-span-2 mono text-[10px] uppercase tracking-widest text-[var(--signal-amber)]">{s.layer}</span>
              <span className="col-span-10 mono text-xs text-[var(--text-secondary)]">{s.t}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="terminal-panel">
        <div className="panel-header"><span>Disclaimer</span></div>
        <div className="p-4 mono text-[11px] text-[var(--text-muted)]">
          All deal data, pricing, and signals are synthetic and intended solely for demonstration of the analytical pipeline.
          Not investment advice. Historical deal names (e.g., MSFT-ATVI) are used as illustrative templates only.
        </div>
      </section>
    </div>
  );
};
