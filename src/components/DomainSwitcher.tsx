import { Stethoscope, Building2 } from "lucide-react";
import { useDomain, type Domain } from "../lib/domain";

export function DomainSwitcher() {
  const { domain, setDomain } = useDomain();

  const domains: Array<{
    id: Domain;
    label: string;
    sub: string;
    icon: React.ElementType;
    active: string;
    idle: string;
  }> = [
    {
      id: "osms",
      label: "ФСМС / ОСМС",
      sub: "Медицина",
      icon: Stethoscope,
      active: "border-cyan-500/50 bg-gradient-to-br from-cyan-500/15 to-blue-600/10 text-cyan-300 shadow-[0_0_20px_-6px_rgba(34,211,238,0.4)]",
      idle: "border-border bg-surface text-subtle hover:bg-surface-2 hover:text-body hover:border-border-subtle",
    },
    {
      id: "nr",
      label: "КГД — Нерезиденты",
      sub: "Фиктивные ЮЛ",
      icon: Building2,
      active: "border-violet-500/50 bg-gradient-to-br from-violet-500/15 to-purple-600/10 text-violet-300 shadow-[0_0_20px_-6px_rgba(167,139,250,0.4)]",
      idle: "border-border bg-surface text-subtle hover:bg-surface-2 hover:text-body hover:border-border-subtle",
    },
    {
      id: "inpatient",
      label: "Стационар",
      sub: "Больницы",
      icon: Building2,
      active: "border-emerald-500/50 bg-gradient-to-br from-emerald-500/15 to-green-600/10 text-emerald-300 shadow-[0_0_20px_-6px_rgba(16,185,129,0.4)]",
      idle: "border-border bg-surface text-subtle hover:bg-surface-2 hover:text-body hover:border-border-subtle",
    },
  ];

  return (
    <div className="flex items-stretch gap-2">
      {domains.map((d) => {
        const Icon = d.icon;
        const isActive = domain === d.id;
        return (
          <button
            key={d.id}
            onClick={() => setDomain(d.id)}
            className={`relative flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all duration-200 ${
              isActive ? d.active : d.idle
            }`}
          >
            {isActive && (
              <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-current opacity-80 shadow-[0_0_6px_currentColor]" />
            )}
            <span className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border ${
              isActive ? "border-current/30 bg-current/10" : "border-border bg-surface-2"
            }`}>
              <Icon className="h-4 w-4" />
            </span>
            <div>
              <p className={`text-sm font-semibold leading-tight ${isActive ? "" : "text-body"}`}>
                {d.label}
              </p>
              <p className={`text-xs leading-tight ${isActive ? "opacity-70" : "text-subtle"}`}>
                {d.sub}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
}