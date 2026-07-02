import { useEffect, useState } from "react";
import axios from "axios";
import { IDS } from "@/constants/testIds";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const KIND_COLOR = {
  REGULATORY: "var(--signal-red)",
  MARKET: "var(--signal-cyan)",
  ACTIVIST: "var(--signal-amber)",
  "CROSS-BORDER": "var(--signal-orange)",
  RUMOR: "var(--text-secondary)",
};

export const LiveTicker = () => {
  const [items, setItems] = useState([]);
  useEffect(() => {
    let mounted = true;
    const fetchFeed = async () => {
      try {
        const { data } = await axios.get(`${API}/news-feed`);
        if (mounted) setItems(data.items || []);
      } catch (e) { /* ignore */ }
    };
    fetchFeed();
    const t = setInterval(fetchFeed, 30000);
    return () => { mounted = false; clearInterval(t); };
  }, []);

  if (!items.length) return null;
  const doubled = [...items, ...items];
  return (
    <div
      data-testid={IDS.liveTicker}
      className="border-b border-[#1f1f1f] overflow-hidden bg-[#080808] py-1.5"
    >
      <div className="ticker-track inline-block mono text-[11px]">
        {doubled.map((it, i) => (
          <span key={i} className="mx-6 inline-flex items-center gap-2">
            <span
              className="px-1.5 py-0.5 text-[9px] font-semibold tracking-wider"
              style={{ color: KIND_COLOR[it.kind] || "white", border: `1px solid ${KIND_COLOR[it.kind] || "#333"}` }}
            >
              {it.kind}
            </span>
            <span className="text-[var(--text-secondary)]">{it.text}</span>
            <span className="text-[var(--text-muted)]">·</span>
          </span>
        ))}
      </div>
    </div>
  );
};
