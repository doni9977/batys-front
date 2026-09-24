import { createContext, useContext, useState, type ReactNode } from "react";

export type Domain = "osms" | "nr" | "inpatient";

type DomainContextValue = {
  domain: Domain;
  setDomain: (domain: Domain) => void;
};

const DomainContext = createContext<DomainContextValue>({
  domain: "osms",
  setDomain: () => {},
});

export const DOMAIN_META = {
  osms: {
    id: "osms" as Domain,
    label: "ФСМС / ОСМС",
    sublabel: "Медицина",
    algorithms: [
      { id: "a1", label: "A1 — Возрастные аномалии / несоответствие профилю" },
      { id: "a2", label: "A2 — Половое несоответствие услуги" },
      { id: "a3", label: "A3 — Аномальная нагрузка врача" },
      { id: "a4", label: "A4 — Дублирование услуг" },
      { id: "a7", label: "A7 — Несоответствие физическим возможностям" },
      { id: "a8", label: "A8 — Завышение стоимости услуги (upcoding)" },
      { id: "a10", label: "A10 — Несоответствие интервала услуги" },
    ],
  },
  nr: {
    id: "nr" as Domain,
    label: "КГД — Нерезиденты",
    sublabel: "Фиктивные ЮЛ",
    algorithms: [
      { id: "nr1", label: "NR1 — Фиктивное присутствие" },
      { id: "nr2", label: "NR2 — Транзитный туризм" },
      { id: "nr3", label: "NR3 — Аффилированные сети" },
      { id: "nr4", label: "NR4 — Финансовая пустышка" },
    ],
  },
  inpatient: {
    id: "inpatient" as Domain,
    label: "Стационар",
    sublabel: "Больницы",
    algorithms: [
      { id: "s1", label: "S1 — Кросс-чек стационара" },
      { id: "s2", label: "S2 — Дробление госпитализаций" },
      { id: "s3", label: "S3 — Круглосуточный стационар" },
      { id: "s4", label: "S4 — Экстренные госпитализации" },
      { id: "s5", label: "S5 — Услуги после смерти" },
    ],
  },
} as const;

export function DomainProvider({ children }: { children: ReactNode }) {
  const [domain, setDomainState] = useState<Domain>(() => {
    try {
      const saved = localStorage.getItem("batys-domain") as Domain | null;
      return saved && saved in DOMAIN_META ? saved : "osms";
    } catch {
      return "osms";
    }
  });

  const setDomain = (nextDomain: Domain) => {
    try {
      localStorage.setItem("batys-domain", nextDomain);
    } catch {
      // Local storage is optional; the selection still works for this session.
    }
    setDomainState(nextDomain);
  };

  return <DomainContext.Provider value={{ domain, setDomain }}>{children}</DomainContext.Provider>;
}

export function useDomain() {
  return useContext(DomainContext);
}

export function useDomainMeta() {
  const { domain } = useDomain();
  return DOMAIN_META[domain];
}
