'use client';
import Link from 'next/link';

export default function InsightsPage() {
  return (
    <>
      {/* SideNavBar */}
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
          <Link href="/" className="flex items-center gap-3 px-4 py-3 text-slate-500 hover:bg-slate-100 transition-all active:scale-98 font-headline text-sm font-medium rounded-xl">
            <span className="material-symbols-outlined">dashboard</span>
            <span>Dashboard</span>
          </Link>
          <Link href="/record" className="flex items-center gap-3 px-4 py-3 text-slate-500 hover:bg-slate-100 transition-all active:scale-98 font-headline text-sm font-medium rounded-xl">
            <span className="material-symbols-outlined">mic</span>
            <span>Record</span>
          </Link>
          <Link href="/history" className="flex items-center gap-3 px-4 py-3 text-slate-500 hover:bg-slate-100 transition-all active:scale-98 font-headline text-sm font-medium rounded-xl">
            <span className="material-symbols-outlined">history</span>
            <span>History</span>
          </Link>
          <Link href="/insights" className="flex items-center gap-3 px-4 py-3 bg-white text-blue-700 rounded-xl shadow-sm transition-all active:scale-98 font-headline text-sm font-medium">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>analytics</span>
            <span>Insights</span>
          </Link>
          <button className="flex w-full flex-row items-center gap-3 px-4 py-3 text-slate-500 hover:bg-slate-100 transition-all active:scale-98 font-headline text-sm font-medium rounded-xl">
            <span className="material-symbols-outlined">settings</span>
            <span>Settings</span>
          </button>
        </nav>
        <div className="mt-auto border-t border-slate-200/50 pt-4 space-y-1">
          <Link href="/record">
            <button className="w-full mb-4 bg-primary text-white py-3 px-4 rounded-2xl font-headline font-semibold text-sm shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 hover:translate-y-[-1px] active:scale-95 transition-all">
              <span className="material-symbols-outlined text-sm">add</span>
              New Recording
            </button>
          </Link>
          <button className="w-full flex items-center gap-3 px-4 py-2 text-slate-500 hover:translate-x-1 transition-transform font-headline text-sm font-medium">
            <span className="material-symbols-outlined text-lg">help</span>
            <span>Support</span>
          </button>
          <button className="w-full flex items-center gap-3 px-4 py-2 text-slate-500 hover:translate-x-1 transition-transform font-headline text-sm font-medium">
            <span className="material-symbols-outlined text-lg">logout</span>
            <span>Log out</span>
          </button>
        </div>
      </aside>

      {/* Main Canvas */}
      <main className="md:ml-64 min-h-screen bg-surface mb-16 md:mb-0">
        <header className="sticky top-0 z-40 bg-white/70 backdrop-blur-xl flex justify-between items-center w-full px-8 py-4 shadow-sm">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold bg-gradient-to-r from-blue-700 to-blue-500 bg-clip-text text-transparent font-headline tracking-tight">Vocalis Health</h2>
            <div className="h-4 w-[1px] bg-slate-300 mx-2"></div>
            <div className="flex items-center gap-1 bg-secondary-container/30 px-3 py-1 rounded-full">
              <span className="material-symbols-outlined text-[14px] text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
              <span className="text-[11px] font-bold text-secondary uppercase tracking-wider hidden sm:inline">AI Verified Insights</span>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="hidden lg:flex gap-8">
              <Link href="/" className="text-slate-500 font-headline text-sm font-semibold hover:text-blue-500 transition-colors">Dashboard</Link>
              <Link href="/history" className="text-slate-500 font-headline text-sm font-semibold hover:text-blue-500 transition-colors">History</Link>
              <Link href="/insights" className="text-blue-700 border-b-2 border-blue-600 font-headline text-sm font-semibold">Insights</Link>
            </div>
            <div className="flex items-center gap-3">
              <button className="w-10 h-10 flex items-center justify-center text-slate-500 hover:bg-surface-container rounded-full transition-colors">
                <span className="material-symbols-outlined">notifications</span>
              </button>
              <div className="w-10 h-10 rounded-full bg-surface-container-high overflow-hidden border-2 border-white shadow-sm">
                <img alt="Clinical Professional Profile" className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuADtv5ym5VwJDZc_oCbj8U4PASif7N6DyM-FD7zO_vcFbzTE3WajQIGxE4IKu1b5muiyjWpScalhgau-nRylVFyS1r1OJtVGW9wP2z_YvVRORIwZR89oGVq-c8w41OZhU4juXhul8hGsO-EHTkrkzT8PUvgKCe4PlCtoavI-3xraKf55IsC9U81r36i0yLFEaHfinQYokAdyMwocmJJB88E6snfG3MjcX8HX0r95kCMUpodf4QOAzuPBG_8z4GLmM3Yj4pp0h4Wv3JL" />
              </div>
            </div>
          </div>
        </header>

        <div className="max-w-6xl mx-auto p-6 md:p-8 lg:p-12">
          {/* Header Section */}
          <div className="mb-12 flex flex-col md:flex-row md:justify-between md:items-end gap-6">
            <div className="max-w-2xl">
              <span className="text-primary font-bold text-sm tracking-widest uppercase mb-2 block">Voice Analysis Engine</span>
              <h1 className="text-4xl font-extrabold font-headline text-on-surface tracking-tight mb-4">Clinical Insights Feed</h1>
              <p className="text-on-surface-variant text-lg leading-relaxed">Continuous monitoring of vocal biomarkers to detect subtle physiological changes before they become symptomatic.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button className="bg-surface-container-lowest px-4 py-2.5 rounded-xl text-sm font-semibold text-on-surface-variant shadow-sm border border-outline-variant/10 flex items-center gap-2 hover:bg-white transition-all">
                <span className="material-symbols-outlined text-sm">filter_list</span>
                Filter
              </button>
              <button className="bg-primary text-white px-6 py-2.5 rounded-xl text-sm font-semibold shadow-lg shadow-primary/20 flex items-center gap-2 hover:translate-y-[-1px] transition-all">
                <span className="material-symbols-outlined text-sm">ios_share</span>
                Export Report
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            {/* Critical Alert Card */}
            <div className="md:col-span-8 bg-surface-container-lowest rounded-3xl p-6 sm:p-8 shadow-sm border-l-4 border-error/40 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-8 hidden sm:block">
                <div className="w-12 h-12 bg-error-container/30 rounded-2xl flex items-center justify-center text-error">
                  <span className="material-symbols-outlined text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>warning</span>
                </div>
              </div>
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-6">
                  <span className="px-3 py-1 rounded-full bg-error/10 text-error text-[10px] font-bold uppercase tracking-widest">Urgent Alert</span>
                  <span className="text-on-surface-variant text-xs font-medium">4 hours ago</span>
                </div>
                <h3 className="text-2xl font-bold font-headline mb-4 text-on-surface">Mild anomaly detected in voice tremor</h3>
                <p className="text-on-surface-variant text-lg leading-relaxed mb-8 max-w-xl">
                  Our neural network has identified a persistent micro-tremor in your vocal range. The trend suggests a <span className="font-bold text-error">12% increase</span> in variability over the past 48 hours compared to your personal baseline.
                </p>
                <div className="bg-surface-container-low rounded-2xl p-6 flex flex-col sm:flex-row items-center gap-6 border border-outline-variant/5">
                  <div className="flex-1 w-full flex-col">
                    <p className="text-sm font-medium text-on-surface-variant mb-1 uppercase tracking-tight">Clinical Suggestion</p>
                    <p className="text-on-surface text-sm">Consider consulting your doctor if trend continues. This data can be directly exported for clinical review.</p>
                  </div>
                  <div className="flex gap-3 w-full sm:w-auto mt-4 sm:mt-0 items-center justify-end">
                    <button className="flex-1 md:flex-none bg-white text-on-surface px-5 py-3 rounded-xl text-sm font-bold shadow-sm border border-outline-variant/20 hover:bg-slate-50 transition-all">Dismiss</button>
                    <button className="flex-1 md:flex-none bg-primary text-white px-5 py-3 rounded-xl text-sm font-bold shadow-md hover:bg-primary-container transition-all">Export</button>
                  </div>
                </div>
              </div>
            </div>

            {/* Snapshot Data Metric */}
            <div className="md:col-span-4 bg-primary text-white rounded-3xl p-8 relative overflow-hidden">
              <div className="absolute -bottom-10 -right-10 w-48 h-48 bg-white/10 rounded-full blur-3xl"></div>
              <span className="text-white/70 text-xs font-bold uppercase tracking-widest block mb-1">Stability Index</span>
              <div className="flex items-baseline gap-2 mb-8">
                <span className="text-6xl font-extrabold font-headline">88</span>
                <span className="text-xl font-medium text-white/80">/100</span>
              </div>
              <div className="space-y-4 relative z-10">
                <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                  <div className="h-full bg-white rounded-full shadow-[0_0_12px_rgba(255,255,255,0.5)]" style={{ width: '88%' }}></div>
                </div>
                <p className="text-sm text-white/80 leading-snug font-medium">Your stability index is slightly lower than your 7-day average (92). Correlation with current tremor alert detected.</p>
              </div>
            </div>

            {/* Success Card */}
            <div className="md:col-span-5 bg-surface-container-lowest rounded-3xl p-8 shadow-sm border-t border-secondary-container group">
              <div className="flex items-center justify-between mb-6">
                <div className="w-10 h-10 bg-secondary/10 rounded-xl flex items-center justify-center text-secondary">
                  <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                </div>
                <span className="text-on-surface-variant text-xs font-medium">2 days ago</span>
              </div>
              <h3 className="text-xl font-bold font-headline mb-3 text-on-surface">Baseline Restored</h3>
              <p className="text-on-surface-variant leading-relaxed">Breath stability has returned to baseline levels. Your recent samples show consistent respiratory-vocal coordination.</p>
            </div>

            {/* Secondary Insight */}
            <div className="md:col-span-7 bg-surface-container-low rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row gap-8 items-center border border-outline-variant/10">
              <div className="w-full md:w-48 h-32 rounded-2xl bg-white p-4 flex flex-col justify-between shadow-inner">
                <div className="flex items-end gap-1 h-12">
                  <div className="w-full bg-primary/20 rounded-t-sm h-[40%]"></div>
                  <div className="w-full bg-primary/20 rounded-t-sm h-[60%]"></div>
                  <div className="w-full bg-primary/20 rounded-t-sm h-[55%]"></div>
                  <div className="w-full bg-primary/40 rounded-t-sm h-[80%]"></div>
                  <div className="w-full bg-primary/30 rounded-t-sm h-[70%]"></div>
                  <div className="w-full bg-primary rounded-t-sm h-[100%] shadow-lg"></div>
                </div>
                <p className="text-[10px] text-center font-bold text-on-surface-variant">PEAK VOLUME VARIANCE</p>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-0.5 rounded bg-tertiary-fixed text-on-tertiary-fixed-variant text-[10px] font-bold uppercase tracking-widest">Tip</span>
                </div>
                <h4 className="text-lg font-bold font-headline mb-2">Afternoon Fatigue Detected</h4>
                <p className="text-sm text-on-surface-variant leading-relaxed italic">"Vocal clarity typically drops by 4% between 3 PM and 5 PM. Consider scheduling important recordings during morning hours for peak clinical accuracy."</p>
              </div>
            </div>

            {/* Knowledge Base Integration */}
            <div className="md:col-span-12 bg-white rounded-3xl p-1 shadow-sm mt-4 border border-outline-variant/5">
              <div className="flex flex-col lg:flex-row">
                <div className="lg:w-1/3 h-64 lg:h-auto relative overflow-hidden rounded-2xl m-2">
                  <img alt="Medical professional using tablet" className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCVWzRSvNUP4F0Cp29sfUD9KdRf821JFW2V3ijhAWsVPC_opTFt3rJS4RF323lTFDrAad1GjHJdpk-3hCUJljdgzRXz--vh__rD5dsft6CfqaNj76Dm6tce0NAUX2tj3KOiYznbpZFJv26WrbWb3_JZbjeuNYgnsMBAHG5xeTnTG-_7dM-NTF2Y4VVEL9KEAaMzKNH7K6drkspNMuV6mQf0jnDVOmzodDmq5wiCYt0d1lGXT-5C-fI-TALpaU1FdqYoRSSIJGpdKxq1" />
                  <div className="absolute inset-0 bg-gradient-to-t from-primary/60 to-transparent"></div>
                  <div className="absolute bottom-6 left-6 text-white">
                    <p className="text-xs font-bold uppercase tracking-widest mb-1 opacity-80">Resource</p>
                    <p className="text-xl font-bold font-headline">Understanding Biomarkers</p>
                  </div>
                </div>
                <div className="lg:w-2/3 p-6 sm:p-8 flex flex-col justify-center">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[14px]">school</span>
                      Clinician Reviewed
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold font-headline mb-4">The Science of Vocal Diagnostics</h3>
                  <p className="text-on-surface-variant leading-relaxed mb-6">Learn how subtle changes in pitch jitter and shimmer can provide early indicators for neurological and respiratory health monitoring. Our engine analyzes over 400 acoustic parameters per second.</p>
                  <button className="text-primary font-bold flex items-center gap-2 hover:translate-x-1 transition-transform">
                    Read Clinical Whitepaper
                    <span className="material-symbols-outlined text-sm">arrow_forward</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
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
          <Link href="/history" className="flex flex-col items-center gap-1 text-slate-500">
            <span className="material-symbols-outlined">history</span>
            <span className="text-[10px] font-bold">History</span>
          </Link>
          <Link href="/insights" className="flex flex-col items-center gap-1 text-blue-700">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>analytics</span>
            <span className="text-[10px] font-bold">Insights</span>
          </Link>
          <Link href="/" className="flex flex-col items-center gap-1 text-slate-500">
            <span className="material-symbols-outlined">settings</span>
            <span className="text-[10px] font-bold">Settings</span>
          </Link>
        </nav>
      </main>
    </>
  );
}
