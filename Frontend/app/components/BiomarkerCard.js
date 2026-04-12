"use client";

import { motion } from "framer-motion";

function getScoreColor(score, inverse = false) {
  const s = inverse ? 100 - score : score;
  if (s >= 80) return "var(--success-400)";
  if (s >= 60) return "var(--primary-400)";
  if (s >= 40) return "var(--warning-400)";
  return "var(--danger-400)";
}

function getGradient(score, inverse = false) {
  const s = inverse ? 100 - score : score;
  if (s >= 80) return "linear-gradient(135deg, rgba(34,197,94,0.15), rgba(34,197,94,0.05))";
  if (s >= 60) return "linear-gradient(135deg, rgba(6,182,212,0.15), rgba(6,182,212,0.05))";
  if (s >= 40) return "linear-gradient(135deg, rgba(234,179,8,0.15), rgba(234,179,8,0.05))";
  return "linear-gradient(135deg, rgba(239,68,68,0.15), rgba(239,68,68,0.05))";
}

export default function BiomarkerCard({
  title,
  value,
  unit,
  score,
  icon: Icon,
  description,
  inverse = false, // if true, lower score = better (e.g., tremor)
  delay = 0,
}) {
  const displayScore = typeof score === "number" ? score : null;
  const color = displayScore !== null ? getScoreColor(displayScore, inverse) : "var(--primary-400)";
  const bg = displayScore !== null ? getGradient(displayScore, inverse) : "var(--bg-glass)";

  const barWidth = displayScore !== null ? Math.min(100, displayScore) : 0;

  return (
    <motion.div
      className="glass-card"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      style={{ background: bg, position: "relative", overflow: "hidden" }}
      id={`biomarker-${title.toLowerCase().replace(/\s+/g, "-")}`}
    >
      {/* Decorative corner accent */}
      <div
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          width: 80,
          height: 80,
          background: `radial-gradient(circle at top right, ${color}15, transparent)`,
          pointerEvents: "none",
        }}
      />

      <div style={{ display: "flex", alignItems: "flex-start", gap: "var(--space-md)", marginBottom: "var(--space-md)" }}>
        {Icon && (
          <div
            className="stat-icon"
            style={{ background: `${color}20`, color }}
          >
            <Icon size={22} />
          </div>
        )}
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            {title}
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: "var(--space-xs)", marginTop: "0.25rem" }}>
            <span style={{ fontSize: "1.75rem", fontWeight: 800, color }}>
              {typeof value === "number" ? value.toFixed(1) : value}
            </span>
            {unit && (
              <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                {unit}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Progress bar */}
      {displayScore !== null && (
        <div style={{ marginBottom: "var(--space-sm)" }}>
          <div className="progress-bar-track">
            <motion.div
              className="progress-bar-fill"
              initial={{ width: 0 }}
              animate={{ width: `${barWidth}%` }}
              transition={{ duration: 1, delay: delay + 0.3, ease: "easeOut" }}
              style={{ background: color }}
            />
          </div>
        </div>
      )}

      {description && (
        <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", lineHeight: 1.5, margin: 0 }}>
          {description}
        </p>
      )}
    </motion.div>
  );
}
