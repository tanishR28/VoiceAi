import Link from 'next/link';
import { Bell, Settings, User } from 'lucide-react';

export default function TopNav() {
  return (
    <header className="flex items-center justify-between py-6 px-10 border-b border-gray-100 bg-white/50 backdrop-blur-md sticky top-0 z-10 hidden md:flex">
      {/* Brand inside Content Area */}
      <div className="text-xl font-semibold text-primary">
        Vocalis Health
      </div>

      {/* Center Nav */}
      <nav className="flex items-center gap-8 text-sm font-medium">
        <Link href="/" className="text-primary border-b-2 border-primary pb-1">Dashboard</Link>
        <Link href="/history" className="text-gray-500 hover:text-gray-900 pb-1">History</Link>
        <Link href="/insights" className="text-gray-500 hover:text-gray-900 pb-1">Insights</Link>
      </nav>

      {/* Right Icons */}
      <div className="flex items-center gap-4 text-gray-500">
        <button className="hover:text-gray-900 transition-colors p-2"><Bell size={20} /></button>
        <button className="hover:text-gray-900 transition-colors p-2"><Settings size={20} /></button>
        <button className="w-8 h-8 bg-gray-800 text-white rounded-full flex items-center justify-center flex-shrink-0 hover:bg-gray-900 overflow-hidden">
           <User size={16} />
        </button>
      </div>
    </header>
  );
}
