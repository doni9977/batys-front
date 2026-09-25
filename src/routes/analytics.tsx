import { createFileRoute } from "@tanstack/react-router";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { PageHeader } from "../components/PageHeader";
import {
  TrendingUp,
  AlertOctagon,
  Building2,
  ShieldAlert,
  ListChecks,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  fetchAnalytics,
  type AnalyticsResponse,
  type AnalyticsMonthRow,
} from "../lib/api";
import { useDomainMeta } from "../lib/domain";

export const Route = createFileRoute("/analytics")({
  head: () => ({
    meta: [
      { title: "Аналитика и Тренды — BatysMonitor" },
      { name: "description", content: "Тренды экономических рисков ЗКО" },
    ],
  }),
  component: AnalyticsPage,
});

// ─── helpers ────────────────────────────────────────────────────────────────
const axis = { stroke: "#475569", fontSize: 11 };

function fmtMoney(v: number) {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)} млн ₸`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)} тыс ₸`;
  return `${v.toLocaleString("ru-RU", { maximumFractionDigits: 0 })} ₸`;
}

function fmtMoneyFull(v: number) {
  return `${v.toLocaleString("ru-RU", { maximumFractionDigits: 2 })} ₸`;
}

// Описания для алгоритмов (будут браться из meta.algorithms)
// const IND_LABELS: Record<string, string> = { ... }

const PIE_COLORS = ["#ef4444", "#f97316", "#eab308", "#22d3ee", "#818cf8", "#a78bfa", "#34d399"];

function useIsDark() {
  const [isDark, setIsDark] = useState(true);
  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
    const obs = new MutationObserver(() =>
      setIsDark(document.documentElement.classList.contains("dark"))
    );
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);
  return isDark;
}

// ─── KPI Card ───────────────────────────────────────────────────────────────
function KpiCard({
  icon: Icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub: string;
  accent: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wider text-subtle font-medium">{label}</span>
        <span className={`flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-surface-2 ${accent}`}>
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <div className="text-2xl font-bold text-heading">{value}</div>
      <div className="text-xs text-subtle">{sub}</div>
    </div>
  );
}

