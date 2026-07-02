import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import axios from "axios";
import { HealthGauge } from "@/components/HealthGauge";
import { SpreadChart } from "@/components/SpreadChart";
import { ForceGraph } from "@/components/ForceGraph";
import { LlmAnalyzePanel } from "@/components/LlmAnalyzePanel";
import { IDS } from "@/constants/testIds";
import { ChevronLeft, TrendingUp, Shield, Vote, Globe2, Wrench } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const Panel = ({ title, testid, icon: Icon, accent, children, right }) => (
  <section className="terminal-panel" data-testid={testid}>
    <div className="panel-header">
      <span className="flex items-center gap-2">
        {Icon && <Icon size={12} style={{ color: accent || "var(--signal-cyan)" }} />}
        {title}
      </span>
      {right}
    </div>
    <div className="p-4">{children}</div>
  </section>
);

const Stat = ({ label, value, color, hint }) => (
  <div>
    <div className="mono text-[10px] uppercase tracking-widest text-[var(--text-secondary)]">{label}</div>
    <div className="mono text-xl" style={{ color: color || "white" }}>{value}</div>
    {hint && <div className="mono text-[10px] text-[var(--text-muted)]">{hint}</div>}
  </div>
);

const MilestoneTimeline = ({ milestones = [] }) => {
  const colorFor = (s) => s === "complete" ? "var(--signal-green)" :
    s === "in-progress" ? "var(--signal-amber)" :
    s === "blocked" ? "var(--signal-red)" : "var(--text-muted)";
  return (
    <div className="relative pl-2">
      <div className="absolute left-3 top-2 bottom-2 w-px bg-[#1f1f1f]" />
      {milestones.map((m, i) => (
        <div key={i} className="flex items-start gap-3 mb-3 relative">
          <span className="led mt-1 z-10" style={{ color: colorFor(m.status), background: colorFor(m.status), borderRadius: "50%" }}></span>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <div className="mono text-xs">{m.label}</div>
              <div className="mono text-[10px] text-[var(--text-muted)]">{m.date.slice(0, 10)}</div>
            </div>
            <div className="mono text-[10px] uppercase tracking-wider" style={{ color: colorFor(m.status) }}>
              {m.status}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

const AttributionBars = ({ attributions }) => {
  const entries = Object.entries(attributions || {});
  const maxAbs = Math.max(...entries.map(([, v]) => Math.abs(v)), 0.01);
  return (
    <div className="space-y-1.5">
      {entries.map(([k, v]) => {
        const pct = (Math.abs(v) / maxAbs) * 100;
        const positive = v >= 0;
        return (
          <div key={k} className="grid grid-cols-12 gap-2 items-center">
            <div className="col-span-5 mono text-[11px] text-[var(--text-secondary)] truncate">{k}</div>
            <div className="col-span-6 relative h-2 bg-[#0a0a0a]">
              <div
                className="absolute top-0 h-full"
                style={{
                  left: positive ? "50%" : `${50 - pct / 2}%`,
                  width: `${pct / 2}%`,
                  background: positive ? "var(--signal-green)" : "var(--signal-red)",
                }}
              />
              <div className="absolute top-0 left-1/2 h-full w-px bg-[#333]" />
            </div>
            <div className="col-span-1 mono text-[10px] text-right" style={{ color: positive ? "var(--signal-green)" : "var(--signal-red)" }}>
              {v.toFixed(2)}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export const DealDetail = () => {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [graph, setGraph] = useState({ nodes: [], links: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        setLoading(true);
        const [d, g] = await Promise.all([
          axios.get(`${API}/deals/${id}`),
          axios.get(`${API}/deals/${id}/graph`),
        ]);
        if (mounted) { setData(d.data); setGraph(g.data); }
      } finally { if (mounted) setLoading(false); }
    };
    load();
    return () => { mounted = false; };
  }, [id]);

  if (loading || !data) {
    return <div className="p-8 mono text-sm text-[var(--text-secondary)] cursor-blink">Loading deal intelligence</div>;
  }
  const { deal, success_prediction, regulatory_risk, shareholder_vote, geopolitical, spread, fallback, deal_health_score, current_spread_pct } = data;

  return (
    <div className="p-3 md:p-4 space-y-3" data-testid={IDS.dealDetailPage}>
      {/* Header */}
      <div className="terminal-panel">
        <div className="p-4 flex flex-wrap items-center gap-4">
          <Link to="/" className="mono text-[11px] text-[var(--text-secondary)] hover:text-white inline-flex items-center gap-1">
            <ChevronLeft size={14}/> All Deals
          </Link>
          <div className="flex-1 min-w-[200px]">
            <div className="mono text-2xl">
              <span className="text-[var(--signal-cyan)]">{deal.acquirer_ticker}</span>
              <span className="text-[var(--text-muted)] mx-2">/</span>
              <span className="text-[var(--signal-green)]">{deal.target_ticker}</span>
            </div>
            <div className="text-[var(--text-secondary)]">
              {deal.acquirer_name} acquires {deal.target_name}
            </div>
            <div className="mono text-[10px] uppercase tracking-wider text-[var(--text-muted)] mt-1">
              {deal.sector} · ${deal.deal_value_b.toFixed(1)}B · {deal.payment} · {deal.status}
            </div>
          </div>
          <Stat label="Offer Price" value={`$${deal.offer_price?.toFixed(2)}`} />
          <Stat label="Current Px" value={`$${deal.current_price?.toFixed(2)}`} />
          <Stat label="Spread" value={`${current_spread_pct > 0 ? "+" : ""}${current_spread_pct.toFixed(2)}%`} color={current_spread_pct > 0 ? "var(--signal-green)" : "var(--signal-red)"} />
          <Stat label="Risk-Adj Return" value={`${spread.risk_adjusted_return_pct.toFixed(2)}%`} color={spread.risk_adjusted_return_pct > 0 ? "var(--signal-green)" : "var(--signal-red)"} />
        </div>
      </div>

      {/* Row 1: Health gauge + Success + Reg + Vote */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
        <Panel title="Deal Health Score" testid={IDS.dealHealthGauge} icon={TrendingUp} accent="var(--signal-green)">
          <HealthGauge score={deal_health_score} />
          <div className="grid grid-cols-2 gap-3 mt-3 text-center">
            <Stat label="Success Prob" value={`${(success_prediction.probability * 100).toFixed(1)}%`} color="var(--signal-green)" />
            <Stat label="Reg Risk" value={regulatory_risk.score.toFixed(0)} color={regulatory_risk.score > 65 ? "var(--signal-red)" : "var(--signal-amber)"} hint="0–100" />
          </div>
        </Panel>

        <div className="md:col-span-4">
          <Panel title="Lifecycle Milestones" icon={TrendingUp}>
            <MilestoneTimeline milestones={deal.milestones} />
          </Panel>
        </div>

        <div className="md:col-span-5">
          <Panel title="Spread Forecast (90d) — Confidence Band" testid={IDS.spreadChart} icon={TrendingUp} accent="var(--signal-cyan)">
            <SpreadChart history={spread.history} forecast={spread.forecast} offerPrice={deal.offer_price} />
            <div className="grid grid-cols-3 mt-3 gap-2 mono text-[11px]">
              <div><span className="text-[var(--text-secondary)]">Current Spread:</span> <span className="text-info">{spread.current_spread_pct.toFixed(2)}%</span></div>
              <div><span className="text-[var(--text-secondary)]">Risk-Adj Ret:</span> <span className={spread.risk_adjusted_return_pct > 0 ? "text-pos" : "text-neg"}>{spread.risk_adjusted_return_pct.toFixed(2)}%</span></div>
              <div><span className="text-[var(--text-secondary)]">Success Used:</span> {(spread.success_prob_used * 100).toFixed(1)}%</div>
            </div>
          </Panel>
        </div>
      </div>

      {/* Row 2: Feature attribution + Force graph */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
        <div className="md:col-span-5">
          <Panel title="Prediction Drivers (SHAP-style)" icon={TrendingUp}>
            <AttributionBars attributions={success_prediction.attributions} />
          </Panel>
        </div>
        <div className="md:col-span-7">
          <Panel title="Deal Ecosystem Graph" testid={IDS.forceGraph} icon={Globe2} accent="var(--signal-cyan)">
            <ForceGraph nodes={graph.nodes} links={graph.links} height={380} />
            <div className="mt-2 flex flex-wrap gap-3 mono text-[10px] text-[var(--text-secondary)]">
              <span><span className="led mr-1" style={{ color: "#00E5FF" }}></span>Acquirer</span>
              <span><span className="led mr-1" style={{ color: "#00E676" }}></span>Target</span>
              <span><span className="led mr-1" style={{ color: "#FF3B30" }}></span>Regulator/Activist</span>
              <span><span className="led mr-1" style={{ color: "#FFB300" }}></span>Sector</span>
              <span><span className="led mr-1" style={{ color: "#A3A3A3" }}></span>Institutional / Geo</span>
            </div>
          </Panel>
        </div>
      </div>

      {/* Row 3: Reg + Vote + Geo */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
        <div className="md:col-span-4">
          <Panel title="Regulatory Risk" testid={IDS.regPanel} icon={Shield} accent="var(--signal-red)">
            <div className="mono text-3xl text-[var(--signal-red)]">{regulatory_risk.score.toFixed(1)}<span className="text-sm text-[var(--text-muted)]"> / 100</span></div>
            <div className="mt-2 space-y-1.5">
              {regulatory_risk.factors.map((f, i) => (
                <div key={i} className="flex justify-between text-[11px]">
                  <span className="text-[var(--text-secondary)]">{f.label}</span>
                  <span className="mono text-warn">+{f.impact}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap gap-1">
              {deal.regulators.map((r) => (
                <span key={r} className="mono text-[10px] px-1.5 py-0.5 border border-[#1f1f1f]">{r}</span>
              ))}
            </div>
          </Panel>
        </div>

        <div className="md:col-span-4">
          <Panel title="Shareholder Vote Sim" testid={IDS.votePanel} icon={Vote} accent="var(--signal-amber)">
            <div className="mono text-3xl" style={{ color: shareholder_vote.approval_probability > 0.6 ? "var(--signal-green)" : "var(--signal-amber)" }}>
              {(shareholder_vote.approval_probability * 100).toFixed(1)}%
            </div>
            <div className="mono text-[11px] text-[var(--text-secondary)]">
              95% CI: {shareholder_vote.ci_low_pct.toFixed(1)}% – {shareholder_vote.ci_high_pct.toFixed(1)}%
            </div>
            <div className="mt-3 space-y-1">
              {shareholder_vote.blocs.map((b) => (
                <div key={b.name} className="flex justify-between mono text-[11px]">
                  <span className="text-[var(--text-secondary)]">{b.name} <span className="text-[var(--text-muted)]">({b.shares_pct}%)</span></span>
                  <span style={{ color: b.lean === "Support" ? "var(--signal-green)" : b.lean === "Against" ? "var(--signal-red)" : "var(--signal-amber)" }}>{b.lean}</span>
                </div>
              ))}
            </div>
          </Panel>
        </div>

        <div className="md:col-span-4">
          <Panel title="Geopolitical Friction" testid={IDS.geoPanel} icon={Globe2} accent="var(--signal-orange)">
            <div className="mono text-3xl" style={{ color: geopolitical.score > 50 ? "var(--signal-red)" : "var(--signal-amber)" }}>
              {geopolitical.score.toFixed(0)}<span className="text-sm text-[var(--text-muted)]"> / 100</span>
            </div>
            <div className="mono text-[11px] text-[var(--text-secondary)] mt-2">
              Cross-Border: {deal.acquirer_country} → {deal.target_country}
            </div>
            <div className="mt-2 space-y-1">
              {geopolitical.drivers.map((d, i) => (
                <div key={i} className="flex justify-between mono text-[11px]">
                  <span className="text-[var(--text-secondary)]">{d.label}</span>
                  <span>{d.value}</span>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>

      {/* Row 4: Fallback + LLM */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
        <div className="md:col-span-5">
          <Panel title="Fallback Recommendations" testid={IDS.fallbackPanel} icon={Wrench} accent="var(--signal-amber)">
            <div className="mono text-[11px] text-[var(--text-secondary)] mb-2">
              Failure probability: <span className="text-neg">{(fallback.failure_probability * 100).toFixed(1)}%</span> · Revised offer suggested: <span className="text-pos">${fallback.revised_offer_price.toFixed(2)}</span>
            </div>
            <div className="space-y-2">
              {fallback.recommendations.map((r, i) => (
                <div key={i} className="border-l-2 border-[var(--signal-amber)] pl-2">
                  <div className="mono text-xs font-semibold text-white">{r.strategy}</div>
                  <div className="text-[11px] text-[var(--text-secondary)]">{r.detail}</div>
                  {r.expected_lift > 0 && (
                    <div className="mono text-[10px] text-pos mt-0.5">Expected lift: +{(r.expected_lift * 100).toFixed(1)}pp</div>
                  )}
                </div>
              ))}
            </div>
          </Panel>
        </div>
        <div className="md:col-span-7">
          <LlmAnalyzePanel dealId={deal.id} />
        </div>
      </div>
    </div>
  );
};
