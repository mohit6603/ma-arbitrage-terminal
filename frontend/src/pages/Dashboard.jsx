import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { IDS } from "@/constants/testIds";
import { Search, ArrowUpRight } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const StatusBadge = ({ status }) => {
  const map = {
    Pending: { color: "var(--signal-amber)", led: true },
    Closed: { color: "var(--signal-green)", led: false },
    Terminated: { color: "var(--signal-red)", led: false },
    Withdrawn: { color: "var(--signal-red)", led: false },
  };
  const s = map[status] || { color: "var(--text-secondary)", led: false };
  return (
    <span className="inline-flex items-center gap-1.5 mono text-[10px] uppercase tracking-wider">
      <span className={`led ${s.led ? "led-pulse" : ""}`} style={{ color: s.color }}></span>
      <span style={{ color: s.color }}>{status}</span>
    </span>
  );
};

const HealthBar = ({ score }) => {
  const color = score > 60 ? "var(--signal-green)" : score > 35 ? "var(--signal-amber)" : "var(--signal-red)";
  return (
    <div className="flex items-center gap-2">
      <div className="bar-track w-16">
        <div className="bar-fill" style={{ width: `${Math.min(100, score)}%`, background: color }} />
      </div>
      <span className="mono text-xs" style={{ color }}>{score.toFixed(0)}</span>
    </div>
  );
};

const StatCard = ({ label, value, accent, sub }) => (
  <div className="terminal-panel p-3">
    <div className="mono text-[10px] uppercase tracking-widest text-[var(--text-secondary)]">{label}</div>
    <div className="mono text-2xl mt-1" style={{ color: accent || "white" }}>{value}</div>
    {sub && <div className="mono text-[10px] text-[var(--text-muted)] mt-0.5">{sub}</div>}
  </div>
);

