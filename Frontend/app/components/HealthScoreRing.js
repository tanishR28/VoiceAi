"use client";

import { motion } from "framer-motion";

export default function HealthScoreRing({ score, category, trend, confidence }) {
  const circumference = 2 * Math.PI * 58;
  const dashOffset = circumference - (score / 100) * circumference;

  let color;
  if (score >= 80) color = "#22c55e";
  else if (score >= 65) color = "#06b6d4";
  else if (score >= 45) color = "#eab308";
  else if (score >= 25) color = "#f97316";
  else color = "#ef4444";

  const trendIcon =
    trend === "improving" ? "↑" : trend === "declining" ? "↓" : "→";
  const trendColor =
    trend === "improving"
      ? "var(--success-400)"
      : trend === "declining"
      ? "var(--danger-400)"
      : "var(--text-muted)";

  return (
    <motion.div
      className="glass-card"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6 }}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "var(--space-lg)",
        padding: "var(--space-2xl)",
      }}
      id="health-score-ring"
    >
      <h4 style={{ color: "var(--text-muted)", fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "0.1em" }}>
        Voice Health Score
      </h4>

      <div className="score-circle">
        <svg viewBox="0 0 140 140">
          <circle cx="70" cy="70" r="58" className="track" />
          <motion.circle
            cx="70"
            cy="70"
            r="58"
            className="progress"
            stroke={color}
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: dashOffset }}
            transition={{ duration: 1.5, ease: "easeOut" }}
          />
        </svg>
        <div className="value">
          <motion.div
            className="number"
            style={{ color }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            {Math.round(score)}
          </motion.div>
          <div className="label">out of 100</div>
        </div>
      </div>

      <div style={{ textAlign: "center" }}>
        <div
          style={{
            fontSize: "1.1rem",
            fontWeight: 700,
            color,
            marginBottom: "0.5rem",
          }}
        >
          {category}
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "var(--space-sm)",
          }}
        >
          <span style={{ fontSize: "1.2rem", color: trendColor }}>
            {trendIcon}
          </span>
          <span style={{ fontSize: "0.85rem", color: trendColor, fontWeight: 600 }}>
            {trend.charAt(0).toUpperCase() + trend.slice(1)}
          </span>
        </div>
        <div
          style={{
            fontSize: "0.75rem",
            color: "var(--text-muted)",
            marginTop: "0.5rem",
          }}
        >
          Confidence: {Math.round(confidence * 100)}%
        </div>
      </div>
    </motion.div>
  );
}
