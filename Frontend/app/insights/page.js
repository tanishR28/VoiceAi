'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  AreaChart,
  Area,
  BarChart,
  Bar,
  Legend,
  PieChart,
  Pie,
  Cell,
  ScatterChart,
  Scatter,
} from 'recharts';

const HARD_CODED_DATA = [
  { sample: 'S1', pitch_mean: 217.52, pitch_std: 13.106, jitter: 0.00175, shimmer: 0.0512, hnr: 7.723, speech_rate: 3.288, pause_count: 2, avg_pause: 0.2374, status: 'mild_concern' },
  { sample: 'S2', pitch_mean: 190.73, pitch_std: 14.171, jitter: 0.00226, shimmer: 0.06787, hnr: 10.191, speech_rate: 4.123, pause_count: 4, avg_pause: 0.3629, status: 'mild_concern' },
  { sample: 'S3', pitch_mean: 159.23, pitch_std: 29.045, jitter: 0.0001, shimmer: 0.04926, hnr: 8.393, speech_rate: 4.302, pause_count: 3, avg_pause: 0.2718, status: 'mild_concern' },
  { sample: 'S4', pitch_mean: 168.14, pitch_std: 18.704, jitter: 0.00293, shimmer: 0.05969, hnr: 9.77, speech_rate: 3.645, pause_count: 3, avg_pause: 0.3425, status: 'mild_concern' },
  { sample: 'S5', pitch_mean: 188.42, pitch_std: 17.206, jitter: 0.00284, shimmer: 0.03584, hnr: 13.399, speech_rate: 4.501, pause_count: 3, avg_pause: 0.2219, status: 'mild_concern' },
  { sample: 'S6', pitch_mean: 188.49, pitch_std: 18.358, jitter: 0.00136, shimmer: 0.02891, hnr: 11.497, speech_rate: 3.327, pause_count: 3, avg_pause: 0.1758, status: 'mild_concern' },
  { sample: 'S7', pitch_mean: 214.58, pitch_std: 17.051, jitter: 0.00178, shimmer: 0.0501, hnr: 18.216, speech_rate: 4.452, pause_count: 2, avg_pause: 0.3237, status: 'mild_concern' },
  { sample: 'S8', pitch_mean: 190.8, pitch_std: 9.217, jitter: 0.00204, shimmer: 0.05615, hnr: 12.701, speech_rate: 3.374, pause_count: 3, avg_pause: 0.2992, status: 'mild_concern' },
  { sample: 'S9', pitch_mean: 194.46, pitch_std: 16.269, jitter: 0.00177, shimmer: 0.04274, hnr: 11.032, speech_rate: 3.96, pause_count: 3, avg_pause: 0.3219, status: 'mild_concern' },
  { sample: 'S10', pitch_mean: 190.71, pitch_std: 17.434, jitter: 0.00192, shimmer: 0.05481, hnr: 5.937, speech_rate: 3.373, pause_count: 2, avg_pause: 0.3257, status: 'mild_concern' },
  { sample: 'S11', pitch_mean: 172.91, pitch_std: 20.74, jitter: 0.00166, shimmer: 0.07039, hnr: 10.363, speech_rate: 3.938, pause_count: 2, avg_pause: 0.2854, status: 'mild_concern' },
  { sample: 'S12', pitch_mean: 159.09, pitch_std: 17.495, jitter: 0.0026, shimmer: 0.04175, hnr: 12.182, speech_rate: 3.299, pause_count: 2, avg_pause: 0.2448, status: 'mild_concern' },
];

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function avg(values) {
  if (!values.length) return 0;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

export default function InsightsPage() {
  const chartData = useMemo(() => {
    return HARD_CODED_DATA.map((row, index, arr) => {
      const risk =
        row.jitter * 15000 +
        row.shimmer * 300 +
        row.pitch_std * 1.2 +
        Math.abs(row.speech_rate - 3.8) * 8 +
        row.pause_count * 3 -
        row.hnr * 0.8;

      const healthScore = clamp(100 - risk, 35, 95);
      const start = Math.max(0, index - 2);
      const movingWindow = arr.slice(start, index + 1).map((item) => {
        const localRisk =
          item.jitter * 15000 +
          item.shimmer * 300 +
          item.pitch_std * 1.2 +
          Math.abs(item.speech_rate - 3.8) * 8 +
          item.pause_count * 3 -
          item.hnr * 0.8;
        return clamp(100 - localRisk, 35, 95);
      });

      return {
        ...row,
        health_score: Number(healthScore.toFixed(2)),
        health_score_avg3: Number(avg(movingWindow).toFixed(2)),
      };
    });
  }, []);

  const biomarkerAverages = useMemo(() => {
    return [
      { metric: 'Pitch Mean', avg: Number(avg(chartData.map((d) => d.pitch_mean)).toFixed(2)) },
      { metric: 'Pitch Std', avg: Number(avg(chartData.map((d) => d.pitch_std)).toFixed(2)) },
      { metric: 'Jitter', avg: Number(avg(chartData.map((d) => d.jitter)).toFixed(5)) },
      { metric: 'Shimmer', avg: Number(avg(chartData.map((d) => d.shimmer)).toFixed(5)) },
      { metric: 'HNR', avg: Number(avg(chartData.map((d) => d.hnr)).toFixed(2)) },
      { metric: 'Speech', avg: Number(avg(chartData.map((d) => d.speech_rate)).toFixed(2)) },
      { metric: 'Pause Cnt', avg: Number(avg(chartData.map((d) => d.pause_count)).toFixed(2)) },
      { metric: 'Avg Pause', avg: Number(avg(chartData.map((d) => d.avg_pause)).toFixed(3)) },
    ];
  }, [chartData]);

  const statusPieData = useMemo(() => {
    let low = 0;
    let medium = 0;
    let high = 0;

    chartData.forEach((row) => {
      if (row.health_score >= 75) low += 1;
      else if (row.health_score >= 60) medium += 1;
      else high += 1;
    });

    return [
      { name: 'Low Risk', value: low, color: '#10b981' },
      { name: 'Medium Risk', value: medium, color: '#f59e0b' },
      { name: 'High Risk', value: high, color: '#ef4444' },
    ];
  }, [chartData]);

  const summary = useMemo(() => {
    return {
      samples: chartData.length,
      avgScore: Number(avg(chartData.map((d) => d.health_score)).toFixed(1)),
      avgJitter: Number(avg(chartData.map((d) => d.jitter)).toFixed(5)),
      avgShimmer: Number(avg(chartData.map((d) => d.shimmer)).toFixed(5)),
    };
  }, [chartData]);

  return (
    <>
      <aside className="h-screen w-64 fixed left-0 top-0 border-r border-slate-100 bg-slate-50 flex flex-col p-4 gap-2 z-50 hidden md:flex">
        <div className="px-2 py-6 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-white" style={{ fontVariationSettings: "'FILL' 1" }}>graphic_eq</span>
            </div>
            <div>
              <h1 className="text-blue-700 font-extrabold font-headline leading-tight">Vocalis AI</h1>
              <p className="text-[10px] font-bold tracking-widest text-slate-500 uppercase">Clinical Grade</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 space-y-1">
          <Link href="/" className="flex items-center gap-3 px-4 py-3 text-slate-500 hover:bg-slate-100 rounded-xl font-medium">
            <span className="material-symbols-outlined">dashboard</span>
            <span>Dashboard</span>
          </Link>
          <Link href="/record" className="flex items-center gap-3 px-4 py-3 text-slate-500 hover:bg-slate-100 rounded-xl font-medium">
            <span className="material-symbols-outlined">mic</span>
            <span>Record</span>
          </Link>
          <Link href="/history" className="flex items-center gap-3 px-4 py-3 text-slate-500 hover:bg-slate-100 rounded-xl font-medium">
            <span className="material-symbols-outlined">history</span>
            <span>History</span>
          </Link>
          <Link href="/insights" className="flex items-center gap-3 px-4 py-3 bg-white text-blue-700 rounded-xl shadow-sm font-semibold">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>analytics</span>
            <span>Insights</span>
          </Link>
        </nav>
      </aside>

      <main className="flex-1 w-full md:ml-64 min-h-screen p-6 md:p-8 space-y-6">
        <header>
          <h2 className="text-3xl font-bold text-slate-900">Clinical Insights Feed</h2>
          <p className="text-slate-600 mt-1">Clinical feature-set analysis using MFCC and biomarker patterns.</p>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-4">
            <p className="text-xs uppercase tracking-widest text-slate-500 font-bold">Samples</p>
            <p className="text-3xl font-extrabold text-slate-900 mt-1">{summary.samples}</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-4">
            <p className="text-xs uppercase tracking-widest text-slate-500 font-bold">Avg Health Score</p>
            <p className="text-3xl font-extrabold text-slate-900 mt-1">{summary.avgScore}</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-4">
            <p className="text-xs uppercase tracking-widest text-slate-500 font-bold">Avg Jitter</p>
            <p className="text-3xl font-extrabold text-slate-900 mt-1">{summary.avgJitter}</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-4">
            <p className="text-xs uppercase tracking-widest text-slate-500 font-bold">Avg Shimmer</p>
            <p className="text-3xl font-extrabold text-slate-900 mt-1">{summary.avgShimmer}</p>
          </div>
        </section>

        <section className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          <div className="xl:col-span-8 bg-white rounded-2xl border border-slate-200 p-5">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Health Score Trend (Raw vs Avg-3)</h3>
            <div style={{ height: 320 }}>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="sample" tick={{ fontSize: 12, fill: '#64748b' }} />
                  <YAxis domain={[30, 100]} tick={{ fontSize: 12, fill: '#64748b' }} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="health_score" stroke="#2563eb" strokeWidth={3} dot={false} name="Health Score" />
                  <Line type="monotone" dataKey="health_score_avg3" stroke="#16a34a" strokeWidth={3} dot={false} name="Avg-3" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="xl:col-span-4 bg-white rounded-2xl border border-slate-200 p-5">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Risk Distribution</h3>
            <div style={{ height: 320 }}>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={statusPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                    {statusPieData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="xl:col-span-6 bg-white rounded-2xl border border-slate-200 p-5">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Pitch Profile</h3>
            <div style={{ height: 320 }}>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="sample" tick={{ fontSize: 12, fill: '#64748b' }} />
                  <YAxis tick={{ fontSize: 12, fill: '#64748b' }} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="pitch_mean" stroke="#0ea5e9" strokeWidth={3} dot={false} name="Pitch Mean" />
                  <Line type="monotone" dataKey="pitch_std" stroke="#f97316" strokeWidth={3} dot={false} name="Pitch Std" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="xl:col-span-6 bg-white rounded-2xl border border-slate-200 p-5">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Jitter and Shimmer</h3>
            <div style={{ height: 320 }}>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="sample" tick={{ fontSize: 12, fill: '#64748b' }} />
                  <YAxis tick={{ fontSize: 12, fill: '#64748b' }} />
                  <Tooltip />
                  <Legend />
                  <Area type="monotone" dataKey="jitter" stroke="#ef4444" fill="#fecaca" name="Jitter" />
                  <Area type="monotone" dataKey="shimmer" stroke="#a855f7" fill="#e9d5ff" name="Shimmer" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="xl:col-span-7 bg-white rounded-2xl border border-slate-200 p-5">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Speech and Pause Dynamics</h3>
            <div style={{ height: 320 }}>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="sample" tick={{ fontSize: 12, fill: '#64748b' }} />
                  <YAxis tick={{ fontSize: 12, fill: '#64748b' }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="speech_rate" fill="#22c55e" name="Speech Rate" radius={[5, 5, 0, 0]} />
                  <Bar dataKey="pause_count" fill="#f59e0b" name="Pause Count" radius={[5, 5, 0, 0]} />
                  <Bar dataKey="avg_pause" fill="#64748b" name="Avg Pause" radius={[5, 5, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="xl:col-span-5 bg-white rounded-2xl border border-slate-200 p-5">
            <h3 className="text-lg font-bold text-slate-900 mb-4">HNR vs Health Score</h3>
            <div style={{ height: 320 }}>
              <ResponsiveContainer width="100%" height={300}>
                <ScatterChart margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis type="number" dataKey="hnr" name="HNR" tick={{ fontSize: 12, fill: '#64748b' }} />
                  <YAxis type="number" dataKey="health_score" name="Health Score" tick={{ fontSize: 12, fill: '#64748b' }} />
                  <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                  <Scatter data={chartData} fill="#2563eb" />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="xl:col-span-12 bg-white rounded-2xl border border-slate-200 p-5">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Biomarker Averages</h3>
            <div style={{ height: 320 }}>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={biomarkerAverages} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="metric" tick={{ fontSize: 12, fill: '#64748b' }} />
                  <YAxis tick={{ fontSize: 12, fill: '#64748b' }} />
                  <Tooltip />
                  <Bar dataKey="avg" fill="#0ea5e9" name="Average Value" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
