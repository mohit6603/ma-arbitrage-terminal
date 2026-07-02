import { BrowserRouter, Routes, Route, Link, useLocation } from "react-router-dom";
import { Dashboard } from "@/pages/Dashboard";
import { DealDetail } from "@/pages/DealDetail";
import { Simulator } from "@/pages/Simulator";
import { About } from "@/pages/About";
import { LiveTicker } from "@/components/LiveTicker";
import { IDS } from "@/constants/testIds";
import { Activity, BarChart3, FlaskConical, Info } from "lucide-react";
import "@/index.css";

const NavItem = ({ to, label, icon: Icon, testId }) => {
  const loc = useLocation();
  const active = loc.pathname === to || (to !== "/" && loc.pathname.startsWith(to));
  return (
    <Link
      to={to}
      data-testid={testId}
      className={`flex items-center gap-2 px-3 py-2 mono text-xs uppercase tracking-wider transition-colors border-r border-[#1f1f1f] ${
        active ? "text-[var(--signal-green)] bg-[#0d0d0d]" : "text-[var(--text-secondary)] hover:text-white hover:bg-[#111]"
      }`}
    >
      <Icon size={14} />
      <span>{label}</span>
    </Link>
  );
};

const TopBar = () => {
  return (
    <header
      data-testid={IDS.topBar}
      className="sticky top-0 z-50 flex items-stretch border-b border-[#1f1f1f] bg-[#050505] backdrop-blur"
    >
      <div className="flex items-center px-4 border-r border-[#1f1f1f]">
        <div className="flex items-center gap-2">
          <span className="led led-pulse" style={{ color: "var(--signal-green)" }}></span>
          <span className="mono text-sm font-semibold tracking-tight">
            ARBITRAGE<span className="text-[var(--signal-cyan)]">.TERMINAL</span>
          </span>
        </div>
        <span className="ml-3 px-2 py-0.5 mono text-[10px] uppercase tracking-wider text-[var(--signal-amber)] border border-[var(--signal-amber)]/30">
          v1.0
        </span>
      </div>
      <nav className="flex">
        <NavItem to="/" label="Deal Universe" icon={BarChart3} testId={IDS.navDashboard} />
        <NavItem to="/simulator" label="What-If Lab" icon={FlaskConical} testId={IDS.navSimulator} />
        <NavItem to="/about" label="System" icon={Info} testId={IDS.navAbout} />
      </nav>
      <div className="ml-auto flex items-center gap-4 px-4 mono text-[11px] text-[var(--text-secondary)]">
        <span className="flex items-center gap-1.5">
          <Activity size={12} className="text-[var(--signal-green)]" />
          <span>LIVE</span>
        </span>
        <span className="hidden md:inline">
          {new Date().toUTCString().slice(5, 25)} UTC
        </span>
      </div>
    </header>
  );
};

const Footer = () => (
  <footer className="border-t border-[#1f1f1f] mt-6 px-4 py-3 flex items-center justify-between mono text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
    <span>© Arbitrage Terminal · Synthetic data for demonstration</span>
    <span>Models: XGBoost · LSTM/Transformer · Claude-Sonnet-4.5 · Monte-Carlo</span>
  </footer>
);

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen flex flex-col bg-[var(--bg-base)]">
        <TopBar />
        <LiveTicker />
        <main className="flex-1 grid-bg">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/deal/:id" element={<DealDetail />} />
            <Route path="/simulator" element={<Simulator />} />
            <Route path="/about" element={<About />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </BrowserRouter>
  );
}
