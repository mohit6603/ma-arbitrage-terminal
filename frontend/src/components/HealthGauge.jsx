export const HealthGauge = ({ score = 0, label = "Deal Health Score" }) => {
  const clamped = Math.max(0, Math.min(100, score));
  const angle = (clamped / 100) * 180 - 90;
  const color = clamped > 60 ? "#00e676" : clamped > 35 ? "#ffb300" : "#ff3b30";
  const r = 80, cx = 100, cy = 100;
  // Build arc segments
  const arcStops = [
    { from: 0, to: 35, color: "#ff3b30" },
    { from: 35, to: 60, color: "#ffb300" },
    { from: 60, to: 100, color: "#00e676" },
  ];
  const polar = (pct) => {
    const a = (pct / 100) * Math.PI - Math.PI;
    return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
  };
  return (
    <div className="flex flex-col items-center justify-center">
      <svg width={200} height={120} viewBox="0 0 200 120">
        {arcStops.map((s, i) => {
          const p1 = polar(s.from);
          const p2 = polar(s.to);
          const large = s.to - s.from > 50 ? 1 : 0;
          return (
            <path
              key={i}
              d={`M ${p1.x} ${p1.y} A ${r} ${r} 0 ${large} 1 ${p2.x} ${p2.y}`}
              stroke={s.color}
              strokeWidth={10}
              fill="none"
              opacity={0.35}
            />
          );
        })}
        {/* Needle */}
        <line
          x1={cx} y1={cy}
          x2={cx + (r - 12) * Math.cos((angle * Math.PI) / 180)}
          y2={cy + (r - 12) * Math.sin((angle * Math.PI) / 180)}
          stroke={color}
          strokeWidth={3}
          strokeLinecap="round"
        />
        <circle cx={cx} cy={cy} r={5} fill={color} />
      </svg>
      <div className="mono text-3xl font-semibold" style={{ color }}>
        {clamped.toFixed(0)}
        <span className="text-sm text-[var(--text-muted)]"> / 100</span>
      </div>
      <div className="mono text-[10px] uppercase tracking-widest text-[var(--text-secondary)] mt-1">
        {label}
      </div>
    </div>
  );
};
