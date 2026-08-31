import { Link, useRouterState } from "@tanstack/react-router";
import {
  MapPin,
  BarChart3,
  Building2,
  Sparkles,
  ShieldCheck,
  Menu,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

type NavItem = { to: string; label: string; icon: LucideIcon };

const mainNav: NavItem[] = [
  { to: "/", label: "Карта рисков", icon: MapPin },
  { to: "/analytics", label: "Аналитика и Тренды", icon: BarChart3 },
  { to: "/registry", label: "Реестр субъектов", icon: Building2 },
  { to: "/ai", label: "ИИ-Аналитик", icon: Sparkles },
];



function NavLink({ item, active, isCollapsed }: { item: NavItem; active: boolean; isCollapsed: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      to={item.to}
      className={[
        "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all",
        active
          ? "bg-gradient-to-r from-cyan-500/15 to-transparent text-primary border border-primary/30 shadow-[0_0_20px_-8px_oklch(0.78_0.13_210/.6)]"
          : "text-body hover:bg-surface-2 hover:text-heading border border-transparent",
      ].join(" ")}
    >
      <Icon className="h-4.5 w-4.5 shrink-0" size={18} />
      {!isCollapsed && <span className="truncate">{item.label}</span>}
      {active && !isCollapsed && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_8px_oklch(0.78_0.13_210)]" />}
    </Link>
  );
}

export function Sidebar({ isCollapsed, onToggle }: { isCollapsed: boolean; onToggle: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isActive = (p: string) => (p === "/" ? pathname === "/" : pathname.startsWith(p));

  return (
    <aside className={`fixed inset-y-0 left-0 z-30 flex flex-col border-r border-border bg-sidebar text-sidebar-foreground transition-all duration-300 ${isCollapsed ? "w-[80px]" : "w-[280px]"}`}>
      {/* Header / Logo */}
      <div className={`flex items-center border-b border-border h-[73px] ${isCollapsed ? 'justify-center' : 'px-5 gap-3'}`}>
        <button
          onClick={onToggle}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-subtle transition-colors hover:bg-surface-2 hover:text-heading"
        >
          <Menu size={20} />
        </button>

        {!isCollapsed && (
          <>
            <div className="relative grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-cyan-400/30 to-blue-600/30 border border-primary/40">
              <ShieldCheck className="h-4 w-4 text-primary" />
            </div>
            <div className="leading-tight">
              <div className="text-sm font-semibold tracking-wide text-heading">BatysMonitor</div>
              <div className="text-[11px] uppercase tracking-[0.15em] text-primary/80">ДЭР ЗКО</div>
            </div>
          </>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {!isCollapsed && (
          <div className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-subtle">
            Мониторинг
          </div>
        )}
        <div className="space-y-1">
          {mainNav.map((i) => (
            <NavLink key={i.to} item={i} active={isActive(i.to)} isCollapsed={isCollapsed} />
          ))}
        </div>

      </nav>

    </aside>
  );
}
