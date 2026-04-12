import Link from 'next/link';
import { LayoutDashboard, Mic, History, BarChart2, Settings, Plus, HelpCircle, LogOut } from 'lucide-react';

export default function Sidebar() {
  return (
    <div className="w-64 bg-white border-r border-gray-100 h-screen flex flex-col justify-between py-6 sticky top-0">
      <div>
        {/* Logo */}
        <div className="px-8 pb-8 flex flex-col items-start">
          <div className="flex items-center gap-3">
            <div className="bg-primary text-white p-2 text-xl font-bold rounded-lg shadow-sm">
              <Mic size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900 leading-tight">Vocalis AI</h1>
              <p className="text-[10px] uppercase font-semibold text-gray-400 tracking-wider">Clinical Grade</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex flex-col gap-2 px-4 mt-4">
          <NavItem href="/" icon={<LayoutDashboard size={20} />} label="Dashboard" active />
          <NavItem href="/record" icon={<Mic size={20} />} label="Record" />
          <NavItem href="/history" icon={<History size={20} />} label="History" />
          <NavItem href="/insights" icon={<BarChart2 size={20} />} label="Insights" />
          <NavItem href="/settings" icon={<Settings size={20} />} label="Settings" />
        </nav>
      </div>

      {/* Bottom Actions */}
      <div className="px-4">
        <Link href="/record">
          <button className="w-full bg-primary hover:bg-primaryHover text-white py-3 rounded-xl font-medium flex items-center justify-center gap-2 shadow-sm transition-colors mb-6 text-sm">
            <Plus size={18} /> New Recording
          </button>
        </Link>
        <div className="flex flex-col gap-2">
           <ActionButton icon={<HelpCircle size={18} />} label="Support" />
           <ActionButton icon={<LogOut size={18} />} label="Log out" />
        </div>
      </div>
    </div>
  );
}

function NavItem({ href, icon, label, active }) {
  return (
    <Link href={href} className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors text-sm ${active ? 'bg-[#f0f4fd] text-primary' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'}`}>
      {icon}
      <span>{label}</span>
      {active && <div className="absolute left-0 w-1 h-8 bg-primary rounded-r-md"></div>}
    </Link>
  );
}

function ActionButton({ icon, label }) {
  return (
    <button className="flex items-center gap-3 px-4 py-3 text-gray-500 hover:text-gray-900 font-medium text-sm transition-colors w-full text-left">
      {icon}
      <span>{label}</span>
    </button>
  );
}
