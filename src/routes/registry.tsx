import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useDomainMeta } from "../lib/domain";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Download,
  ArrowUpRight,
  Building2,
  AlertTriangle,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { fetchRegistry, type RegistrySubject } from "../lib/api";

export const Route = createFileRoute("/registry")({
  head: () => ({
    meta: [
      { title: "Реестр субъектов — BatysMonitor" },
      { name: "description", content: "Реестр мониторируемых организаций ЗКО" },
    ],
  }),
  component: RegistryPage,
});

// ─── логика уровня риска ────────────────────────────────────────────────────
// Порог: сумма ущерба за все найденные нарушения
// < 500 000 ₸  → Низкий
// 500 000–5 000 000 ₸ → Средний
// > 5 000 000 ₸ → Высокий
type RiskLevel = "high" | "medium" | "low";

function getRiskLevel(amount: number, totalRisks: number, domainId: string): RiskLevel {
  if (domainId === "nr") {
    if (totalRisks >= 4) return "high";
    if (totalRisks >= 2) return "medium";
    return "low";
  }
  if (amount > 5_000_000) return "high";
  if (amount > 500_000) return "medium";
  return "low";
}

const RISK_META: Record<RiskLevel, { label: string; dot: string; badge: string; icon: React.ReactNode }> = {
  high: {
    label: "Высокий",
    dot: "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.65)]",
    badge: "bg-red-500/10 text-red-400 border-red-500/25",
    icon: <ShieldAlert className="h-3.5 w-3.5" />,
  },
  medium: {
    label: "Средний",
    dot: "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.65)]",
    badge: "bg-amber-400/10 text-amber-400 border-amber-400/25",
    icon: <AlertTriangle className="h-3.5 w-3.5" />,
  },
  low: {
    label: "Низкий",
    dot: "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.65)]",
    badge: "bg-emerald-500/10 text-emerald-400 border-emerald-500/25",
    icon: <ShieldCheck className="h-3.5 w-3.5" />,
  },
};

function fmt(n: number) {
  return n.toLocaleString("ru-KZ", { maximumFractionDigits: 2 });
}

