import { Building2, Hospital, Stethoscope } from "lucide-react";
import { useDomain, type Domain } from "../lib/domain";

const domains: Array<{
  id: Domain;
  label: string;
  sublabel: string;
  icon: typeof Stethoscope;
}> = [
  { id: "osms", label: "ФСМС / ОСМС", sublabel: "Медицина", icon: Stethoscope },
  { id: "nr", label: "КГД — Нерезиденты", sublabel: "Фиктивные ЮЛ", icon: Building2 },
  { id: "inpatient", label: "Стационар", sublabel: "Больницы", icon: Hospital },
];

export function DomainSwitcher() {
  const { domain, setDomain } = useDomain();

  return (
    <div className="flex items-stretch gap-1">
      {domains.map(({ id, label, sublabel, icon: Icon }) => {
        const isActive = domain === id;

        return (
          <button
            key={id}
            type="button"
            aria-pressed={isActive}
            onClick={() => setDomain(id)}
            className={`relative flex items-center gap-1.5 rounded-lg border px-2 py-1.5 text-left transition-colors ${
              isActive
                ? "border-cyan-500/50 bg-cyan-500/10 text-cyan-400"
                : "border-border bg-surface text-subtle hover:bg-surface-2 hover:text-body"
            }`}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span>
              <span className="block whitespace-nowrap text-[11px] font-semibold">{label}</span>
              <span className="block text-[9px] opacity-70">{sublabel}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
