"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Mic,
  TrendingUp,
  TrendingDown,
  Minus,
  Calendar,
  Activity,
  Vibrate,
  Wind,
  Gauge,
  Music,
} from "lucide-react";
import Navbar from "../components/Navbar";
import HealthScoreRing from "../components/HealthScoreRing";
import BiomarkerCard from "../components/BiomarkerCard";
import TrendChart from "../components/TrendChart";
import AlertBanner from "../components/AlertBanner";
import Link from "next/link";

const STORAGE_KEY = "vocalhealth_recordings";

// Generate demo data for showcasing the dashboard
function generateDemoData() {
  const data = [];
  const now = new Date();
  for (let i = 29; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);

    const baseHealth = 72 + Math.sin(i * 0.3) * 8 + (Math.random() - 0.5) * 10;
    const tremor = 12 + Math.sin(i * 0.2) * 5 + (Math.random() - 0.5) * 8;
    const breathlessness = 18 + Math.cos(i * 0.25) * 6 + (Math.random() - 0.5) * 10;
    const pitchMean = 165 + Math.sin(i * 0.15) * 20 + (Math.random() - 0.5) * 15;
    const speechRate = 3.8 + Math.sin(i * 0.3) * 0.8 + (Math.random() - 0.5) * 0.5;

    data.push({
      biomarkers: {
        tremor_score: Math.max(0, Math.min(100, tremor)),
        breathlessness_score: Math.max(0, Math.min(100, breathlessness)),
        pitch_mean: pitchMean,
        pitch_variation: 15 + Math.random() * 10,
        speech_rate: Math.max(1, speechRate),
        pause_count: Math.floor(3 + Math.random() * 5),
        pause_duration_avg: 80 + Math.random() * 120,
        jitter: 0.5 + Math.random() * 1.5,
        shimmer: 1 + Math.random() * 3,
        hnr: 15 + Math.random() * 10,
        energy_mean: 0.05 + Math.random() * 0.1,
        spectral_centroid_mean: 1500 + Math.random() * 800,
      },
      health_score: {
        score: Math.max(20, Math.min(95, baseHealth)),
        category:
          baseHealth >= 80
            ? "Excellent"
            : baseHealth >= 65
            ? "Good"
            : baseHealth >= 45
            ? "Fair"
            : "Concerning",
        trend: i < 10 ? "improving" : i < 20 ? "stable" : "declining",
        confidence: 0.75 + Math.random() * 0.2,
      },
      alerts: [],
      timestamp: date.toISOString(),
    });
  }

  // Add some alerts to the most recent entries
  if (data.length > 0) {
    const last = data[data.length - 1];
    if (last.biomarkers.tremor_score > 15) {
      last.alerts.push({
        alert_type: "threshold",
        severity: "medium",
        message: `Elevated voice tremor detected (score: ${last.biomarkers.tremor_score.toFixed(1)}). Monitor closely.`,
        biomarker: "tremor",
      });
    }
  }

  return data;
}

