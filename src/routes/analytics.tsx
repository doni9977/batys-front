import { createFileRoute } from "@tanstack/react-router";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { PageHeader } from "../components/PageHeader";
import { TrendingUp, TrendingDown, AlertOctagon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { fetchRisks, type RiskRecord } from "../lib/api";

export const Route = createFileRoute("/analytics")({
  head: () => ({
    meta: [
      { title: "Аналитика и Тренды — BatysMonitor" },
      { name: "description", content: "Тренды экономических показателей ЗКО" },
    ],
  }),
  component: AnalyticsPage,
});

const axis = { stroke: "#475569", fontSize: 12 };

function useIsDark() {
  const [isDark, setIsDark] = useState(true);
  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains("dark"));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);
  return isDark;
}

function formatAmount(value: number) {
  return `${value.toLocaleString("ru-RU", { maximumFractionDigits: 0 })} ₸`;
}

function KpiCard({ icon: Icon, label, value, trend, accent }: any) {
  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wider text-subtle">{label}</span>
        <Icon className={`h-4 w-4 ${accent}`} />
      </div>
      <div className="mt-3 text-2xl font-semibold text-heading">{value}</div>
      <div className={`mt-1 text-xs ${accent}`}>{trend}</div>
    </div>
  );
}

function AnalyticsPage() {
  const isDark = useIsDark();
  const [risks, setRisks] = useState<RiskRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadRisks() {
      try {
        setIsLoading(true);
        setError("");
        const response = await fetchRisks("a3");

        if (!isMounted) return;
        setRisks(response.risks ?? []);
      } catch (err) {
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : "Не удалось загрузить аналитические данные");
        setRisks([]);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    void loadRisks();
    return () => {
      isMounted = false;
    };
  }, []);

  const chartData = useMemo(() => {
    const grouped = new Map<string, number>();

    risks.forEach((risk) => {
      const date = risk.risk_date || "Нет данных";
      grouped.set(date, (grouped.get(date) ?? 0) + Number(risk.amount || 0));
    });

    return Array.from(grouped.entries()).map(([date, amount]) => ({
      date: date.slice(5) || date,
      amount,
    }));
  }, [risks]);

  const totalAmount = useMemo(
    () => risks.reduce((sum, risk) => sum + Number(risk.amount || 0), 0),
    [risks],
  );

  const criticalSubjects = useMemo(() => {
    const names = new Set<string>();

    risks.forEach((risk) => {
      const clinicName = risk.clinic_name || "Неизвестная клиника";
      if (Number(risk.amount || 0) > 80) {
        names.add(clinicName);
      }
    });

    return names.size;
  }, [risks]);

  const totalViolations = risks.length;

  const kpis = [
    {
      label: "Сумма нарушений",
      value: isLoading && !error ? "0 ₸" : formatAmount(totalAmount),
      trend: totalAmount > 0 ? "Данные из API" : "Нет данных",
      accent: "text-red-400",
      icon: TrendingUp,
    },
    {
      label: "Критических субъектов",
      value: isLoading && !error ? "0" : String(criticalSubjects),
      trend: totalViolations > 0 ? "Уникальные клиники" : "Нет данных",
      accent: "text-amber-300",
      icon: AlertOctagon,
    },
    {
      label: "Нарушений найдено",
      value: isLoading && !error ? "0" : String(totalViolations),
      trend: totalViolations > 0 ? "По последней выгрузке" : "Нет данных",
      accent: "text-emerald-400",
      icon: TrendingDown,
    },
    {
      label: "Дата последней проверки",
      value: risks.length ? (risks[0]?.risk_date || "—") : "—",
      trend: risks.length ? "По API" : "Нет данных",
      accent: "text-cyan-400",
      icon: TrendingUp,
    },
  ];

  const tooltipStyle = {
    backgroundColor: isDark ? "#0f172a" : "#ffffff",
    border: isDark ? "1px solid rgba(148,163,184,0.2)" : "1px solid rgba(0,0,0,0.1)",
    borderRadius: 8,
    color: isDark ? "#e2e8f0" : "#1e293b",
    boxShadow: isDark ? "0 4px 20px rgba(0,0,0,0.4)" : "0 4px 20px rgba(0,0,0,0.1)",
  };

  const gridColor = isDark ? "rgba(148,163,184,0.1)" : "rgba(0,0,0,0.08)";
  const cursorFill = isDark ? "rgba(148,163,184,0.05)" : "rgba(0,0,0,0.04)";

  return (
    <>
      <PageHeader
        title="Аналитика и Тренды"
        subtitle="Сводные показатели экономических рисков по данным API"
      />
      <div className="space-y-6 p-8">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          {kpis.map(({ icon: Icon, label, value, trend, accent }) => (
            <KpiCard key={label} icon={Icon} label={label} value={value} trend={trend} accent={accent} />
          ))}
        </div>

        {error ? (
          <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4 text-sm text-red-400">{error}</div>
        ) : null}

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <section className="rounded-xl border border-border bg-surface p-5 xl:col-span-2">
            <header className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-heading">Динамика нарушений по датам</h2>
                <p className="text-xs text-subtle">Сумма по risk_date из последнего ответа API</p>
              </div>
            </header>
            <div className="h-72">
              {chartData.length === 0 ? (
                <div className="flex h-full items-center justify-center text-sm text-subtle">
                  Нет данных. Загрузите файл на главной странице.
                </div>
              ) : (
                <ResponsiveContainer>
                  <BarChart data={chartData}>
                    <CartesianGrid stroke={gridColor} vertical={false} />
                    <XAxis dataKey="date" {...axis} />
                    <YAxis {...axis} />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      cursor={{ fill: cursorFill }}
                      formatter={(value: number) => `${value.toLocaleString("ru-RU")} ₸`}
                    />
                    <Legend />
                    <Bar dataKey="amount" name="Сумма нарушений" fill="#22d3ee" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </section>

          <section className="rounded-xl border border-border bg-surface p-5">
            <header className="mb-4">
              <h2 className="text-base font-semibold text-heading">График по датам</h2>
              <p className="text-xs text-subtle">Показатели из реального набора данных</p>
            </header>
            <div className="h-64">
              {chartData.length === 0 ? (
                <div className="flex h-full items-center justify-center text-sm text-subtle">
                  Нет данных. Загрузите файл на главной странице.
                </div>
              ) : (
                <ResponsiveContainer>
                  <LineChart data={chartData}>
                    <CartesianGrid stroke={gridColor} vertical={false} />
                    <XAxis dataKey="date" {...axis} />
                    <YAxis {...axis} />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      formatter={(value: number) => `${value.toLocaleString("ru-RU")} ₸`}
                    />
                    <Line
                      type="monotone"
                      dataKey="amount"
                      name="Нарушения, ₸"
                      stroke="#f87171"
                      strokeWidth={2.5}
                      dot={{ r: 4, fill: "#f87171", strokeWidth: 0 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </section>

          <section className="rounded-xl border border-border bg-surface p-5">
            <header className="mb-4">
              <h2 className="text-base font-semibold text-heading">Сводка по рискам</h2>
              <p className="text-xs text-subtle">Данные сформированы из ответа сервера</p>
            </header>
            <div className="flex h-64 items-center justify-center text-sm text-subtle">
              {chartData.length === 0
                ? "Нет данных. Загрузите файл на главной странице."
                : `Проверено ${risks.length} записей • ${criticalSubjects} критических субъектов`}
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
