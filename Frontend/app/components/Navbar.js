"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, Mic, LayoutDashboard, Clock, Info } from "lucide-react";

const navItems = [
  { href: "/", label: "Home", icon: Activity },
  { href: "/record", label: "Record", icon: Mic },
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/history", label: "History", icon: Clock },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="navbar" id="main-navbar">
      <div className="navbar-inner">
        <Link href="/" className="navbar-brand" id="brand-link">
          <div className="brand-icon">
            <Activity size={20} />
          </div>
          <span>VocalHealth<span style={{ color: "var(--primary-400)" }}> AI</span></span>
        </Link>

        <div className="navbar-links">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-link ${isActive ? "active" : ""}`}
                id={`nav-${item.label.toLowerCase()}`}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