// Экспорт CSV
function exportCsv(subjects: RegistrySubject[], domainId: string) {
  const header = ["#", "Название", "БИН", "Район", "Уровень риска", "Сумма ущерба (₸)", "Нарушений"];
  const rows = subjects.map((s, i) => [
    i + 1,
    `"${s.clinic_name}"`,
    "-",
    "-",
    RISK_META[getRiskLevel(s.total_amount, s.total_risks, domainId)].label,
    s.total_amount.toFixed(2),
    s.total_risks,
  ]);
  const csv = [header, ...rows].map((r) => r.join(";")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "registry_export.csv";
  a.click();
  URL.revokeObjectURL(url);
}

// ─── компонент ──────────────────────────────────────────────────────────────
function RegistryPage() {
  const meta = useDomainMeta();
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [subjects, setSubjects] = useState<RegistrySubject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const perPage = 10;

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        setIsLoading(true);
        setError("");
        const data = await fetchRegistry(meta.id);
        if (isMounted) {
          setSubjects(data.subjects ?? []);
          setPage(1);
        }
      } catch (err: unknown) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Не удалось загрузить реестр");
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    void loadData();
    return () => {
      isMounted = false;
    };
  }, [meta.id]);

  const filtered = useMemo(() => {
    const lq = q.toLowerCase().trim();
    if (!lq) return subjects;
    return subjects.filter((s) => s.clinic_name.toLowerCase().includes(lq));
  }, [q, subjects]);

  const pages = Math.max(1, Math.ceil(filtered.length / perPage));
  const slice = filtered.slice((page - 1) * perPage, page * perPage);

  // Статистика
  const totalHigh = subjects.filter((s) => getRiskLevel(s.total_amount, s.total_risks, meta.id) === "high").length;
  const totalMedium = subjects.filter((s) => getRiskLevel(s.total_amount, s.total_risks, meta.id) === "medium").length;
  const totalLow = subjects.filter((s) => getRiskLevel(s.total_amount, s.total_risks, meta.id) === "low").length;

  return (
    <>
      <PageHeader
        title="Реестр субъектов"
        subtitle={`${subjects.length} организаций в реестре`}
        right={
          <button
            onClick={() => exportCsv(subjects, meta.id)}
            className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-body hover:bg-surface-2 transition-colors"
          >
            <Download className="h-4 w-4" /> Экспорт CSV
          </button>
        }
      />

      <div className="space-y-5 p-8">
        {/* Карточки-счётчики */}
        <div className="grid grid-cols-3 gap-4">
          {(
            [
              { level: "high" as RiskLevel, count: totalHigh, label: "Высокий риск" },
              { level: "medium" as RiskLevel, count: totalMedium, label: "Средний риск" },
              { level: "low" as RiskLevel, count: totalLow, label: "Низкий риск" },
            ] as const
          ).map(({ level, count, label }) => {
            const m = RISK_META[level];
            return (
              <div
                key={level}
                className={`rounded-xl border p-4 ${m.badge} flex items-center gap-3`}
              >
                <span className={`h-2.5 w-2.5 rounded-full flex-shrink-0 ${m.dot}`} />
                <div>
                  <p className="text-2xl font-bold">{count}</p>
                  <p className="text-xs opacity-80">{label}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Поиск */}
        <div className="relative max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" />
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            placeholder="Поиск по названию организации..."
            className="w-full rounded-lg border border-border bg-surface pl-9 pr-3 py-2 text-sm text-foreground placeholder:text-subtle focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        {/* Ошибка */}
        {error ? (
          <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4 text-sm text-red-400">
            {error}
          </div>
        ) : null}

        {/* Таблица */}
        <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-body">
              <thead className="border-b border-border text-xs text-subtle">
                <tr>
                  <th className="w-12 border-r border-border py-4 text-center font-medium">#</th>
                  <th className="border-r border-border px-4 py-4 font-medium">{meta.clinicLabel}</th>
                  <th className="border-r border-border px-4 py-4 font-medium">{meta.iinLabel}</th>
                  <th className="border-r border-border px-4 py-4 font-medium">Район</th>
                  <th className="border-r border-border px-4 py-4 font-medium">Уровень риска</th>
                  <th className="border-r border-border px-4 py-4 font-medium">Сумма ущерба</th>
                  <th className="px-4 py-4 font-medium">Нарушений</th>
                  <th className="w-14 px-4 py-4" />
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-14 text-center text-subtle">
                      <span className="inline-flex items-center gap-2">
                        <Building2 className="h-5 w-5 animate-pulse" />
                        Загрузка реестра...
                      </span>
                    </td>
                  </tr>
                ) : slice.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-14 text-center text-subtle">
                      {q ? "Ничего не найдено по вашему запросу." : "Реестр пуст. Загрузите Excel-файл на странице ИИ-Аналитик."}
                    </td>
                  </tr>
                ) : (
                  slice.map((row, idx) => {
                    const level = getRiskLevel(row.total_amount, row.total_risks, meta.id);
                    const m = RISK_META[level];
                    return (
                      <tr
                        key={row.clinic_name}
                        className="border-b border-border last:border-b-0 hover:bg-surface-2/50 transition-colors"
                      >
                        {/* # */}
                        <td className="border-r border-border py-4 text-center text-xs text-subtle font-medium">
                          {(page - 1) * perPage + idx + 1}
                        </td>
                        {/* Название */}
                        <td className="border-r border-border px-4 py-4 font-medium text-heading max-w-xs">
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 flex-shrink-0 text-subtle" />
                            <span className="truncate">{row.clinic_name}</span>
                          </div>
                        </td>
                        {/* БИН */}
                        <td className="border-r border-border px-4 py-4 font-mono text-subtle">
                          {row.bin || "—"}
                        </td>
                        {/* Район */}
                        <td className="border-r border-border px-4 py-4 text-subtle">
                          {row.district || "—"}
                        </td>
                        {/* Уровень риска */}
                        <td className="border-r border-border px-4 py-4">
                          <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${m.badge}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${m.dot}`} />
                            {m.label}
                          </span>
                        </td>
                        {/* Сумма ущерба */}
                        <td className="border-r border-border px-4 py-4 font-semibold text-heading">
                          {fmt(row.total_amount)} ₸
                        </td>
                        {/* Кол-во нарушений */}
                        <td className="px-4 py-4 text-body">
                          {row.total_risks}
                        </td>
                        {/* Кнопка */}
                        <td className="px-4 py-4">
                          <div className="flex justify-end">
                            <button
                              title="Подробнее"
                              className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-surface text-subtle transition-all hover:bg-surface-2 hover:text-heading"
                            >
                              <ArrowUpRight className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Пагинация */}
          {!isLoading && filtered.length > perPage ? (
            <div className="flex items-center justify-between border-t border-border bg-transparent px-4 py-3 text-xs text-subtle">
              <span>
                Показано {Math.min(slice.length, perPage)} из {filtered.length}
              </span>
              <div className="flex items-center gap-2">
                <button
                  disabled={page === 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="rounded-md border border-border p-1.5 text-body transition-colors hover:bg-surface-2 disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="font-mono">
                  {page} / {pages}
                </span>
                <button
                  disabled={page === pages}
                  onClick={() => setPage((p) => Math.min(pages, p + 1))}
                  className="rounded-md border border-border p-1.5 text-body transition-colors hover:bg-surface-2 disabled:opacity-40"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          ) : null}
        </div>

        {/* Легенда */}
        <div className="rounded-xl border border-border bg-surface/50 p-4">
          <p className="mb-2 text-xs font-semibold text-subtle uppercase tracking-wider">Логика определения уровня риска</p>
          <div className="flex flex-wrap gap-5 text-xs text-body">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500" /> Низкий — сумма ущерба до 500 000 ₸
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-amber-400" /> Средний — от 500 000 до 5 000 000 ₸
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-red-500" /> Высокий — более 5 000 000 ₸
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
