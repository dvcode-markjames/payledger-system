"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, PlusCircle, History, Settings, LogOut, BookOpen } from "lucide-react";
import { signOut } from "@/app/actions";

const NAV = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/log", label: "Log", icon: PlusCircle },
  { href: "/history", label: "History", icon: History },
  { href: "/settings", label: "Settings", icon: Settings },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Desktop side rail */}
      <aside className="hidden md:flex md:flex-col w-56 border-r border-ink-line bg-ink-soft px-4 py-6 gap-1 shrink-0">
        <div className="flex items-center gap-2 px-2 mb-8">
          <div className="w-8 h-8 rounded-lg bg-gcash/20 border border-gcash/40 flex items-center justify-center">
            <BookOpen size={16} className="text-gcash" />
          </div>
          <span className="font-display font-bold text-lg tracking-tight">PayLedger</span>
        </div>
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? "bg-gcash/15 text-gcash border border-gcash/30"
                  : "text-text-mid hover:text-text-hi hover:bg-ink-card"
              }`}
            >
              <Icon size={17} />
              {label}
            </Link>
          );
        })}
        <form action={signOut} className="mt-auto pt-4">
          <button className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-text-mid hover:text-out w-full">
            <LogOut size={17} />
            Sign out
          </button>
        </form>
      </aside>

      {/* Mobile top bar */}
      <header className="md:hidden flex items-center justify-between px-4 py-3 border-b border-ink-line bg-ink-soft sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gcash/20 border border-gcash/40 flex items-center justify-center">
            <BookOpen size={14} className="text-gcash" />
          </div>
          <span className="font-display font-bold tracking-tight">PayLedger</span>
        </div>
        <form action={signOut}>
          <button className="text-text-mid">
            <LogOut size={18} />
          </button>
        </form>
      </header>

      <main className="flex-1 pb-20 md:pb-0">{children}</main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-ink-soft border-t border-ink-line flex z-10">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex-1 flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium ${
                active ? "text-gcash" : "text-text-mid"
              }`}
            >
              <Icon size={19} />
              {label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