export default function DashboardPage() {
  const [recordings, setRecordings] = useState([]);
  const [isDemo, setIsDemo] = useState(false);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      if (saved.length > 0) {
        setRecordings(saved);
      } else {
        setRecordings(generateDemoData());
        setIsDemo(true);
      }
    } catch {
      setRecordings(generateDemoData());
      setIsDemo(true);
    }
  }, []);

  const latest = recordings.length > 0 ? recordings[recordings.length - 1] : null;
  const totalRecordings = recordings.length;

  // Prepare chart data
  const chartData = recordings.map((r) => {
    const d = new Date(r.timestamp);
    return {
      date: `${d.getMonth() + 1}/${d.getDate()}`,
      healthScore: r.health_score?.score || 0,
      tremor: r.biomarkers?.tremor_score || 0,
      breathlessness: r.biomarkers?.breathlessness_score || 0,
      speechRate: r.biomarkers?.speech_rate || 0,
      pitch: r.biomarkers?.pitch_mean || 0,
    };
  });

  // Compute averages
  const avg = (key) => {
    if (recordings.length === 0) return 0;
    const sum = recordings.reduce((s, r) => s + (r.biomarkers?.[key] || 0), 0);
    return sum / recordings.length;
  };

  // Compute week-over-week change
  const weekChange = () => {
    if (recordings.length < 7) return null;
    const recentWeek = recordings.slice(-7);
    const priorWeek = recordings.slice(-14, -7);
    if (priorWeek.length === 0) return null;

    const recentAvg =
      recentWeek.reduce((s, r) => s + (r.health_score?.score || 0), 0) /
      recentWeek.length;
    const priorAvg =
      priorWeek.reduce((s, r) => s + (r.health_score?.score || 0), 0) /
      priorWeek.length;
    return recentAvg - priorAvg;
  };

  const change = weekChange();

  return (
    <>
      <Navbar />
      <main className="container page-wrapper">
        <motion.div
          className="page-header"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              flexWrap: "wrap",
              gap: "var(--space-md)",
            }}
          >
            <div>
              <h1>
                <LayoutDashboard
                  size={32}
                  style={{
                    color: "var(--primary-400)",
                    verticalAlign: "middle",
                    marginRight: "var(--space-sm)",
                  }}
                />
                Dashboard
              </h1>
              <p>
                Track your vocal biomarkers and health trends over time
              </p>
            </div>
            <Link href="/record" className="btn btn-primary" id="btn-new-recording-dash">
              <Mic size={18} />
              New Recording
            </Link>
          </div>
        </motion.div>

        {/* Demo notice */}
        {isDemo && (
          <div
            className="alert-banner low"
            style={{ marginBottom: "var(--space-xl)" }}
          >
            <div className="alert-content">
              <div className="alert-title">Demo Mode</div>
              <div className="alert-message">
                Showing simulated data for demonstration purposes. Record your
                first voice sample to see real results!
              </div>
            </div>
          </div>
        )}

        {/* Latest Alerts */}
        {latest?.alerts && latest.alerts.length > 0 && (
          <div style={{ marginBottom: "var(--space-xl)" }}>
            <AlertBanner alerts={latest.alerts} />
          </div>
        )}

        {/* Overview Stats */}
        <div className="grid-4" style={{ marginBottom: "var(--space-xl)" }}>
          <motion.div
            className="glass-card stat-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div
              className="stat-icon"
              style={{
                background: "rgba(6,182,212,0.15)",
                color: "var(--primary-400)",
              }}
            >
              <Calendar size={22} />
            </div>
            <div className="stat-value">{totalRecordings}</div>
            <div className="stat-label">Total Recordings</div>
          </motion.div>

          <motion.div
            className="glass-card stat-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div
              className="stat-icon"
              style={{
                background: "rgba(34,197,94,0.15)",
                color: "var(--success-400)",
              }}
            >
              <Activity size={22} />
            </div>
            <div className="stat-value">
              {latest?.health_score?.score?.toFixed(0) || "--"}
            </div>
            <div className="stat-label">Latest Health Score</div>
            {change !== null && (
              <div
                className={`stat-change ${
                  change > 0 ? "positive" : change < 0 ? "negative" : "neutral"
                }`}
              >
                {change > 0 ? (
                  <TrendingUp size={14} style={{ verticalAlign: "middle" }} />
                ) : change < 0 ? (
                  <TrendingDown size={14} style={{ verticalAlign: "middle" }} />
                ) : (
                  <Minus size={14} style={{ verticalAlign: "middle" }} />
                )}{" "}
                {Math.abs(change).toFixed(1)} pts this week
              </div>
            )}
          </motion.div>

          <motion.div
            className="glass-card stat-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div
              className="stat-icon"
              style={{
                background: "rgba(139,92,246,0.15)",
                color: "var(--accent-400)",
              }}
            >
              <Vibrate size={22} />
            </div>
            <div className="stat-value">{avg("tremor_score").toFixed(1)}</div>
            <div className="stat-label">Avg Tremor Score</div>
          </motion.div>

          <motion.div
            className="glass-card stat-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <div
              className="stat-icon"
              style={{
                background: "rgba(249,115,22,0.15)",
                color: "#fb923c",
              }}
            >
              <Wind size={22} />
            </div>
            <div className="stat-value">
              {avg("breathlessness_score").toFixed(1)}
            </div>
            <div className="stat-label">Avg Breathlessness</div>
          </motion.div>
        </div>

        {/* Health Score + Main Chart */}
        <div
          className="grid-2"
          style={{
            marginBottom: "var(--space-xl)",
            gridTemplateColumns: "300px 1fr",
          }}
        >
          {latest && (
            <HealthScoreRing
              score={latest.health_score.score}
              category={latest.health_score.category}
              trend={latest.health_score.trend}
              confidence={latest.health_score.confidence}
            />
          )}

          <TrendChart
            data={chartData}
            title="Health Score Trend"
            type="area"
            lines={[
              {
                key: "healthScore",
                label: "Health Score",
                color: "#06b6d4",
              },
            ]}
          />
        </div>

        {/* Biomarker Charts */}
        <div className="grid-2" style={{ marginBottom: "var(--space-xl)" }}>
          <TrendChart
            data={chartData}
            title="Tremor & Breathlessness"
            lines={[
              { key: "tremor", label: "Tremor", color: "#a78bfa" },
              {
                key: "breathlessness",
                label: "Breathlessness",
                color: "#f97316",
              },
            ]}
          />
          <TrendChart
            data={chartData}
            title="Speech Rate & Pitch"
            lines={[
              {
                key: "speechRate",
                label: "Speech Rate (syl/s)",
                color: "#22c55e",
              },
            ]}
          />
        </div>

        {/* Latest Biomarker Cards */}
        {latest && (
          <>
            <h3 style={{ marginBottom: "var(--space-lg)" }}>
              Latest Biomarker Breakdown
            </h3>
            <div className="grid-4">
              <BiomarkerCard
                title="Tremor"
                value={latest.biomarkers.tremor_score}
                unit="/ 100"
                score={latest.biomarkers.tremor_score}
                icon={Vibrate}
                inverse
                delay={0.1}
              />
              <BiomarkerCard
                title="Breathlessness"
                value={latest.biomarkers.breathlessness_score}
                unit="/ 100"
                score={latest.biomarkers.breathlessness_score}
                icon={Wind}
                inverse
                delay={0.2}
              />
              <BiomarkerCard
                title="Speech Rate"
                value={latest.biomarkers.speech_rate}
                unit="syl/s"
                icon={Gauge}
                delay={0.3}
              />
              <BiomarkerCard
                title="Pitch"
                value={latest.biomarkers.pitch_mean}
                unit="Hz"
                icon={Music}
                delay={0.4}
              />
            </div>
          </>
        )}
      </main>
    </>
  );
}
