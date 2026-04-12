'use client';
import Link from 'next/link';
import { useState, useEffect, useMemo, useRef } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

function formatHistoryTimestamp(timestamp) {
  if (!timestamp) return 'Just now';
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return timestamp;
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function historyTone(score) {
  if (score >= 80) return { label: 'Stable', badge: 'bg-secondary/10 text-secondary', icon: 'check_circle' };
  if (score >= 60) return { label: 'Watch', badge: 'bg-blue-50 text-blue-700', icon: 'priority_high' };
  if (score >= 40) return { label: 'Monitor', badge: 'bg-orange-50 text-orange-600', icon: 'report' };
  return { label: 'Review', badge: 'bg-error-container text-error', icon: 'warning' };
}

function average(values) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function buildLinePath(scores, width = 700, height = 240) {
  if (!scores.length) return 'M0,180 L700,90';
  if (scores.length === 1) {
    const y = (height - (clamp(scores[0], 0, 100) / 100) * (height - 30)).toFixed(1);
    return `M0,${y} L700,${y}`;
  }

  const step = width / (scores.length - 1);
  return scores
    .map((score, index) => {
      const x = (index * step).toFixed(1);
      const y = (height - (clamp(score, 0, 100) / 100) * (height - 30)).toFixed(1);
      return `${index === 0 ? 'M' : 'L'}${x},${y}`;
    })
    .join(' ');
}

function buildAreaPath(linePath) {
  return `${linePath} L700,240 L0,240 Z`;
}

function toDayKey(timestamp) {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return null;
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function sameMonth(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

function buildCalendarCells(monthDate) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const firstWeekday = firstDay.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells = [];
  for (let i = 0; i < firstWeekday; i += 1) {
    cells.push(null);
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(new Date(year, month, day));
  }
  return cells;
}

function normalizeStructuredReport(report) {
  const rows = Array.isArray(report?.rows)
    ? report.rows
        .map((row) => ({
          day: Number(row.day),
          breathScore: Number(row.breath_score),
          pauseScore: Number(row.pause_score),
          speechRate: Number(row.speech_rate),
          healthScore: Number(row.health_score),
        }))
        .filter((row) => Number.isFinite(row.day))
        .sort((a, b) => a.day - b.day)
    : [];

  const firstScore = rows.length ? rows[0].healthScore : null;
  const lastScore = rows.length ? rows[rows.length - 1].healthScore : null;

  return {
    patientName: report?.patient_name || null,
    disease: report?.disease || null,
    rows,
    firstScore,
    lastScore,
    scoreDelta: firstScore !== null && lastScore !== null ? lastScore - firstScore : null,
    finalScore: report?.final_health_score ?? null,
    finalStatus: report?.final_health_status || null,
  };
}

export default function DashboardPage() {
  const [mounted, setMounted] = useState(false);
  const [analysisData, setAnalysisData] = useState(null);
  const [historyItems, setHistoryItems] = useState([]);
  const [trendRange, setTrendRange] = useState('month');
  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [selectedReportFile, setSelectedReportFile] = useState(null);
  const [selectedReportFileName, setSelectedReportFileName] = useState('');
  const [uploadedReportFileName, setUploadedReportFileName] = useState('');
  const [isReportUploading, setIsReportUploading] = useState(false);
  const [reportImportResult, setReportImportResult] = useState(null);
  const [reportError, setReportError] = useState('');
  const reportFileInputRef = useRef(null);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem('vocalis_latest_analysis');
    if (stored) {
      try {
        setAnalysisData(JSON.parse(stored));
      } catch (e) { console.error(e); }
    }
  }, []);

  async function handleReportUpload() {
    if (!selectedReportFile) {
      setReportError('Please choose a PDF or image file first.');
      reportFileInputRef.current?.click();
      return;
    }

    setIsReportUploading(true);
    setReportError('');
    setReportImportResult(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedReportFile);

      const response = await fetch(`${API_URL}/api/extract-medical-records`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const txt = await response.text();
        throw new Error(`Medical record extraction failed: ${txt}`);
      }

      const data = await response.json();
      setReportImportResult(data);
      setUploadedReportFileName(data?.filename || selectedReportFile?.name || 'Uploaded file');

      const historyResponse = await fetch(`${API_URL}/api/history?limit=60`);
      if (historyResponse.ok) {
        const historyData = await historyResponse.json();
        setHistoryItems(Array.isArray(historyData.items) ? historyData.items : []);
      }
    } catch (error) {
      setReportError(error?.message || 'Failed to import report.');
    } finally {
      setIsReportUploading(false);
    }
  }

  useEffect(() => {
    let active = true;

    async function loadHistory() {
      try {
        const response = await fetch(`${API_URL}/api/history?limit=60`);
        if (!response.ok) return;
        const data = await response.json();
        if (active) {
          setHistoryItems(Array.isArray(data.items) ? data.items : []);
        }
      } catch {
        if (active) {
          setHistoryItems([]);
        }
      }
    }

    loadHistory();
    return () => {
      active = false;
    };
  }, []);

  const latestHistory = historyItems[0] || null;
  const trendLimit = trendRange === 'week' ? 7 : 30;
  const trendItems = historyItems.slice(0, trendLimit).reverse();
  const trendScores = trendItems.map((item) => Number(item.health_score?.score || 0));
  const linePath = buildLinePath(trendScores);
  const areaPath = buildAreaPath(linePath);
  const latestScore = latestHistory ? Number(latestHistory.health_score?.score || 0) : null;
  const overallScore = latestScore ?? (analysisData ? Number(analysisData.health_score || 92) : 92);

  const latestBiomarkerRows = historyItems.slice(0, 20).map((item) => item.biomarkers || {});
  const breathValues = latestBiomarkerRows
    .map((row) => Number(row.breathlessness_score))
    .filter((value) => Number.isFinite(value));
  const speechValues = latestBiomarkerRows
    .map((row) => Number(row.speech_rate))
    .filter((value) => Number.isFinite(value));
  const tremorValues = latestBiomarkerRows
    .map((row) => Number(row.jitter ?? row.tremor_score))
    .filter((value) => Number.isFinite(value));

  const breathAvg = average(breathValues);
  const speechAvg = average(speechValues);
  const tremorAvg = average(tremorValues);
  const breathStability = clamp(Math.round(100 - breathAvg * 100), 0, 100);
  const speechConsistencyLabel = speechAvg >= 2.8 ? 'High' : speechAvg >= 1.8 ? 'Moderate' : 'Low';
  const tremorLabel = tremorAvg <= 0.2 ? 'Low' : tremorAvg <= 0.5 ? 'Moderate' : 'High';

  const calendarCounts = useMemo(() => {
    const counts = {};
    historyItems.forEach((item) => {
      const key = toDayKey(item.timestamp);
      if (!key) return;
      counts[key] = (counts[key] || 0) + 1;
    });
    return counts;
  }, [historyItems]);

  const calendarCells = useMemo(() => buildCalendarCells(calendarMonth), [calendarMonth]);
  const today = new Date();
  const monthSessionCount = useMemo(() => {
    return Object.entries(calendarCounts)
      .filter(([key]) => {
        const date = new Date(`${key}T00:00:00`);
        return !Number.isNaN(date.getTime()) && sameMonth(date, calendarMonth);
      })
      .reduce((sum, [, value]) => sum + value, 0);
  }, [calendarCounts, calendarMonth]);

  const trendDateLabels = useMemo(() => {
    if (!trendItems.length) return ['Start', 'Mid', 'Today'];
    const first = formatHistoryTimestamp(trendItems[0].timestamp).split(',')[0];
    const mid = formatHistoryTimestamp(trendItems[Math.floor((trendItems.length - 1) / 2)].timestamp).split(',')[0];
    const last = formatHistoryTimestamp(trendItems[trendItems.length - 1].timestamp).split(',')[0];
    return [first, mid, last];
  }, [trendItems]);

  const structuredReport = useMemo(() => {
    if (!reportImportResult?.report) return null;
    return normalizeStructuredReport(reportImportResult.report);
  }, [reportImportResult]);

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes drawLine {
          from { stroke-dashoffset: 1000; }
          to { stroke-dashoffset: 0; }
        }
        @keyframes fillIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes spinRing {
          from { stroke-dashoffset: 552.9; }
          to { stroke-dashoffset: 44; }
        }
        .anim-draw {
          stroke-dasharray: 1000;
          animation: drawLine 1.5s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }
        .anim-fill {
          animation: fillIn 1s ease-out 0.5s both;
        }
        .anim-ring {
          stroke-dasharray: 552.9;
          stroke-dashoffset: 552.9;
          animation: spinRing 1.2s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }
        .hover-lift {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .hover-lift:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01);
          border-color: #e5e7eb;
        }
      `}} />
      <aside className="h-screen w-64 fixed left-0 top-0 border-r border-slate-100 bg-slate-50 flex flex-col p-4 gap-2 z-40 hidden md:flex">
        <div className="flex items-center gap-3 px-2 py-6">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-md">
            <span className="material-symbols-outlined text-white" style={{ fontVariationSettings: "'FILL' 1" }}>voice_selection</span>
          </div>
          <div>
            <div className="text-blue-700 font-extrabold font-headline text-lg tracking-tight">Vocalis AI</div>
            <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Clinical Grade</div>
          </div>
        </div>
        <nav className="flex-1 space-y-1">
          <Link href="/" className="group flex items-center gap-3 px-4 py-3 bg-white text-blue-700 rounded-xl shadow-sm border border-gray-100 font-headline text-sm font-medium transition-all duration-300">
            <span className="material-symbols-outlined scale-110 transition-transform text-blue-600" style={{ fontVariationSettings: "'FILL' 1" }}>dashboard</span>
            <span>Dashboard</span>
          </Link>
          <Link href="/record" className="group flex items-center gap-3 px-4 py-3 text-slate-500 hover:bg-slate-100 hover:text-blue-600 rounded-xl font-headline text-sm font-medium transition-all duration-300">
            <span className="material-symbols-outlined group-hover:scale-110 transition-transform">mic</span>
            <span>Record</span>
          </Link>
          <Link href="/history" className="group flex items-center gap-3 px-4 py-3 text-slate-500 hover:bg-slate-100 hover:text-blue-600 rounded-xl font-headline text-sm font-medium transition-all duration-300">
            <span className="material-symbols-outlined group-hover:scale-110 transition-transform">history</span>
            <span>History</span>
          </Link>
          <Link href="/insights" className="group flex items-center gap-3 px-4 py-3 text-slate-500 hover:bg-slate-100 hover:text-blue-600 rounded-xl font-headline text-sm font-medium transition-all duration-300">
            <span className="material-symbols-outlined group-hover:scale-110 transition-transform">analytics</span>
            <span>Insights</span>
          </Link>
          <button className="group w-full flex flex-row items-center gap-3 px-4 py-3 text-slate-500 hover:bg-slate-100 hover:text-blue-600 rounded-xl font-headline text-sm font-medium transition-all duration-300">
            <span className="material-symbols-outlined group-hover:scale-110 transition-transform">settings</span>
            <span>Settings</span>
          </button>
        </nav>
        <div className="mt-auto space-y-1 pt-4 border-t border-slate-200/50">
          <Link href="/record">
            <button className="w-full flex items-center gap-3 px-4 py-3 mb-4 bg-gradient-to-r from-primary to-blue-500 text-white rounded-xl shadow-[0_4px_14px_0_rgba(0,86,187,0.25)] hover:shadow-[0_6px_20px_rgba(0,86,187,0.35)] hover:-translate-y-0.5 font-semibold text-sm transition-all duration-300 active:scale-95">
              <span className="material-symbols-outlined font-light">add</span>
              <span>New Recording</span>
            </button>
          </Link>
        </div>
      </aside>

      <main className="flex-1 md:ml-64 min-h-screen flex flex-col">
        <header className="bg-white/70 backdrop-blur-xl sticky top-0 z-50 flex justify-between items-center w-full px-6 py-4 border-b border-gray-100/50 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.02)]">
          <div className="flex items-center gap-4">
             <h1 className="text-xl font-bold bg-gradient-to-r from-blue-700 to-blue-500 bg-clip-text text-transparent font-headline tracking-tight">Vocalis Health</h1>
          </div>
          <div className="hidden lg:flex items-center gap-8 group">
            <Link href="/" className="relative text-blue-700 font-headline tracking-tight font-semibold py-1">
               Dashboard
               <span className="absolute bottom-0 left-0 w-full h-[2px] bg-blue-600 rounded-t-full"></span>
            </Link>
            <Link href="/history" className="relative text-slate-500 hover:text-blue-600 font-headline tracking-tight font-semibold py-1 transition-colors group/link">
               History
               <span className="absolute bottom-0 left-0 w-0 h-[2px] bg-blue-600 rounded-t-full transition-all duration-300 group-hover/link:w-full"></span>
            </Link>
            <Link href="/insights" className="relative text-slate-500 hover:text-blue-600 font-headline tracking-tight font-semibold py-1 transition-colors group/link">
               Insights
               <span className="absolute bottom-0 left-0 w-0 h-[2px] bg-blue-600 rounded-t-full transition-all duration-300 group-hover/link:w-full"></span>
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <button
                onClick={() => setShowCalendar((prev) => !prev)}
                className="p-2 text-slate-500 hover:text-primary transition-colors hover:bg-slate-50 rounded-full"
                aria-label="Open activity calendar"
              >
                <span className="material-symbols-outlined">calendar_month</span>
              </button>

              {showCalendar && (
                <div
                  className="absolute right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-xl p-4 z-50"
                  style={{ width: '340px', maxWidth: 'calc(100vw - 2rem)' }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <button
                      onClick={() => setCalendarMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))}
                      className="p-1 rounded-lg hover:bg-slate-100"
                      aria-label="Previous month"
                    >
                      <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                    </button>
                    <p className="text-sm font-bold text-slate-700">
                      {new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(calendarMonth)}
                    </p>
                    <button
                      onClick={() => setCalendarMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))}
                      className="p-1 rounded-lg hover:bg-slate-100"
                      aria-label="Next month"
                    >
                      <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                    </button>
                  </div>

                  <div
                    className="text-[11px] font-bold text-slate-400 mb-2"
                    style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))' }}
                  >
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                      <div key={day} className="text-center py-1">{day}</div>
                    ))}
                  </div>

                  <div
                    className="gap-1"
                    style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))' }}
                  >
                    {calendarCells.map((dateCell, index) => {
                      if (!dateCell) {
                        return <div key={`empty-${index}`} className="h-10"></div>;
                      }
                      const key = toDayKey(dateCell.toISOString());
                      const count = key ? (calendarCounts[key] || 0) : 0;
                      const isToday = dateCell.toDateString() === today.toDateString();
                      return (
                        <div
                          key={key || index}
                          className={`h-10 rounded-lg border flex flex-col items-center justify-center text-xs ${isToday ? 'bg-emerald-100 border-emerald-300 text-emerald-800 ring-2 ring-emerald-300/70' : count > 0 ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-slate-50 border-slate-100 text-slate-500'}`}
                        >
                          <span className="font-semibold leading-none">{dateCell.getDate()}</span>
                          {count > 0 ? <span className="text-[10px] font-extrabold text-emerald-700">{count}</span> : null}
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-3 text-xs text-slate-700 bg-emerald-50 rounded-lg px-3 py-2 border border-emerald-100">
                    Sessions this month: <span className="font-bold text-emerald-700">{monthSessionCount}</span>
                  </div>
                </div>
              )}
            </div>

            <button className="p-2 text-slate-500 hover:text-primary transition-colors hover:bg-slate-50 rounded-full">
              <span className="material-symbols-outlined">notifications</span>
            </button>
            <div className="ml-2 w-10 h-10 rounded-full border-2 border-primary-fixed overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-pointer">
              <img alt="Clinical Professional Profile" className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuC8qfaQUay-o15of8zqC7rI2E0u8vLHuiV1fCLVM4b4gXDDbyh_2-Hv1ghcN0iBWYL_6uFc5AF-972zayFUG_yvQjK_Kl3nTo-aOVajjDOCIxvOdZ-kj5WKTYHMNnXn5EtyOd0Z94WLVo0mDYzYR2_Tyx4JCTSbhIzWjCe4E_zRJIbziviGw8_a-n_a8tA0WctFhIgP3Y1cmuWGP8ghFW6RjpJrbi2KWhDSPXXdkeAuwmy-R1Mo5BVB7VDjwcY110_QWxzhKyMJ4wB_" />
            </div>
          </div>
        </header>

        <div className="p-6 md:p-10 max-w-7xl mx-auto w-full space-y-10">
          <section className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-2">
              <h2 className="text-4xl font-extrabold text-on-surface tracking-tight font-headline">Good Morning, Mr Tanish</h2>
              <p className="text-on-surface-variant text-[17px] font-medium opacity-90">Your vocal health profile is updated based on your last 7 assessments.</p>
            </div>
            
            <div className="flex flex-col items-center md:items-end gap-2">
              <Link href="/record">
                <button className="flex items-center justify-center gap-3 bg-gradient-to-r from-primary to-blue-600 text-white px-8 py-5 rounded-[18px] shadow-lg shadow-primary/30 hover:-translate-y-1 hover:shadow-[0_8px_25px_rgba(0,86,187,0.35)] hover:scale-[1.02] transition-all duration-300 ease-out group border border-blue-500/50">
                  <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner">
                    <span className="material-symbols-outlined text-white animate-[pulse_2s_ease-in-out_infinite]" style={{ fontVariationSettings: "'FILL' 1" }}>mic</span>
                  </div>
                  <span className="text-lg font-bold tracking-wide">Record Today's Voice</span>
                </button>
              </Link>
              <span className="text-[13px] font-semibold tracking-wide text-slate-400 mr-2">15-sec daily check</span>
            </div>
          </section>

          <section className="bg-white border border-slate-200 rounded-[18px] p-6 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-5">
              <div>
                <h3 className="text-xl font-extrabold text-slate-900 font-headline">Import Previous Medical Records</h3>
                <p className="text-sm text-slate-500 mt-1">Upload JPG, PNG, or PDF. Extracted rows are saved and included in trends and history.</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                <input
                  ref={reportFileInputRef}
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(event) => {
                    const file = event.target.files?.[0] || null;
                    setSelectedReportFile(file);
                    setSelectedReportFileName(file?.name || '');
                    setUploadedReportFileName('');
                    setReportError('');
                    setReportImportResult(null);
                  }}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => reportFileInputRef.current?.click()}
                  className={`rounded-xl border px-5 py-2.5 font-bold transition-colors max-w-full ${uploadedReportFileName ? 'border-emerald-300 bg-emerald-100 text-emerald-800' : selectedReportFileName ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'}`}
                >
                  {uploadedReportFileName ? (
                    <span className="block truncate">Uploaded</span>
                  ) : selectedReportFileName ? (
                    <span className="block truncate">Selected: {selectedReportFileName}</span>
                  ) : (
                    'Choose PDF/Image'
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => handleReportUpload()}
                  disabled={isReportUploading}
                  className={`rounded-xl px-5 py-2.5 text-white font-bold disabled:opacity-50 disabled:cursor-not-allowed ${uploadedReportFileName ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-primary'}`}
                >
                  {isReportUploading ? 'Importing...' : uploadedReportFileName ? 'Imported' : 'Import report'}
                </button>
              </div>
            </div>

            <div className="mt-2 text-xs text-slate-500">
              {selectedReportFileName ? `Selected file: ${selectedReportFileName}` : 'No file selected yet.'}
            </div>

            {uploadedReportFileName ? (
              <div className="mt-2 rounded-lg border border-emerald-200 bg-emerald-100 px-3 py-2 text-xs text-emerald-800">
                Uploaded
              </div>
            ) : null}

            {reportError ? (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{reportError}</div>
            ) : null}

            {reportImportResult ? (
              <div className="mt-5 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs uppercase tracking-widest text-slate-500 font-bold">Patient</p>
                    <p className="text-sm font-extrabold text-slate-800 mt-1">{structuredReport?.patientName || 'Not found'}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs uppercase tracking-widest text-slate-500 font-bold">Condition</p>
                    <p className="text-sm font-extrabold text-slate-800 mt-1">{structuredReport?.disease || 'Not found'}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs uppercase tracking-widest text-slate-500 font-bold">Rows Imported</p>
                    <p className="text-sm font-extrabold text-slate-800 mt-1">{reportImportResult.imported_rows ?? 0}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs uppercase tracking-widest text-slate-500 font-bold">Final Score</p>
                    <p className="text-sm font-extrabold text-slate-800 mt-1">
                      {structuredReport?.finalScore ?? 'N/A'}
                      {structuredReport?.finalStatus ? <span className="ml-1 text-xs text-slate-500">({structuredReport.finalStatus})</span> : null}
                    </p>
                  </div>
                </div>

                {reportImportResult.summary ? (
                  <div className="rounded-xl border border-blue-100 bg-blue-50 p-3 text-sm text-slate-700">
                    <span className="font-bold text-blue-800 mr-1">Summary:</span>{reportImportResult.summary}
                  </div>
                ) : null}

                {structuredReport?.rows?.length ? (
                  <div className="rounded-xl border border-slate-200 overflow-hidden">
                    <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 text-sm font-bold text-slate-700">
                      Extracted Rows From PDF ({structuredReport.rows.length})
                    </div>
                    <div className="max-h-[340px] overflow-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-100 sticky top-0 z-10">
                          <tr className="text-left text-slate-600">
                            <th className="px-4 py-3 font-bold">Day</th>
                            <th className="px-4 py-3 font-bold">Breath Score</th>
                            <th className="px-4 py-3 font-bold">Pause Score</th>
                            <th className="px-4 py-3 font-bold">Speech Rate</th>
                            <th className="px-4 py-3 font-bold">Health Score</th>
                          </tr>
                        </thead>
                        <tbody>
                          {structuredReport.rows.map((row) => (
                            <tr key={`pdf-row-${row.day}`} className="border-t border-slate-100">
                              <td className="px-4 py-2 font-semibold text-slate-700">Day {row.day}</td>
                              <td className="px-4 py-2 text-slate-700">{Number.isFinite(row.breathScore) ? row.breathScore : 'N/A'}</td>
                              <td className="px-4 py-2 text-slate-700">{Number.isFinite(row.pauseScore) ? row.pauseScore : 'N/A'}</td>
                              <td className="px-4 py-2 text-slate-700">{Number.isFinite(row.speechRate) ? row.speechRate : 'N/A'}</td>
                              <td className="px-4 py-2 font-bold text-slate-800">{Number.isFinite(row.healthScore) ? row.healthScore : 'N/A'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}
          </section>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-4 bg-surface-container-lowest border border-gray-100 rounded-[18px] p-6 lg:p-8 flex flex-col items-center text-center relative overflow-hidden hover-lift shadow-sm">
              <div className="flex flex-wrap justify-between items-start w-full gap-3 mb-6">
                 <div className="flex items-center gap-1.5 opacity-80 text-gray-500 pt-1">
                    <span className="material-symbols-outlined text-[14px]">psychology</span>
                    <span className="text-[10px] font-bold tracking-wider uppercase">AI Confidence: High</span>
                 </div>
                 <div className="flex flex-wrap items-center gap-2">
                   <span className="px-3 py-1 bg-secondary-fixed/30 text-secondary-container rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1 shadow-sm backdrop-blur-sm">
                  <span className="material-symbols-outlined text-[14px]">check_circle</span> {analysisData ? analysisData.status : 'Stable'}
                </span>
                   <div className="flex items-center gap-1 border border-primary/20 bg-primary/5 px-2.5 py-1 rounded-full text-[10px] font-bold text-primary uppercase tracking-wider shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
                      <span className="material-symbols-outlined text-[12px]" style={{ fontVariationSettings: "'FILL' 1" }}>verified_user</span> Verified
                   </div>
                 </div>
              </div>
              
              <div className="relative w-48 h-48 flex items-center justify-center group cursor-pointer transition-transform duration-500 hover:scale-[1.02]">
                <div className="absolute inset-0 rounded-full bg-primary/5 -m-6 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                <svg className="w-full h-full -rotate-90 relative z-10">
                  <circle className="text-surface-container-low" cx="96" cy="96" fill="transparent" r="88" stroke="currentColor" strokeWidth="8"></circle>
                  {mounted && <circle cx="96" cy="96" fill="transparent" r="88" stroke="url(#gradient)" strokeLinecap="round" strokeWidth="12" className="anim-ring"></circle>}
                  <defs>
                    <linearGradient id="gradient" x1="0%" x2="100%" y1="0%" y2="0%">
                      <stop offset="0%" stopColor="#0056bb"></stop>
                      <stop offset="100%" stopColor="#006c47"></stop>
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center z-20">
                  <span className="text-6xl font-extrabold font-headline text-primary leading-none tracking-tighter">
                    {Math.round(overallScore)}
                  </span>
                  <span className="text-slate-400 font-bold opacity-80 mt-1 uppercase text-xs tracking-widest">/ 100</span>
                </div>
              </div>
              
              <div className="mt-8 flex flex-col items-center gap-1">
                 <span className="flex items-center gap-1 text-secondary font-bold text-sm bg-secondary/10 px-3 py-1 rounded-full">
                    <span className="material-symbols-outlined text-[16px]">trending_up</span> Improving this week
                 </span>
                 <p className="mt-4 text-on-surface-variant font-medium text-sm leading-relaxed max-w-[250px]">
                   Your vocal stability is <span className="text-secondary font-bold">8% higher</span> than the clinical baseline.
                 </p>
              </div>
            </div>

            <div className="lg:col-span-8 bg-surface-container-lowest border border-gray-100 rounded-[18px] p-6 lg:p-8 flex flex-col hover-lift shadow-sm relative">
              <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-8 z-10 w-full">
                <div className="flex-1">
                  <h3 className="text-on-surface font-extrabold text-xl font-headline flex items-center gap-2">
                     Voice Stability Trends
                     <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                  </h3>
                  <p className="text-slate-500 font-medium text-sm mt-1">Historical data from the last {trendRange === 'week' ? 7 : 30} sessions</p>
                  <div className="mt-4 flex items-center p-3 rounded-xl bg-blue-50/70 border border-blue-100/50 w-fit">
                    <p className="text-xs font-semibold text-blue-800 leading-tight">
                      {trendScores.length >= 2 && trendScores[trendScores.length - 1] >= trendScores[0]
                        ? 'Your voice stability trend is improving in the selected range.'
                        : 'Your voice stability trend needs monitoring in the selected range.'}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 bg-slate-50 p-1 rounded-xl border border-gray-100 shrink-0">
                  <button
                    onClick={() => setTrendRange('month')}
                    className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${trendRange === 'month' ? 'bg-white text-primary shadow-sm' : 'text-slate-400 hover:text-slate-700'}`}
                  >
                    Month
                  </button>
                  <button
                    onClick={() => setTrendRange('week')}
                    className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${trendRange === 'week' ? 'bg-white text-primary shadow-sm' : 'text-slate-400 hover:text-slate-700'}`}
                  >
                    Week
                  </button>
                </div>
              </div>
              <div className="flex-1 min-h-[260px] relative z-0 mt-4 sm:mt-0">
                <div className="absolute inset-0 flex items-end justify-between px-2 opacity-50 transition-opacity hover:opacity-80">
                  {(trendScores.length ? trendScores.slice(-9) : [60, 65, 55, 75, 85, 80, 90, 85, 95]).map((score, index, arr) => {
                    const percent = clamp(score, 10, 100);
                    const isLatest = index === arr.length - 1;
                    return (
                      <div
                        key={`${score}-${index}`}
                        className={`w-[4%] rounded-t-lg transition-all ${isLatest ? 'bg-primary shadow-[0_0_15px_rgba(0,86,187,0.3)]' : 'bg-primary/20 hover:bg-primary/40'}`}
                        style={{ height: `${percent}%` }}
                      ></div>
                    );
                  })}
                </div>
                
                <svg className="absolute inset-0 w-full h-full overflow-visible" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="line-fill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0056bb" stopOpacity="0.25"/>
                      <stop offset="100%" stopColor="#0056bb" stopOpacity="0"/>
                    </linearGradient>
                  </defs>
                  {mounted && (
                    <>
                      <path className="w-full h-full anim-fill" d={areaPath} fill="url(#line-fill)" stroke="none"></path>
                      <path className="w-full h-full anim-draw" d={linePath} fill="none" stroke="#0056bb" strokeLinecap="round" strokeWidth="4"></path>
                    </>
                  )}
                  {/* Latest Data Point Group */}
                    <g className="group/tooltip cursor-pointer transform translate-x-[700px] translate-y-[90px]">
                    <circle cx="0" cy="0" fill="#0056bb" r="14" className="opacity-20 animate-ping"></circle>
                    <circle cx="0" cy="0" fill="#0056bb" r="6" className="group-hover/tooltip:r-8 transition-all duration-300 shadow-xl"></circle>
                    <circle cx="0" cy="0" fill="white" r="3"></circle>
                    
                    {/* SVG Tooltip */}
                    <g className="opacity-0 group-hover/tooltip:opacity-100 transition-opacity duration-300 pointer-events-none">
                       <rect x="-45" y="-55" width="90" height="42" rx="8" fill="#1e293b" opacity="0.95" />
                       <polygon points="-5,-13 5,-13 0,-8" fill="#1e293b" opacity="0.95"/>
                       <text x="0" y="-35" fill="white" fontSize="13" fontWeight="bold" fontFamily="Inter" textAnchor="middle">{Math.round(overallScore)} / 100</text>
                       <text x="0" y="-20" fill="#94a3b8" fontSize="10" fontFamily="Inter" fontWeight="500" textAnchor="middle">Latest Data</text>
                    </g>
                  </g>
                </svg>
              </div>
              <div className="flex justify-between mt-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest px-2">
                <span>{trendDateLabels[0]}</span>
                <span>{trendDateLabels[1]}</span>
                <span className="text-primary">{trendDateLabels[2]}</span>
              </div>
            </div>

            <div className="lg:col-span-12 grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-surface-container-lowest p-6 rounded-[18px] hover-lift shadow-sm border border-gray-200 flex flex-col gap-4 relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-tr from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="flex flex-wrap justify-between items-start relative z-10 gap-3">
                  <div className="w-12 h-12 rounded-[14px] bg-primary/10 flex items-center justify-center text-primary transition-transform group-hover:scale-110">
                    <span className="material-symbols-outlined font-light">air</span>
                  </div>
                  <span className="text-[11px] font-extrabold text-secondary flex items-center gap-0.5 bg-secondary/10 px-2 py-1 rounded-lg">
                    <span className="material-symbols-outlined text-[14px]">arrow_upward</span> 2.4%
                  </span>
                </div>
                <div className="relative z-10">
                  <p className="text-slate-500 text-sm font-semibold mb-1">Breath Stability</p>
                  <h4 className="text-3xl font-extrabold font-headline text-slate-900 tracking-tight">
                    {breathStability}%
                  </h4>
                </div>
                <div className="w-full bg-slate-100 h-[6px] rounded-full overflow-hidden mt-2 relative z-10">
                  <div className="bg-primary h-full rounded-full shadow-[0_0_8px_rgba(0,86,187,0.5)]" style={{ width: `${breathStability}%` }}></div>
                </div>
              </div>

              <div className="bg-surface-container-lowest p-6 rounded-[18px] hover-lift shadow-sm border border-gray-200 flex flex-col gap-4 relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-tr from-secondary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="flex flex-wrap justify-between items-start relative z-10 gap-3">
                  <div className="w-12 h-12 rounded-[14px] bg-secondary/10 flex items-center justify-center text-secondary transition-transform group-hover:scale-110">
                    <span className="material-symbols-outlined font-light">graphic_eq</span>
                  </div>
                  <span className="flex items-center gap-1 text-[11px] font-extrabold text-secondary bg-secondary/10 px-2 py-1 rounded-lg uppercase tracking-wider">
                     Optimal <span className="material-symbols-outlined text-[12px]">keyboard_double_arrow_down</span>
                  </span>
                </div>
                <div className="relative z-10">
                  <p className="text-slate-500 text-sm font-semibold mb-1">Voice Tremor</p>
                  <h4 className="text-3xl font-extrabold font-headline text-slate-900 tracking-tight">
                    {tremorLabel}
                  </h4>
                </div>
                <div className="flex gap-1.5 items-end h-[14px] mt-2 relative z-10">
                  <div className="flex-1 bg-secondary hover:bg-secondary-container h-[40%] rounded-full transition-colors"></div>
                  <div className="flex-1 bg-secondary hover:bg-secondary-container h-[30%] rounded-full transition-colors"></div>
                  <div className="flex-1 bg-secondary hover:bg-secondary-container h-[50%] rounded-full transition-colors"></div>
                  <div className="flex-1 bg-secondary hover:bg-secondary-container h-[20%] rounded-full transition-colors"></div>
                  <div className="flex-1 bg-slate-200 h-[80%] rounded-full"></div>
                  <div className="flex-1 bg-slate-200 h-[100%] rounded-full"></div>
                </div>
              </div>

              <div className="bg-surface-container-lowest p-6 rounded-[18px] hover-lift shadow-sm border border-gray-200 flex flex-col gap-4 relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="flex flex-wrap justify-between items-start relative z-10 gap-3">
                  <div className="w-12 h-12 rounded-[14px] bg-blue-100/50 flex items-center justify-center text-blue-600 transition-transform group-hover:scale-110">
                    <span className="material-symbols-outlined font-light">analytics</span>
                  </div>
                  <span className="px-2.5 py-1 bg-blue-50 border border-blue-100 text-blue-700 text-[10px] font-extrabold rounded-lg uppercase tracking-wider flex items-center gap-1">
                     <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse"></span>
                     High Grade
                  </span>
                </div>
                <div className="relative z-10">
                  <p className="text-slate-500 text-sm font-semibold mb-1">Speech Consistency</p>
                  <h4 className="text-3xl font-extrabold font-headline text-slate-900 tracking-tight">
                    {speechConsistencyLabel}
                  </h4>
                </div>
                <div className="flex items-center gap-3 mt-2 relative z-10">
                  <div className="flex -space-x-2">
                    <div className="w-6 h-6 rounded-full bg-blue-400 border-2 border-white shadow-sm ring-1 ring-black/5"></div>
                    <div className="w-6 h-6 rounded-full bg-blue-500 border-2 border-white shadow-sm ring-1 ring-black/5"></div>
                    <div className="w-6 h-6 rounded-full bg-blue-600 border-2 border-white shadow-sm ring-1 ring-black/5"></div>
                  </div>
                  <span className="text-xs font-semibold text-slate-400">Match 95% peers</span>
                </div>
              </div>
            </div>

            <div className="lg:col-span-12">
              <div className="bg-surface-container-lowest rounded-[18px] border border-gray-200 p-8 shadow-sm">
                <div className="flex justify-between items-center mb-8 border-b border-gray-100 pb-4">
                  <h3 className="font-headline font-extrabold text-xl text-slate-900">Assessment History</h3>
                  <button className="text-primary font-bold text-sm hover:text-blue-700 hover:bg-blue-50 px-4 py-2 rounded-xl transition-colors">View Clinical Report</button>
                </div>
                <div className="space-y-4">
                  {historyItems.length === 0 ? (
                    <div className="bg-white border border-gray-100 p-5 rounded-2xl text-slate-500">
                      No saved assessments yet. Record a sample to populate this section.
                    </div>
                  ) : (
                    historyItems.slice(0, 4).map((item) => {
                      const score = Number(item.health_score?.score || 0);
                      const tone = historyTone(score);
                      return (
                        <div key={item.id} className="bg-white border border-gray-100 p-5 rounded-2xl flex items-center justify-between group hover:shadow-md hover:border-gray-200 transition-all cursor-pointer hover:-translate-y-[1px]">
                          <div className="flex items-center gap-5">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform ${tone.badge}`}>
                              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>{tone.icon}</span>
                            </div>
                            <div>
                              <div className="font-bold text-slate-900 text-[15px] group-hover:text-primary transition-colors">{item.title || 'Voice Assessment'}</div>
                              <div className="text-sm font-medium text-slate-400 mt-0.5">{formatHistoryTimestamp(item.timestamp)}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-6">
                            <div className="text-right hidden sm:block">
                              <div className="text-[15px] font-bold text-slate-900">{score.toFixed(0)}<span className="text-slate-400 text-xs text-normal">/100</span></div>
                              <div className="text-[10px] text-secondary font-black uppercase tracking-widest mt-0.5">{item.health_score?.category || tone.label}</div>
                            </div>
                            <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-primary/5 transition-colors">
                               <span className="material-symbols-outlined text-gray-400 group-hover:text-primary transition-colors text-xl">chevron_right</span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex justify-center w-full pt-8 pb-4">
             <div className="flex items-center gap-2 opacity-50">
               <span className="material-symbols-outlined text-[14px]">lock</span>
               <span className="text-xs font-semibold tracking-wide uppercase">AI-assisted analysis • Non-invasive monitoring</span>
             </div>
          </div>
        </div>

        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-gray-200/50 px-6 py-4 flex justify-between items-center z-50 shadow-[0_-10px_20px_rgba(0,0,0,0.03)]">
          <Link href="/" className="flex flex-col items-center gap-1 text-primary relative">
            <span className="absolute -top-4 w-8 h-[3px] bg-primary rounded-b-full"></span>
            <span className="material-symbols-outlined scale-110" style={{ fontVariationSettings: "'FILL' 1" }}>dashboard</span>
            <span className="text-[10px] font-bold">Dash</span>
          </Link>
          <Link href="/record" className="flex flex-col items-center gap-1 text-slate-400 hover:text-slate-700 transition-colors">
            <span className="material-symbols-outlined">mic</span>
            <span className="text-[10px] font-bold">Record</span>
          </Link>
          <div className="relative -top-8 group">
            <Link href="/record">
              <button className="w-14 h-14 bg-gradient-to-tr from-primary to-blue-500 text-white rounded-full shadow-[0_8px_20px_rgba(0,86,187,0.3)] flex items-center justify-center transition-transform hover:scale-105 active:scale-95 border-4 border-white">
                <span className="material-symbols-outlined text-3xl font-light group-hover:animate-pulse">add</span>
              </button>
            </Link>
          </div>
          <Link href="/insights" className="flex flex-col items-center gap-1 text-slate-400 hover:text-slate-700 transition-colors">
            <span className="material-symbols-outlined">analytics</span>
            <span className="text-[10px] font-bold">Insights</span>
          </Link>
          <button className="flex flex-col items-center gap-1 text-slate-400 hover:text-slate-700 transition-colors">
            <span className="material-symbols-outlined">settings</span>
            <span className="text-[10px] font-bold">Settings</span>
          </button>
        </nav>
      </main>
    </>
  );
}
