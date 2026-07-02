import { useEffect, useState } from "react";
import axios from "axios";
import { IDS } from "@/constants/testIds";
import { SpreadChart } from "@/components/SpreadChart";
import { FlaskConical, Play } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const Simulator = () => {
  const [deals, setDeals] = useState([]);
  const [dealId, setDealId] = useState("");
  const [scenario, setScenario] = useState({
    ftc_phase2: false,
    competing_bidder: false,
    activist_added: false,
    rate_shock_bps: 0,
    vix_shock: 0,
    horizon_days: 90,
  });
  const [result, setResult] = useState(null);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    axios.get(`${API}/deals`).then((r) => {
      const pending = r.data.deals.filter((d) => d.status === "Pending");
      setDeals(pending);
      if (pending.length) setDealId(pending[0].id);
    });
  }, []);

  const run = async () => {
    if (!dealId) return;
    setRunning(true);
    try {
      const { data } = await axios.post(`${API}/deals/${dealId}/scenario`, scenario);
      setResult(data);
    } finally { setRunning(false); }
  };

  const Toggle = ({ k, label, desc }) => (
    <label className="flex items-start gap-2 cursor-pointer p-2 hover:bg-[#0d0d0d] border border-[#1f1f1f]">
      <input
        type="checkbox"
        checked={scenario[k]}
        onChange={(e) => setScenario((s) => ({ ...s, [k]: e.target.checked }))}
        className="mt-1 accent-[var(--signal-cyan)]"
        data-testid={`toggle-${k}`}
      />
      <div>
        <div className="mono text-xs">{label}</div>
        <div className="text-[10px] text-[var(--text-muted)]">{desc}</div>
      </div>
    </label>
  );

  const SliderRow = ({ k, min, max, step, label, fmt }) => (
    <div className="p-2 border border-[#1f1f1f]">
      <div className="flex justify-between mono text-[11px] mb-1">
        <span>{label}</span>
        <span className="text-[var(--signal-cyan)]">{fmt(scenario[k])}</span>
      </div>
      <input
        type="range"
        min={min} max={max} step={step}
        value={scenario[k]}
        onChange={(e) => setScenario((s) => ({ ...s, [k]: Number(e.target.value) }))}
        className="w-full accent-[var(--signal-cyan)]"
        data-testid={`slider-${k}`}
      />
    </div>
  );

  return (
    <div className="p-3 md:p-4 space-y-3">
      <section className="terminal-panel" data-testid={IDS.scenarioPanel}>
        <div className="panel-header">
          <span className="flex items-center gap-2">
            <FlaskConical size={12} className="text-[var(--signal-cyan)]" />
            What-If Simulation Lab
          </span>
        </div>
        <div className="p-4 grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-3">
            <div className="mono text-[10px] uppercase tracking-widest text-[var(--text-secondary)] mb-1">Target Deal</div>
            <select
              value={dealId}
              onChange={(e) => setDealId(e.target.value)}
              className="w-full bg-[#0a0a0a] border border-[#1f1f1f] px-2 py-2 mono text-xs"
              data-testid="simulator-deal-select"
            >
              {deals.map((d) => (
                <option key={d.id} value={d.id}>{d.acquirer_ticker} → {d.target_ticker} (${d.deal_value_b}B)</option>
              ))}
            </select>
            <div className="mt-3 space-y-2">
              <Toggle k="ftc_phase2" label="FTC/EC Phase II Investigation" desc="Inject deep-dive antitrust review" />
              <Toggle k="competing_bidder" label="Competing Bidder Emerges" desc="Adds 30pp competing bid probability" />
              <Toggle k="activist_added" label="New Activist Investor" desc="Adds 25pp activist pressure" />
            </div>
          </div>

          <div className="md:col-span-4 space-y-2">
            <SliderRow k="rate_shock_bps" min={-200} max={500} step={25} label="Interest Rate Shock (bps)" fmt={(v) => `${v > 0 ? "+" : ""}${v} bps`} />
            <SliderRow k="vix_shock" min={0} max={40} step={1} label="VIX Spike" fmt={(v) => `+${v} pts`} />
            <SliderRow k="horizon_days" min={30} max={180} step={15} label="Forecast Horizon" fmt={(v) => `${v} days`} />
            <button
              onClick={run}
              disabled={running || !dealId}
              data-testid={IDS.scenarioRun}
              className="btn-term active w-full mt-2 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Play size={12}/> {running ? "Computing..." : "Run Scenario"}
            </button>
          </div>

          <div className="md:col-span-5">
            {result ? (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  <div className="terminal-panel p-3">
                    <div className="mono text-[10px] uppercase tracking-widest text-[var(--text-secondary)]">Baseline Success</div>
                    <div className="mono text-2xl">{(result.baseline.success_prob * 100).toFixed(1)}%</div>
                  </div>
                  <div className="terminal-panel p-3">
                    <div className="mono text-[10px] uppercase tracking-widest text-[var(--text-secondary)]">Scenario Success</div>
                    <div className="mono text-2xl" style={{ color: result.scenario.success_prob > result.baseline.success_prob ? "var(--signal-green)" : "var(--signal-red)" }}>
                      {(result.scenario.success_prob * 100).toFixed(1)}%
                    </div>
                  </div>
                  <div className="terminal-panel p-3">
                    <div className="mono text-[10px] uppercase tracking-widest text-[var(--text-secondary)]">Δ</div>
                    <div className="mono text-2xl" style={{ color: result.scenario.delta_success >= 0 ? "var(--signal-green)" : "var(--signal-red)" }}>
                      {result.scenario.delta_success > 0 ? "+" : ""}{(result.scenario.delta_success * 100).toFixed(1)}pp
                    </div>
                  </div>
                  <div className="terminal-panel p-3">
                    <div className="mono text-[10px] uppercase tracking-widest text-[var(--text-secondary)]">New Reg Risk</div>
                    <div className="mono text-xl text-[var(--signal-red)]">{result.scenario.reg_risk_score.toFixed(0)}</div>
                  </div>
                  <div className="terminal-panel p-3 col-span-2">
                    <div className="mono text-[10px] uppercase tracking-widest text-[var(--text-secondary)]">New Vote Approval</div>
                    <div className="mono text-xl text-[var(--signal-amber)]">{(result.scenario.vote_approval_prob * 100).toFixed(1)}%</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mono text-[11px] text-[var(--text-muted)] p-4 border border-dashed border-[#1f1f1f]">
                ▶ Configure shocks on the left, then click <span className="text-[var(--signal-cyan)]">Run Scenario</span> to recompute success probability, regulatory risk, vote approval, and projected spread.
              </div>
            )}
          </div>
        </div>
      </section>

      {result && (
        <section className="terminal-panel">
          <div className="panel-header">
            <span>Scenario Spread Projection</span>
            <span className="mono normal-case tracking-normal text-[var(--text-muted)]">
              Horizon: {scenario.horizon_days}d · Success used: {(result.spread.success_prob_used * 100).toFixed(1)}%
            </span>
          </div>
          <div className="p-4">
            <SpreadChart history={result.spread.history} forecast={result.spread.forecast} offerPrice={deals.find((d) => d.id === dealId)?.offer_price} />
          </div>
        </section>
      )}
    </div>
  );
};
