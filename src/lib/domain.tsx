import { createContext, useContext, useState, type ReactNode } from "react";

export type Domain = "osms" | "nr" | "inpatient";

export type DomainContextType = {
  domain: Domain;
  setDomain: (d: Domain) => void;
};

const DomainContext = createContext<DomainContextType>({
  domain: "osms",
  setDomain: () => {},
});

export function DomainProvider({ children }: { children: ReactNode }) {
  const [domain, setDomain] = useState<Domain>(() => {
    try {
      return (localStorage.getItem("batys-domain") as Domain) ?? "osms";
    } catch {
      return "osms";
    }
  });

  const handleSetDomain = (d: Domain) => {
    try { localStorage.setItem("batys-domain", d); } catch {}
    setDomain(d);
  };

  return (
    <DomainContext.Provider value={{ domain, setDomain: handleSetDomain }}>
      {children}
    </DomainContext.Provider>
  );
}

export function useDomain() {
  return useContext(DomainContext);
}

// Хук для удобного доступа к метаданным текущего домена
export function useDomainMeta() {
  const { domain } = useDomain();
  return DOMAIN_META[domain];
}

/** Метаинформация о доменах */
export const DOMAIN_META = {
  osms: {
    id: "osms" as Domain,
    label: "ФСМС / ОСМС",
    sublabel: "Медицина",
    emoji: "🏥",
    color: "from-cyan-500/20 to-blue-500/10 border-cyan-500/30 text-cyan-400",
    activeColor: "bg-gradient-to-r from-cyan-500/20 to-blue-600/10 border-cyan-500/40",
    // UI aliases
    clinicLabel: "Клиника",
    doctorLabel: "Врач",
    iinLabel: "ИИН пациента",
    uploadLabel: "Загрузить Excel ОСМС",
    uploadEndpoint: "/api/upload",
    algorithms: [
      { id: "a1", label: "A1: Возраст", desc: "Возрастное несоответствие" },
      { id: "a2", label: "A2: Пол", desc: "Гендерное несоответствие" },
      { id: "a3", label: "A3: Нагрузка", desc: "Аномальная нагрузка врача" },
      { id: "a4", label: "A4: Лимит", desc: "Превышение лимитов услуг" },
      { id: "a7", label: "A7: Годовой", desc: "Превышение годового лимита" },
      { id: "a8", label: "A8: Стоимость", desc: "Завышение стоимости" },
      { id: "a10", label: "A10: Интервал", desc: "Нарушение интервала услуг" },
    ],
  },
  nr: {
    id: "nr" as Domain,
    label: "КГД — Нерезиденты",
    sublabel: "Фиктивные ЮЛ",
    emoji: "🏢",
    color: "from-violet-500/20 to-purple-500/10 border-violet-500/30 text-violet-400",
    activeColor: "bg-gradient-to-r from-violet-500/20 to-purple-600/10 border-violet-500/40",
    // UI aliases
    clinicLabel: "Компания",
    doctorLabel: "Руководитель",
    iinLabel: "БИН компании",
    uploadLabel: "Загрузить реестр ЮЛ",
    uploadEndpoint: "/api/upload-nr",
    algorithms: [
      { id: "nr1", label: "NR1: Фиктивное присутствие", desc: "Регистрация без въезда в РК" },
      { id: "nr2", label: "NR2: Транзитный туризм", desc: "Групповой ввоз номиналов" },
      { id: "nr3", label: "NR3: Аффилированные сети", desc: "Нотариус+переводчик 3+ компаний" },
      { id: "nr4", label: "NR4: Финансовая пустышка", desc: "УК ниже порога 100 000 ₸" },
    ],
  },
    inpatient: {
    id: "inpatient" as Domain,
    label: "Стационар",
    sublabel: "Больницы",
    emoji: "🏨",
    color: "from-emerald-500/20 to-green-500/10 border-emerald-500/30 text-emerald-400",
    activeColor: "bg-gradient-to-r from-emerald-500/20 to-green-600/10 border-emerald-500/40",
    clinicLabel: "Стационар",
    doctorLabel: "Врач",
    iinLabel: "Пациент",
    uploadLabel: "Загрузить файлы стационара",
    uploadEndpoint: "/api/upload-inpatient",
    algorithms: [
      { id: "s1", label: "S1: Кросс-чек", desc: "Пересечение стационара и поликлиники" },
      { id: "s2", label: "S2: Дробление", desc: "Дробление госпитализаций" },
      { id: "s3", label: "S3: Круглосуточный", desc: "Фиктивный круглосуточный стационар" },
      { id: "s4", label: "S4: Экстренные", desc: "Аномалия экстренной госпитализации" },
      { id: "s5", label: "S5: После смерти", desc: "Услуги после смерти пациента" },
    ],
  },
} as const;
