import { useRef, useState } from "react";
import { IDS } from "@/constants/testIds";
import { Sparkles, Square } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const LlmAnalyzePanel = ({ dealId }) => {
  const [text, setText] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [done, setDone] = useState(false);
  const ctrlRef = useRef(null);

  const run = async () => {
    setText("");
    setDone(false);
    setStreaming(true);
    const ctrl = new AbortController();
    ctrlRef.current = ctrl;
    try {
      const res = await fetch(`${API}/regulatory/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "text/event-stream" },
        body: JSON.stringify({ deal_id: dealId }),
        signal: ctrl.signal,
      });
      if (!res.ok || !res.body) throw new Error("stream failed");
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      while (true) {
        const { value, done: rdone } = await reader.read();
        if (rdone) break;
        buf += dec.decode(value, { stream: true });
        const parts = buf.split("\n\n");
        buf = parts.pop() || "";
        for (const p of parts) {
          const line = p.trim();
          if (!line.startsWith("data:")) continue;
          try {
            const obj = JSON.parse(line.slice(5).trim());
            if (obj.delta) setText((t) => t + obj.delta);
            if (obj.done) setDone(true);
            if (obj.error) setText((t) => t + `\n\n[ERROR] ${obj.error}`);
          } catch (e) {}
        }
      }
    } catch (e) {
      if (e.name !== "AbortError") setText((t) => t + `\n[stream error: ${e.message}]`);
    } finally {
      setStreaming(false);
    }
  };

  const stop = () => { ctrlRef.current?.abort(); setStreaming(false); };

  // light markdown rendering
  const renderLine = (l, i) => {
    if (/^#{1,3}\s/.test(l)) {
      const lvl = l.match(/^#+/)[0].length;
      return <div key={i} className={`mono ${lvl === 1 ? "text-base" : "text-sm"} text-[var(--signal-cyan)] mt-2 font-semibold`}>{l.replace(/^#+\s/, "")}</div>;
    }
    if (/^[-*]\s/.test(l)) {
      return <div key={i} className="text-[12px] text-[var(--text-secondary)] pl-3">• {l.replace(/^[-*]\s/, "")}</div>;
    }
    if (/^\d+\.\s/.test(l)) {
      return <div key={i} className="text-[12px] text-[var(--text-secondary)] pl-3">{l}</div>;
    }
    return <div key={i} className="text-[12px] text-[var(--text-secondary)] my-1">{l}</div>;
  };

  return (
    <section className="terminal-panel" data-testid={IDS.regPanel + "-llm"}>
      <div className="panel-header">
        <span className="flex items-center gap-2">
          <Sparkles size={12} className="text-[var(--signal-cyan)]" />
          AI Regulatory Analysis (Claude Sonnet 4.5 · RAG)
        </span>
        <div className="flex gap-1">
          {streaming ? (
            <button onClick={stop} className="btn-term" data-testid="llm-stop-btn">
              <Square size={10} className="inline mr-1" /> STOP
            </button>
          ) : (
            <button onClick={run} className="btn-term active" data-testid={IDS.llmAnalyzeBtn}>
              RUN ANALYSIS
            </button>
          )}
        </div>
      </div>
      <div className="p-4" data-testid={IDS.llmOutput}>
        {!text && !streaming && (
          <div className="mono text-[11px] text-[var(--text-muted)]">
            ▶ Click <span className="text-[var(--signal-cyan)]">RUN ANALYSIS</span> to stream regulatory risk assessment with precedent citations.
          </div>
        )}
        {text && (
          <div className="space-y-0.5 max-h-[420px] overflow-y-auto pr-2">
            {text.split("\n").map(renderLine)}
            {streaming && <span className="cursor-blink"></span>}
          </div>
        )}
        {done && (
          <div className="mono text-[10px] text-[var(--signal-green)] mt-2">▣ ANALYSIS COMPLETE</div>
        )}
      </div>
    </section>
  );
};
