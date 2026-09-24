import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Search, ChevronLeft, ChevronRight, Download, ArrowUpRight } from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { apiUrl } from "../lib/config";
import { fetchRegistry } from "../lib/api";
import { useDomainMeta } from "../lib/domain";

export const Route = createFileRoute("/registry")({
  head: () => ({
    meta: [
      { title: "Реестр субъектов — BatysMonitor" },
      { name: "description", content: "Реестр мониторируемых компаний ЗКО" },
    ],
  }),
  component: RegistryPage,
});

type Risk = "critical" | "warning" | "ok";
type Row = { bin: string; name: string; district: string; risk: Risk; status: string };

const RISK_LABEL: Record<Risk, string> = { critical: "Критично", warning: "Внимание", ok: "Штатно" };

const getRiskLevel = (amount: number): Risk => {
  if (amount > 50) return "critical";
  if (amount > 20) return "warning";
  return "ok";
};

function RegistryPage() {
  const navigate = useNavigate();
  const domainMeta = useDomainMeta();
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<Row[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const perPage = 6;

  useEffect(() => {
    let isMounted = true;

    async function loadRows() {
      try {
        setIsLoading(true);
        setError("");
        const response = await fetchRegistry(domainMeta.id);

        if (!isMounted) return;

        const mappedRows: Row[] = response.subjects.map((subject) => ({
          bin: subject.bin || "000000000000",
          name: subject.clinic_name || "Неизвестная клиника",
          district: subject.district || "Неизвестно",
          risk: getRiskLevel(Number(subject.total_amount || 0)),
          status: `Найдено нарушений: ${subject.total_risks}`,
        }));

        setRows(mappedRows);
        setPage(1);
      } catch (err) {
        if (!isMounted) return;
        setRows([]);
        setError(err instanceof Error ? err.message : "Не удалось загрузить реестр");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    void loadRows();
    return () => {
      isMounted = false;
    };
  }, [domainMeta.id]);

  const filtered = useMemo(
    () =>
      rows.filter((r) => {
        const query = q.toLowerCase();
        return [r.bin, r.name, r.status].some((value) => value.toLowerCase().includes(query));
      }),
    [q, rows],
  );

  const pages = Math.max(1, Math.ceil(filtered.length / perPage));
  const slice = filtered.slice((page - 1) * perPage, page * perPage);

  return (
    <>
      <PageHeader
        title="Реестр субъектов"
        subtitle={`${rows.length} субъектов в реестре · ${domainMeta.label}`}
        right={
          <a
            href={apiUrl(`/api/export/xlsx?domain=${encodeURIComponent(domainMeta.id)}`)}
            download
            className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-body hover:bg-surface-2"
          >
            <Download className="h-4 w-4" /> Экспорт XLSX
          </a>
        }
      />

      <div className="space-y-4 p-8">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative max-w-md flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" />
            <input
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
              placeholder="Поиск по БИН, названию или статусу..."
              className="w-full rounded-lg border border-border bg-surface pl-9 pr-3 py-2 text-sm text-foreground placeholder:text-subtle focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>

        {error ? <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4 text-sm text-red-400">{error}</div> : null}

        <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-body">
              <thead className="border-b border-border text-xs text-subtle">
                <tr>
                  <th className="w-16 border-r border-border-subtle py-5 text-center font-medium">#</th>
                  <th className="border-r border-border-subtle px-4 py-5 font-medium">Название</th>
                  <th className="border-r border-border-subtle px-4 py-5 font-medium">Уровень риска</th>
                  <th className="border-r border-border-subtle px-4 py-5 font-medium">БИН</th>
                  <th className="border-r border-border-subtle px-4 py-5 font-medium">Район</th>
                  <th className="px-4 py-5 font-medium">Статус</th>
                  <th className="px-6 py-5 text-right font-medium"> </th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-subtle">
                      Загрузка реестра...
                    </td>
                  </tr>
                ) : slice.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-subtle">
                      Реестр пуст. Загрузите Excel-файл для формирования реестра.
                    </td>
                  </tr>
                ) : (
                  slice.map((row, index) => (
                    <tr key={`${row.name}-${row.bin}`} className="border-b border-border-subtle last:border-b-0 hover:bg-surface-2/50 transition-colors">
                      <td className="border-r border-border-subtle py-4 text-center text-subtle font-medium">
                        {(page - 1) * perPage + index + 1}
                      </td>
                      <td className="border-r border-border-subtle px-4 py-4 font-medium text-heading">{row.name}</td>
                      <td className="border-r border-border-subtle px-4 py-4">
                        <span className="flex items-center gap-2.5 text-body">
                          <span
                            className={`h-2.5 w-2.5 rounded-full ${
                              row.risk === "critical"
                                ? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]"
                                : row.risk === "warning"
                                  ? "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]"
                                  : "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]"
                            }`}
                          />
                          {RISK_LABEL[row.risk]}
                        </span>
                      </td>
                      <td className="border-r border-border-subtle px-4 py-4 font-mono text-body">{row.bin}</td>
                      <td className="border-r border-border-subtle px-4 py-4 text-body">{row.district}</td>
                      <td className="px-4 py-4 text-subtle">{row.status}</td>
                      <td className="px-6 py-4">
                        <div className="flex justify-end">
                          <button
                            type="button"
                            aria-label={`Открыть анализ ${row.name}`}
                            title={`Открыть анализ ${row.name}`}
                            onClick={() => navigate({ to: "/ai" })}
                            className="flex h-9 w-9 items-center justify-center rounded-[10px] border border-border bg-surface text-subtle transition-all hover:bg-surface-2 hover:text-heading"
                          >
                            <ArrowUpRight className="h-[18px] w-[18px]" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {!isLoading && rows.length > 0 ? (
            <div className="flex items-center justify-between border-t border-border bg-transparent px-4 py-3 text-xs text-subtle">
              <span>Показано {slice.length} из {filtered.length}</span>
              <div className="flex items-center gap-2">
                <button
                  disabled={page === 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="rounded-md border border-border p-1.5 text-body transition-colors hover:bg-surface-2 disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="font-mono">{page} / {pages}</span>
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
      </div>
    </>
  );
}
