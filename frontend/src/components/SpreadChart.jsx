import { LineChart, Line, Area, AreaChart, XAxis, YAxis, ReferenceLine, Tooltip, ResponsiveContainer, ComposedChart, CartesianGrid } from "recharts";

export const SpreadChart = ({ history = [], forecast = [], offerPrice }) => {
  // merge
  const data = [
    ...history.map((h) => ({ date: h.date.slice(5), price: h.price, type: "hist" })),
    ...forecast.map((f) => ({
      date: f.date.slice(5),
      forecast: f.price,
      low: f.price_low,
      high: f.price_high,
      band: [f.price_low, f.price_high],
    })),
  ];

  return (
    <ResponsiveContainer width="100%" height={280}>
      <ComposedChart data={data} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id="bandG" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#00e5ff" stopOpacity={0.20} />
            <stop offset="100%" stopColor="#00e5ff" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="#1f1f1f" strokeDasharray="2 4" />
        <XAxis dataKey="date" stroke="#525252" tick={{ fontSize: 10, fontFamily: "JetBrains Mono" }} />
        <YAxis stroke="#525252" tick={{ fontSize: 10, fontFamily: "JetBrains Mono" }} domain={["auto", "auto"]} />
        <Tooltip
          contentStyle={{ background: "#0a0a0a", border: "1px solid #333", fontFamily: "JetBrains Mono", fontSize: 11 }}
          labelStyle={{ color: "#a3a3a3" }}
        />
        <ReferenceLine y={offerPrice} stroke="#00e676" strokeDasharray="4 4" label={{ value: `Offer $${offerPrice?.toFixed(2)}`, fill: "#00e676", fontSize: 10, position: "right" }} />
        <Area type="monotone" dataKey="band" stroke="none" fill="url(#bandG)" />
        <Line type="monotone" dataKey="price" stroke="#ffffff" strokeWidth={1.6} dot={false} name="Historical" />
        <Line type="monotone" dataKey="forecast" stroke="#00e5ff" strokeWidth={1.8} strokeDasharray="3 2" dot={false} name="Forecast" />
      </ComposedChart>
    </ResponsiveContainer>
  );
};
