import type { ReactNode } from "react";
import { Settings, Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { DomainSwitcher } from "./DomainSwitcher";

export function PageHeader({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
}) {
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    // Read initial theme from DOM (set in __root.tsx)
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  const toggleTheme = () => {
    const next = !isDark;
    document.documentElement.classList.toggle("dark", next);
    setIsDark(next);
    try { localStorage.setItem("batys-theme", next ? "dark" : "light"); } catch {}
  };

  return (
    <div className="grid h-[92px] min-w-0 shrink-0 grid-cols-[minmax(180px,1fr)_minmax(0,auto)] items-center gap-3 overflow-hidden border-b border-border bg-background/80 px-6 py-3 backdrop-blur">
      <div className="min-w-0">
        <h1 className="text-lg font-semibold leading-tight tracking-tight text-heading">{title}</h1>
        {subtitle && <p className="mt-1 line-clamp-2 text-xs leading-tight text-subtle">{subtitle}</p>}
      </div>
      
      <div className="flex min-w-0 max-w-full items-center justify-end gap-3 overflow-hidden">
        {right}

        {/* Separator if right content exists */}
        {right && <div className="h-8 w-px bg-border" />}

        {/* Global Header Controls (Profile, Settings, Theme) */}
        <div className="flex items-center gap-2">
          <DomainSwitcher />
          
          <button 
            onClick={toggleTheme}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-surface text-subtle transition-colors hover:bg-surface-2 hover:text-heading"
          >
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          
          <button className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-surface text-subtle transition-colors hover:bg-surface-2 hover:text-heading">
            <Settings size={18} />
          </button>

          <div className="flex items-center gap-3 rounded-xl bg-surface py-1.5 pl-1.5 pr-3">
            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-cyan-500 to-blue-700 text-xs font-semibold text-white">
              МД
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-medium text-heading leading-tight">Марат Даниал</div>
              <div className="truncate text-[11px] text-subtle leading-tight">Тимлид (Fullstack)</div>
            </div>
            <div className="ml-2 h-2 w-2 shrink-0 rounded-full bg-emerald-400 shadow-[0_0_8px_oklch(0.72_0.18_150)]" />
          </div>
        </div>
      </div>
    </div>
  );
}
