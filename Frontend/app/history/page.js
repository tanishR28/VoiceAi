'use client';
import Link from 'next/link';

export default function HistoryPage() {
  return (
    <>
      {/* Sidebar Navigation */}
      <aside className="h-screen w-64 fixed left-0 top-0 border-r border-slate-100 dark:border-slate-800 bg-slate-50 flex flex-col p-4 gap-2 z-40 hidden md:flex">
        <div className="mb-8 px-2 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white shadow-lg">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>graphic_eq</span>
          </div>
          <div>
            <h1 className="text-blue-700 font-headline font-extrabold text-lg leading-tight">Vocalis AI</h1>
            <p className="text-xs font-label text-slate-500 uppercase tracking-widest">Clinical Grade</p>
          </div>
        </div>
        <nav className="flex-1 space-y-1">
          <Link href="/" className="flex items-center gap-3 px-4 py-3 text-slate-500 hover:bg-slate-100 hover:translate-x-1 transition-all rounded-xl font-medium">
            <span className="material-symbols-outlined">dashboard</span>
            <span>Dashboard</span>
          </Link>
          <Link href="/record" className="flex items-center gap-3 px-4 py-3 text-slate-500 hover:bg-slate-100 hover:translate-x-1 transition-all rounded-xl font-medium">
            <span className="material-symbols-outlined">mic</span>
            <span>Record</span>
          </Link>
          <Link href="/history" className="flex items-center gap-3 px-4 py-3 bg-white text-blue-700 rounded-xl shadow-sm border border-slate-100 font-semibold">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>history</span>
            <span>History</span>
          </Link>
          <Link href="/insights" className="flex items-center gap-3 px-4 py-3 text-slate-500 hover:bg-slate-100 hover:translate-x-1 transition-all rounded-xl font-medium">
            <span className="material-symbols-outlined">analytics</span>
            <span>Insights</span>
          </Link>
          <button className="w-full flex flex-row items-center gap-3 px-4 py-3 text-slate-500 hover:bg-slate-100 hover:translate-x-1 transition-all rounded-xl font-medium">
            <span className="material-symbols-outlined">settings</span>
            <span>Settings</span>
          </button>
        </nav>
        <Link href="/record">
          <button className="mt-4 mb-8 w-full py-3 px-4 bg-primary text-white rounded-xl font-semibold shadow-md hover:opacity-90 active:scale-95 transition-all flex items-center justify-center gap-2">
            <span className="material-symbols-outlined">add_circle</span>
            <span>New Recording</span>
          </button>
        </Link>
        <div className="mt-auto space-y-1 pt-4 border-t border-slate-200">
          <button className="w-full flex flex-row items-center gap-3 px-4 py-3 text-slate-500 hover:bg-slate-100 rounded-xl font-medium transition-colors">
            <span className="material-symbols-outlined">help</span>
            <span>Support</span>
          </button>
          <button className="w-full flex flex-row items-center gap-3 px-4 py-3 text-slate-500 hover:bg-slate-100 rounded-xl font-medium transition-colors">
            <span className="material-symbols-outlined">logout</span>
            <span>Log out</span>
          </button>
        </div>
      </aside>

      <main className="md:ml-64 min-h-screen p-8 mb-16 md:mb-0">
        <header className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-10">
          <div>
            <h2 className="text-3xl font-headline font-bold tracking-tight text-on-surface">Vocal Progress</h2>
            <p className="text-on-surface-variant font-label mt-1">Analyzing longitudinal speech biometrics for June 2024</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="bg-surface-container-low p-1 rounded-xl flex items-center">
              <button className="px-4 py-2 rounded-lg text-sm font-semibold transition-all text-slate-500 hover:text-primary">Weekly</button>
              <button className="px-4 py-2 rounded-lg bg-white shadow-sm text-sm font-bold text-primary transition-all">Monthly</button>
            </div>
            <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-white rounded-xl shadow-sm border border-slate-100">
              <span className="material-symbols-outlined text-slate-400">calendar_today</span>
              <span className="text-sm font-semibold">June 2024</span>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-12 gap-8 items-start">
          {/* Left: Main Interactive Graph */}
          <div className="col-span-12 lg:col-span-8 space-y-8">
            <section className="bg-surface-container-lowest rounded-xxl p-8 shadow-sm border border-white relative overflow-hidden">
              <div className="flex justify-between items-start mb-8">
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-6">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-primary"></span>
                      <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Pitch Stability</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-secondary"></span>
                      <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Tremor Level</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-tertiary"></span>
                      <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Speech Rate</span>
                    </div>
                  </div>
                </div>
                <button className="text-primary font-bold text-sm flex items-center gap-1">
                  <span className="hidden sm:inline">Export Data</span>
                  <span className="material-symbols-outlined text-lg">download</span>
                </button>
              </div>

              <div className="h-[400px] w-full relative">
                {/* Y-Axis Labels */}
                <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-[10px] font-bold text-slate-300 pointer-events-none">
                  <span>100%</span>
                  <span>80%</span>
                  <span>60%</span>
                  <span>40%</span>
                  <span>20%</span>
                  <span>0%</span>
                </div>
                
                {/* Grid Lines */}
                <div className="absolute inset-0 ml-10 flex flex-col justify-between py-1 pointer-events-none">
                  <div className="border-t border-slate-50 w-full"></div>
                  <div className="border-t border-slate-50 w-full"></div>
                  <div className="border-t border-slate-50 w-full"></div>
                  <div className="border-t border-slate-50 w-full"></div>
                  <div className="border-t border-slate-50 w-full"></div>
                </div>

                {/* Chart SVG */}
                <svg className="absolute inset-0 ml-10 h-full w-[calc(100%-40px)] overflow-visible" preserveAspectRatio="none">
                  {/* Pitch Stability (Blue) */}
                  <path d="M0 40 Q 100 60, 200 50 T 400 70 T 600 30 T 800 45" fill="none" stroke="#0056bb" strokeLinecap="round" strokeWidth="4"></path>
                  {/* Tremor Level (Teal) */}
                  <path d="M0 250 Q 150 220, 300 240 T 500 210 T 800 230" fill="none" stroke="#006c47" strokeDasharray="8 4" strokeLinecap="round" strokeWidth="4"></path>
                  {/* Speech Rate (Orange) */}
                  <path d="M0 120 Q 120 140, 250 110 T 550 130 T 800 105" fill="none" stroke="#934300" strokeLinecap="round" strokeWidth="4"></path>

                  {/* Milestone Markers */}
                  <g transform="translate(250, 110)">
                    <circle fill="#ffffff" r="8" stroke="#ba1a1a" strokeWidth="3"></circle>
                    <circle fill="#ba1a1a" r="3"></circle>
                  </g>
                  <g transform="translate(600, 30)">
                    <circle fill="#ffffff" r="8" stroke="#ba1a1a" strokeWidth="3"></circle>
                    <circle fill="#ba1a1a" r="3"></circle>
                  </g>
                </svg>

                {/* X-Axis Labels */}
                <div className="absolute bottom-[-32px] left-10 right-0 flex justify-between text-xs font-bold text-on-surface-variant">
                  <span>Week 1</span>
                  <span>Week 2</span>
                  <span>Week 3</span>
                  <span>Week 4</span>
                </div>
              </div>
            </section>

            {/* Detailed Timeline Feed */}
            <section className="space-y-4">
              <h3 className="text-xl font-headline font-bold px-1">Timeline Events</h3>
              <div className="space-y-4">
                <div className="group relative flex gap-6 items-start bg-white p-6 rounded-xxl shadow-sm border border-transparent hover:border-error/20 transition-all">
                  <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-error-container flex items-center justify-center">
                    <span className="material-symbols-outlined text-error" style={{ fontVariationSettings: "'FILL' 1" }}>warning</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-bold text-error uppercase tracking-widest">Anomaly Detected</span>
                      <span className="text-xs font-medium text-slate-400">June 18, 09:42 AM</span>
                    </div>
                    <h4 className="text-lg font-bold">Inconsistent Pitch Shift</h4>
                    <p className="text-on-surface-variant text-sm mt-1">Slight vocal fry detected during the morning "Aah" session. May indicate respiratory fatigue or morning vocal strain.</p>
                  </div>
                  <button className="opacity-0 group-hover:opacity-100 transition-opacity bg-surface-container-low p-2 rounded-lg">
                    <span className="material-symbols-outlined text-on-surface-variant">chevron_right</span>
                  </button>
                </div>

                <div className="group relative flex gap-6 items-start bg-surface-container-low p-6 rounded-xxl border border-transparent transition-all">
                  <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-secondary-container flex items-center justify-center">
                    <span className="material-symbols-outlined text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-bold text-secondary uppercase tracking-widest">Stable Session</span>
                      <span className="text-xs font-medium text-slate-400">June 17, 08:15 PM</span>
                    </div>
                    <h4 className="text-lg font-bold">Optimal Stability Achieved</h4>
                    <p className="text-on-surface-variant text-sm mt-1">All parameters within healthy 2-sigma range. Tremor levels are at an all-time low (0.4%).</p>
                  </div>
                </div>
              </div>
            </section>
          </div>

          {/* Right: Summary Sidebar */}
          <aside className="col-span-12 lg:col-span-4 space-y-6 lg:sticky lg:top-8">
            <div className="relative bg-surface-container-lowest p-8 rounded-xxl shadow-sm overflow-hidden text-center">
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-primary/10 blur-[60px] rounded-full"></div>
              <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-secondary/10 blur-[60px] rounded-full"></div>
              <h3 className="text-sm font-bold text-on-surface-variant uppercase tracking-widest mb-6">Overall Monthly Stability</h3>
              <div className="relative inline-flex items-center justify-center">
                <svg className="w-32 h-32 transform -rotate-90">
                  <circle className="text-surface-container-low" cx="64" cy="64" fill="transparent" r="60" stroke="currentColor" strokeWidth="8"></circle>
                  <circle className="text-primary" cx="64" cy="64" fill="transparent" r="60" stroke="currentColor" strokeDasharray="377" strokeDashoffset="23" strokeWidth="8"></circle>
                </svg>
                <span className="absolute text-3xl font-headline font-extrabold text-primary">94<span className="text-lg">%</span></span>
              </div>
              <p className="mt-6 text-sm font-medium text-on-surface-variant">Your vocal profile is <span className="text-secondary font-bold">Highly Stable</span> compared to last month.</p>
            </div>

            <div className="bg-surface-container-low p-6 rounded-xxl flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-on-surface-variant">Active Days</span>
                <span className="text-lg font-headline font-extrabold text-on-surface">28/30</span>
              </div>
              <div className="w-full bg-surface-container-highest h-3 rounded-full overflow-hidden">
                <div className="bg-primary h-full rounded-full" style={{ width: '93%' }}></div>
              </div>
              <p className="text-xs text-slate-500 italic">Consistent tracking improves diagnostic accuracy by 45%.</p>
            </div>

            <div className="bg-primary p-6 rounded-xxl text-white shadow-xl relative overflow-hidden">
              <div className="absolute top-[-20px] right-[-20px] opacity-10">
                <span className="material-symbols-outlined text-[120px]" style={{ fontVariationSettings: "'FILL' 1" }}>lightbulb</span>
              </div>
              <h3 className="text-lg font-headline font-bold mb-2">Weekly Insight</h3>
              <p className="text-blue-100 text-sm leading-relaxed mb-6">Your speech rate consistently drops by 12% between 8 PM and 10 PM. Consider earlier recording times for baseline comparisons.</p>
              <button className="w-full py-2 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-xl text-sm font-bold transition-all">View All Insights</button>
            </div>

            <div className="bg-white p-6 rounded-xxl shadow-sm border border-slate-50">
              <h4 className="text-sm font-bold text-on-surface-variant uppercase tracking-widest mb-4">Patient Comparison</h4>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-surface-container-low flex items-center justify-center">
                      <span className="material-symbols-outlined text-primary text-sm">person</span>
                    </div>
                    <span className="text-sm font-medium">Cohort Average</span>
                  </div>
                  <span className="text-sm font-bold">88%</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-surface-container-low flex items-center justify-center">
                      <span className="material-symbols-outlined text-primary text-sm">trending_up</span>
                    </div>
                    <span className="text-sm font-medium">Your Ranking</span>
                  </div>
                  <span className="text-sm font-bold text-secondary">Top 12%</span>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </main>

      {/* Floating Action Button (desktop) */}
      <div className="fixed bottom-8 right-8 flex flex-col gap-4 hidden md:flex">
        <button className="w-14 h-14 bg-white shadow-xl rounded-full flex items-center justify-center text-primary hover:scale-110 active:scale-95 transition-all">
          <span className="material-symbols-outlined">share</span>
        </button>
        <Link href="/record">
          <button className="w-16 h-16 bg-primary text-white shadow-xl shadow-primary/30 rounded-full flex items-center justify-center hover:scale-110 active:scale-95 transition-all">
            <span className="material-symbols-outlined text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>mic</span>
          </button>
        </Link>
      </div>

      {/* Mobile Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 glass-card border-t border-slate-100 flex justify-around items-center py-4 px-6 z-50 bg-white/80">
        <Link href="/" className="flex flex-col items-center gap-1 text-slate-500">
          <span className="material-symbols-outlined">dashboard</span>
          <span className="text-[10px] font-bold">Dashboard</span>
        </Link>
        <Link href="/record" className="flex flex-col items-center gap-1 text-slate-500">
          <span className="material-symbols-outlined">mic</span>
          <span className="text-[10px] font-bold">Record</span>
        </Link>
        <Link href="/history" className="flex flex-col items-center gap-1 text-blue-700">
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>history</span>
          <span className="text-[10px] font-bold">History</span>
        </Link>
        <Link href="/insights" className="flex flex-col items-center gap-1 text-slate-500">
          <span className="material-symbols-outlined">analytics</span>
          <span className="text-[10px] font-bold">Insights</span>
        </Link>
        <Link href="/" className="flex flex-col items-center gap-1 text-slate-500">
          <span className="material-symbols-outlined">settings</span>
          <span className="text-[10px] font-bold">Settings</span>
        </Link>
      </nav>
    </>
  );
}