export const Dashboard = () => {
  const [deals, setDeals] = useState([]);
  const [summary, setSummary] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [sectorFilter, setSectorFilter] = useState("All");
  const [sortBy, setSortBy] = useState("deal_health_score");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [d, s] = await Promise.all([
          axios.get(`${API}/deals`),
          axios.get(`${API}/portfolio/summary`),
        ]);
        setDeals(d.data.deals);
        setSummary(s.data);
      } finally { setLoading(false); }
    };
    load();
  }, []);

  const sectors = useMemo(() => ["All", ...new Set(deals.map((d) => d.sector))], [deals]);
  const filtered = useMemo(() => {
    let f = deals.filter((d) => {
      const q = search.toLowerCase();
      const matchSearch = !q ||
        d.target.toLowerCase().includes(q) ||
        d.acquirer.toLowerCase().includes(q) ||
        d.target_ticker.toLowerCase().includes(q) ||
        d.acquirer_ticker.toLowerCase().includes(q);
      const matchStatus = statusFilter === "All" || d.status === statusFilter;
      const matchSector = sectorFilter === "All" || d.sector === sectorFilter;
      return matchSearch && matchStatus && matchSector;
    });
    f.sort((a, b) => (b[sortBy] || 0) - (a[sortBy] || 0));
    return f;
  }, [deals, search, statusFilter, sectorFilter, sortBy]);

  return (
    <div className="p-3 md:p-4 space-y-4">
      {/* Top stats */}
      <section
        data-testid={IDS.portfolioPanel}
        className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2"
      >
        {summary && (
          <>
            <StatCard label="Total Deals" value={summary.total_deals} accent="white" sub="Tracked universe" />
            <StatCard label="Pending" value={summary.pending} accent="var(--signal-amber)" sub="Live arbitrage" />
            <StatCard label="Aggregate Value" value={`$${summary.aggregate_pending_value_b}B`} accent="var(--signal-cyan)" sub="Pending deal stack" />
            <StatCard label="Avg Success Prob" value={`${(summary.portfolio_avg_success_prob * 100).toFixed(1)}%`} accent="var(--signal-green)" sub="Portfolio mean" />
            <StatCard label="Avg Reg Risk" value={summary.portfolio_avg_reg_risk.toFixed(1)} accent="var(--signal-red)" sub="0–100 scale" />
            <StatCard label="Hist. Completion" value={`${(summary.historical_completion_rate * 100).toFixed(1)}%`} accent="white" sub="Closed / (Closed + Failed)" />
          </>
        )}
      </section>

      {/* Filters */}
      <section className="terminal-panel">
        <div className="panel-header">
          <span>Deal Universe</span>
          <span className="mono normal-case tracking-normal text-[var(--text-muted)]">
            {filtered.length} of {deals.length}
          </span>
        </div>
        <div className="p-3 flex flex-wrap gap-2 items-center border-b border-[#1f1f1f]">
          <div className="flex items-center bg-[#0a0a0a] border border-[#1f1f1f] px-2">
            <Search size={14} className="text-[var(--text-muted)]" />
            <input
              data-testid={IDS.filterSearch}
              placeholder="search ticker / company..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-transparent px-2 py-1.5 mono text-xs w-56 outline-none placeholder:text-[var(--text-muted)]"
            />
          </div>
          <select
            data-testid={IDS.filterStatus}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-[#0a0a0a] border border-[#1f1f1f] px-2 py-1.5 mono text-xs text-white"
          >
            {["All", "Pending", "Closed", "Terminated", "Withdrawn"].map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <select
            data-testid={IDS.filterSector}
            value={sectorFilter}
            onChange={(e) => setSectorFilter(e.target.value)}
            className="bg-[#0a0a0a] border border-[#1f1f1f] px-2 py-1.5 mono text-xs text-white max-w-[16rem]"
          >
            {sectors.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <div className="ml-auto flex items-center gap-1">
            <span className="mono text-[10px] uppercase tracking-wider text-[var(--text-secondary)]">Sort</span>
            {[
              { key: "deal_health_score", l: "Health" },
              { key: "success_prob", l: "Success" },
              { key: "reg_risk_score", l: "Reg-Risk" },
              { key: "deal_value_b", l: "Value" },
              { key: "spread_pct", l: "Spread" },
            ].map((s) => (
              <button
                key={s.key}
                onClick={() => setSortBy(s.key)}
                className={`btn-term ${sortBy === s.key ? "active" : ""}`}
              >{s.l}</button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto" data-testid={IDS.dealUniverseTable}>
          {loading ? (
            <div className="p-6 mono text-xs text-[var(--text-secondary)] cursor-blink">Loading deal universe</div>
          ) : (
            <table className="dense-table">
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Acquirer → Target</th>
                  <th>Sector</th>
                  <th className="text-right">Value (B)</th>
                  <th className="text-right">Spread %</th>
                  <th className="text-right">Success</th>
                  <th className="text-right">Reg Risk</th>
                  <th className="text-right">Health</th>
                  <th>Regulators</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((d) => (
                  <tr key={d.id} data-testid={IDS.dealRow(d.id)}>
                    <td><StatusBadge status={d.status} /></td>
                    <td>
                      <div className="mono text-xs">
                        <span className="text-[var(--signal-cyan)]">{d.acquirer_ticker}</span>
                        <span className="text-[var(--text-muted)]"> → </span>
                        <span className="text-[var(--signal-green)]">{d.target_ticker}</span>
                      </div>
                      <div className="text-[11px] text-[var(--text-secondary)]">{d.acquirer} / {d.target}</div>
                    </td>
                    <td className="text-xs text-[var(--text-secondary)]">{d.sector}</td>
                    <td className="text-right mono text-xs">${d.deal_value_b.toFixed(1)}</td>
                    <td className={`text-right mono text-xs ${d.spread_pct > 0 ? "text-pos" : "text-neg"}`}>
                      {d.spread_pct > 0 ? "+" : ""}{d.spread_pct.toFixed(2)}%
                    </td>
                    <td className="text-right mono text-xs">{(d.success_prob * 100).toFixed(1)}%</td>
                    <td className={`text-right mono text-xs ${d.reg_risk_score > 70 ? "text-neg" : d.reg_risk_score > 45 ? "text-warn" : "text-pos"}`}>
                      {d.reg_risk_score.toFixed(0)}
                    </td>
                    <td className="text-right"><HealthBar score={d.deal_health_score} /></td>
                    <td>
                      <div className="flex flex-wrap gap-1">
                        {d.regulators.slice(0, 4).map((r) => (
                          <span key={r} className="mono text-[9px] px-1 border border-[#1f1f1f] text-[var(--text-secondary)]">{r}</span>
                        ))}
                      </div>
                    </td>
                    <td>
                      <Link
                        to={`/deal/${d.id}`}
                        className="inline-flex items-center gap-1 mono text-[11px] text-[var(--signal-cyan)] hover:underline"
                      >
                        Open <ArrowUpRight size={12} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
};
