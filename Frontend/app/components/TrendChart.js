"use client";

import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="custom-tooltip">
      <p className="label">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} className="value" style={{ color: entry.color }}>
          {entry.name}: {typeof entry.value === "number" ? entry.value.toFixed(1) : entry.value}
        </p>
      ))}
    </div>
  );
};

export default function TrendChart({
  data,
  lines = [],
  type = "line",
  height = 300,
  title,
  showLegend = true,
}) {
  if (!data || data.length === 0) {
    return (
      <div className="glass-card-static" style={{ height, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div className="empty-state" style={{ padding: "var(--space-lg)" }}>
          <p style={{ color: "var(--text-muted)" }}>No data available yet. Record your first voice sample!</p>
        </div>
      </div>
    );
  }

  const ChartComponent = type === "area" ? AreaChart : LineChart;
  const DataComponent = type === "area" ? Area : Line;

  return (
    <div className="glass-card-static" id={`chart-${title?.toLowerCase().replace(/\s+/g, "-") || "trend"}`}>
      {title && (
        <h4 style={{ marginBottom: "var(--space-lg)", fontSize: "1rem" }}>
          {title}
        </h4>
      )}
      <div className="chart-container" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <ChartComponent data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" />
            <XAxis
              dataKey="date"
              tick={{ fill: "#64748b", fontSize: 12 }}
              axisLine={{ stroke: "rgba(148,163,184,0.1)" }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: "#64748b", fontSize: 12 }}
              axisLine={{ stroke: "rgba(148,163,184,0.1)" }}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            {showLegend && (
              <Legend
                wrapperStyle={{ fontSize: "0.8rem", color: "#94a3b8" }}
              />
            )}
            {lines.map((line, i) => (
              <DataComponent
                key={line.key}
                type="monotone"
                dataKey={line.key}
                name={line.label || line.key}
                stroke={line.color || `hsl(${i * 60 + 180}, 70%, 60%)`}
                fill={
                  type === "area"
                    ? `${line.color || `hsl(${i * 60 + 180}, 70%, 60%)`}20`
                    : "none"
                }
                strokeWidth={2}
                dot={{ r: 3, fill: line.color || `hsl(${i * 60 + 180}, 70%, 60%)` }}
                activeDot={{ r: 5, stroke: "#fff", strokeWidth: 2 }}
              />
            ))}
          </ChartComponent>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