// ─── Month Selector ──────────────────────────────────────────────────────────
function MonthSelector({
  months,
  selected,
  onChange,
}: {
  months: string[];
  selected: string | null;
  onChange: (m: string | null) => void;
}) {
  if (months.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        onClick={() => onChange(null)}
        className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
          selected === null
            ? "border-cyan-500 bg-cyan-500/15 text-cyan-400"
            : "border-border bg-surface text-subtle hover:bg-surface-2"
        }`}
      >
        Все
      </button>
      {months.map((m) => (
        <button
          key={m}
          onClick={() => onChange(m)}
          className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
            selected === m
              ? "border-cyan-500 bg-cyan-500/15 text-cyan-400"
              : "border-border bg-surface text-subtle hover:bg-surface-2"
          }`}
        >
          {m}
        </button>
      ))}
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────
function AnalyticsPage() {
  const meta = useDomainMeta();
  const isDark = useIsDark();
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setIsLoading(true);
    fetchAnalytics(meta.id)
      .then((d) => { if (alive) setData(d); })
      .catch((e: unknown) => { if (alive) setError(e instanceof Error ? e.message : "Ошибка"); })
      .finally(() => { if (alive) setIsLoading(false); });
    return () => { alive = false; };
  }, [meta.id]);

  // Tooltip / grid styles
  const tooltipStyle = {
    backgroundColor: isDark ? "#0f172a" : "#ffffff",
    border: isDark ? "1px solid rgba(148,163,184,0.2)" : "1px solid rgba(0,0,0,0.1)",
    borderRadius: 8,
    color: isDark ? "#e2e8f0" : "#1e293b",
  };
  const gridColor = isDark ? "rgba(148,163,184,0.1)" : "rgba(0,0,0,0.08)";
  const cursorFill = isDark ? "rgba(148,163,184,0.05)" : "rgba(0,0,0,0.04)";

  // Список месяцев
  const months = useMemo(() => (data?.by_month ?? []).map((r) => r.month), [data]);

  // Данные для основного графика (фильтруем по месяцу или показываем все)
  const chartData: AnalyticsMonthRow[] = useMemo(() => {
    const rows = data?.by_month ?? [];
    if (!selectedMonth) return rows;
    return rows.filter((r) => r.month === selectedMonth);
  }, [data, selectedMonth]);

  // KPI: если выбран месяц — пересчитываем из by_month, иначе берём из kpi
  const kpi = useMemo(() => {
    if (!data) return { total_amount: 0, total_risks: 0, unique_clinics: 0, critical_clinics: 0, latest_date: "" };
    if (!selectedMonth) return data.kpi;
    const row = data.by_month.find((r) => r.month === selectedMonth);
    return {
      total_amount: row?.amount ?? 0,
      total_risks: row?.count ?? 0,
      unique_clinics: data.kpi.unique_clinics,
      critical_clinics: data.kpi.critical_clinics,
      latest_date: data.kpi.latest_date,
    };
  }, [data, selectedMonth]);

  // Пагинация клиник (по 5)
  const [clinicPage, setClinicPage] = useState(1);
  const clinicPerPage = 5;
  const clinics = data?.by_clinic ?? [];
  const clinicPages = Math.max(1, Math.ceil(clinics.length / clinicPerPage));
  const clinicSlice = clinics.slice((clinicPage - 1) * clinicPerPage, clinicPage * clinicPerPage);

  return (
    <>
      <PageHeader
        title="Аналитика и Тренды"
        subtitle="Реальные данные из базы — суммы ущерба, нарушения по месяцам и алгоритмам"
      />
      <div className="space-y-6 p-8">
        {/* ── Ошибка ── */}
        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* ── KPI Cards ── */}
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          <KpiCard
            icon={TrendingUp}
            label="Сумма ущерба"
            value={isLoading ? "..." : fmtMoney(kpi.total_amount)}
            sub={selectedMonth ? `За ${selectedMonth}` : "По всем периодам"}
            accent="text-red-400"
          />
          <KpiCard
            icon={ListChecks}
            label="Нарушений найдено"
            value={isLoading ? "..." : kpi.total_risks.toLocaleString("ru-RU")}
            sub={selectedMonth ? `За ${selectedMonth}` : "По последней выгрузке"}
            accent="text-amber-400"
          />
          <KpiCard
            icon={Building2}
            label={`Уникальных ${meta.clinicLabelPlural}`}
            value={isLoading ? "..." : String(kpi.unique_clinics)}
            sub="Организаций в данных"
            accent="text-cyan-400"
          />
          <KpiCard
            icon={ShieldAlert}
            label={`Критических ${meta.clinicLabelPlural}`}
            value={isLoading ? "..." : String(kpi.critical_clinics)}
            sub="Сумма ущерба > 5 млн ₸"
            accent="text-red-500"
          />
        </div>

        {/* ── Дата последней проверки ── */}
        {data?.kpi.latest_date && (
          <div className="flex items-center gap-2 text-xs text-subtle">
            <CalendarDays className="h-3.5 w-3.5" />
            Последняя дата услуги в данных: <span className="font-semibold text-body">{data.kpi.latest_date}</span>
          </div>
        )}

        {/* ── Фильтр по месяцам ── */}
        {months.length > 0 && (
          <div className="rounded-xl border border-border bg-surface p-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-subtle">
              Фильтр по месяцу
            </p>
            <MonthSelector months={months} selected={selectedMonth} onChange={setSelectedMonth} />
          </div>
        )}

        {/* ── Основной график: динамика по месяцам ── */}
        <section className="rounded-xl border border-border bg-surface p-5">
          <header className="mb-4 flex items-center justify-between flex-wrap gap-2">
            <div>
              <h2 className="text-base font-semibold text-heading">Динамика нарушений по месяцам</h2>
              <p className="text-xs text-subtle">
                {selectedMonth ? `Данные за ${selectedMonth}` : "Сумма ущерба и количество нарушений по всем месяцам"}
              </p>
            </div>
          </header>
          <div className="h-72">
            {isLoading ? (
              <div className="flex h-full items-center justify-center text-sm text-subtle animate-pulse">
                Загрузка данных...
              </div>
            ) : chartData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-subtle">
                Нет данных. Загрузите Excel-файл на странице Аналитик.
              </div>
            ) : (
              <ResponsiveContainer>
                <BarChart data={chartData} margin={{ left: 10 }}>
                  <CartesianGrid stroke={gridColor} vertical={false} />
                  <XAxis dataKey="month" {...axis} />
                  <YAxis
                    yAxisId="left"
                    {...axis}
                    tickFormatter={(v: number) => fmtMoney(v)}
                    width={90}
                  />
                  <YAxis yAxisId="right" orientation="right" {...axis} width={50} />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    cursor={{ fill: cursorFill }}
                    formatter={(value: number, name: string) =>
                      name === "Сумма ущерба" ? [fmtMoneyFull(value), name] : [value, name]
                    }
                  />
                  <Legend />
                  <Bar yAxisId="left" dataKey="amount" name="Сумма ущерба" fill="#22d3ee" radius={[4, 4, 0, 0]} />
                  <Bar yAxisId="right" dataKey="count" name="Нарушений" fill="#818cf8" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>

        {/* ── Нижние два блока ── */}
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          {/* Разбивка по алгоритмам — PieChart */}
          <section className="rounded-xl border border-border bg-surface p-5">
            <header className="mb-4">
              <h2 className="text-base font-semibold text-heading">Распределение по алгоритмам</h2>
              <p className="text-xs text-subtle">Сколько нарушений выявил каждый алгоритм</p>
            </header>
            <div className="h-64">
              {isLoading ? (
                <div className="flex h-full items-center justify-center text-sm text-subtle animate-pulse">Загрузка...</div>
              ) : (data?.by_indicator ?? []).length === 0 ? (
                <div className="flex h-full items-center justify-center text-sm text-subtle">Нет данных</div>
              ) : (
                <div className="flex h-full items-center gap-4">
                  <div className="h-full flex-1">
                    <ResponsiveContainer>
                      <PieChart>
                        <Pie
                          data={data!.by_indicator}
                          dataKey="count"
                          nameKey="indicator"
                          cx="50%"
                          cy="50%"
                          outerRadius={90}
                          innerRadius={50}
                        >
                          {data!.by_indicator.map((_, i) => (
                            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={tooltipStyle}
                          formatter={(v: number, name: string) => {
                            const label = meta.algorithms.find((a) => a.id.toUpperCase() === name.toUpperCase())?.label ?? name;
                            return [`${v} нарушений`, label];
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  {/* Легенда */}
                  <ul className="flex-shrink-0 space-y-1.5 text-xs">
                    {data!.by_indicator.map((row, i) => (
                      <li key={row.indicator} className="flex items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
                          style={{ background: PIE_COLORS[i % PIE_COLORS.length] }}
                        />
                        <span className="text-body">
                          <span className="font-semibold">{row.indicator}</span>
                          {" — "}
                          {row.count}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </section>

          {/* Топ клиник по сумме ущерба */}
          <section className="rounded-xl border border-border bg-surface p-5">
            <header className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-heading">Топ {meta.clinicLabelPlural} по сумме ущерба</h2>
                <p className="text-xs text-subtle">Ранжирование по сумме выявленных нарушений</p>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  disabled={clinicPage === 1}
                  onClick={() => setClinicPage((p) => Math.max(1, p - 1))}
                  className="flex h-7 w-7 items-center justify-center rounded-md border border-border text-subtle transition hover:bg-surface-2 disabled:opacity-30"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                <span className="text-xs text-subtle font-mono">{clinicPage}/{clinicPages}</span>
                <button
                  disabled={clinicPage === clinicPages}
                  onClick={() => setClinicPage((p) => Math.min(clinicPages, p + 1))}
                  className="flex h-7 w-7 items-center justify-center rounded-md border border-border text-subtle transition hover:bg-surface-2 disabled:opacity-30"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </header>
            {isLoading ? (
              <div className="flex h-52 items-center justify-center text-sm text-subtle animate-pulse">Загрузка...</div>
            ) : clinics.length === 0 ? (
              <div className="flex h-52 items-center justify-center text-sm text-subtle">Нет данных</div>
            ) : (
              <div className="space-y-3">
                {clinicSlice.map((clinic, idx) => {
                  const maxAmount = clinics[0]?.amount ?? 1;
                  const pct = Math.max(4, (clinic.amount / maxAmount) * 100);
                  const rank = (clinicPage - 1) * clinicPerPage + idx + 1;
                  return (
                    <div key={clinic.clinic_name} className="space-y-1">
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span className="flex min-w-0 items-center gap-1.5 text-body">
                          <span className="flex-shrink-0 font-mono text-subtle">#{rank}</span>
                          <span className="truncate">{clinic.clinic_name}</span>
                        </span>
                        <span className="flex-shrink-0 font-semibold text-heading">{fmtMoney(clinic.amount)}</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-surface-2 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-indigo-500 transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="text-right text-xs text-subtle">{clinic.count} нарушений</div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        {/* ── Линейный график: тренд по месяцам ── */}
        <section className="rounded-xl border border-border bg-surface p-5">
          <header className="mb-4">
            <h2 className="text-base font-semibold text-heading">Тренд суммы ущерба по месяцам</h2>
            <p className="text-xs text-subtle">Линейный тренд изменения общей суммы нарушений</p>
          </header>
          <div className="h-60">
            {isLoading ? (
              <div className="flex h-full items-center justify-center text-sm text-subtle animate-pulse">Загрузка...</div>
            ) : (data?.by_month ?? []).length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-subtle">Нет данных</div>
            ) : (
              <ResponsiveContainer>
                <LineChart data={data!.by_month} margin={{ left: 10 }}>
                  <CartesianGrid stroke={gridColor} vertical={false} />
                  <XAxis dataKey="month" {...axis} />
                  <YAxis {...axis} tickFormatter={(v: number) => fmtMoney(v)} width={90} />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(value: number) => [fmtMoneyFull(value), "Сумма ущерба"]}
                  />
                  <Line
                    type="monotone"
                    dataKey="amount"
                    name="Сумма ущерба"
                    stroke="#22d3ee"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: "#22d3ee", strokeWidth: 0 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>
      </div>
    </>
  );
}
