import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Sparkles,
  AlertTriangle,
  Database,
  Search,
  Filter,
  FileText,
  Clock,
  Building2,
  CheckCircle2,
  UploadCloud,
} from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { fetchRisks, uploadFile, checkJobStatus, type RiskRecord } from "../lib/api";
import { useDomainMeta } from "../lib/domain";

export const Route = createFileRoute("/ai")({
  head: () => ({
    meta: [
      { title: "ИИ-Аналитик — BatysMonitor" },
      { name: "description", content: "AI-анализ документов и обнаружение аномалий в данных ЗКО" },
    ],
  }),
  component: AiPage,
});

type Severity = "critical" | "warning" | "info";

type Anomaly = {
  id: number;
  title: string;
  description: string;
  severity: Severity;
  organization: string;
  date: string;
  amount: number;
  detailText: string;
};

const osmsIndicatorOptions = [
  { value: "a1", label: "A1 — Возрастные аномалии / несоответствие профилю" },
  { value: "a2", label: "A2 — Половое несоответствие услуги" },
  { value: "a3", label: "A3 — Аномальная нагрузка врача" },
  { value: "a4", label: "A4 — Дублирование услуг" },
  { value: "a7", label: "A7 — Несоответствие физическим возможностям" },
  { value: "a8", label: "A8 — Завышение стоимости услуги (upcoding)" },
  { value: "a10", label: "A10 — Несоответствие интервала услуги" },
];

const severityOptions = [
  { value: "all", label: "Все" },
  { value: "critical", label: "Критично" },
  { value: "warning", label: "Внимание" },
  { value: "info", label: "Информация" },
] as const;

const formatMetricValue = (value: number) => `${value.toLocaleString("ru-RU")} ед.`;

const getSeverity = (amount: number): Severity => {
  if (amount > 80) return "critical";
  if (amount > 20) return "warning";
  return "info";
};

function KpiCard({ icon: Icon, label, value, accent, subtext }: { icon: typeof Sparkles; label: string; value: string | number; accent: string; subtext?: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wider text-subtle">{label}</span>
        <div className={`rounded-lg p-2 ${accent}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div className="mt-3 text-2xl font-semibold text-heading">{value}</div>
      {subtext && <div className="mt-1 text-xs text-subtle">{subtext}</div>}
    </div>
  );
}

function AiPage() {
  const domainMeta = useDomainMeta();
  const indicatorOptions = domainMeta.algorithms;
  const [risks, setRisks] = useState<RiskRecord[]>([]);
  const [totalRiskCount, setTotalRiskCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [selectedIndicator, setSelectedIndicator] = useState("a3");
  const [selectedSeverity, setSelectedSeverity] = useState<(typeof severityOptions)[number]["value"]>("all");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<"idle" | "uploading" | "running" | "done" | "error">("idle");
  const [uploadError, setUploadError] = useState("");

  useEffect(() => {
    setSelectedIndicator(domainMeta.algorithms[0]?.id ?? osmsIndicatorOptions[0].value);
  }, [domainMeta.id, domainMeta.algorithms]);

  useEffect(() => {
    let isMounted = true;

    async function loadRisks() {
      try {
        setIsLoading(true);
        setError("");
        const response = await fetchRisks(selectedIndicator, undefined, { limit: 1000 });

        if (!isMounted) return;
        setRisks(response.risks ?? []);
        setTotalRiskCount(response.total_found ?? response.risks?.length ?? 0);
      } catch (err) {
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : "Не удалось загрузить аномалии");
        setRisks([]);
        setTotalRiskCount(0);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    void loadRisks();
    return () => {
      isMounted = false;
    };
  }, [selectedIndicator]);

  const anomalies = useMemo<Anomaly[]>(() => {
    return risks.map((risk, index) => {
      const amount = Number(risk.amount || 0);
      const clinicName = risk.clinic_name || "Неизвестная клиника";
      const serviceCount = Number(risk.details?.service_count ?? 0);
      const threshold = Number(risk.details?.threshold ?? 0);
      const actualInterval = Number(risk.details?.actual_interval_minutes ?? 0);
      const requiredInterval = Number(risk.details?.required_interval_minutes ?? 0);

      const detailText = risk.doctor_name
        ? (() => {
            if (serviceCount > 0 || threshold > 0) {
              return `Врач ${risk.doctor_name} оказал ${serviceCount} услуг при норме ${threshold}`;
            }
            if (actualInterval > 0 || requiredInterval > 0) {
              return `Врач ${risk.doctor_name} выполнил услугу через ${actualInterval} мин при норме ${requiredInterval} мин`;
            }
            if (risk.details?.previous_service_name && risk.details?.service_name) {
              return `Врач ${risk.doctor_name} выполнил ${risk.details.service_name} раньше допустимого интервала после ${risk.details.previous_service_name}`;
            }
            return `Врач ${risk.doctor_name} нарушил правила оказания услуг`;
          })()
        : `Нарушение по клинике ${clinicName}`;

      return {
        id: risk.id || index + 1,
        title: risk.indicator || `Аномальная нагрузка ${index + 1}`,
        description: risk.clinic_name || "Неизвестная клиника",
        severity: getSeverity(amount),
        organization: risk.clinic_name || "Неизвестная клиника",
        date: risk.risk_date || "—",
        amount,
        detailText,
      };
    });
  }, [risks]);

  const handleUpload = async () => {
    if (!selectedFile) return;

    try {
      setUploadStatus("uploading");
      setUploadError("");
      const uploadResult = await uploadFile(selectedFile);
      const jobId = typeof uploadResult.risk_job_id === "number" ? uploadResult.risk_job_id : undefined;

      if (jobId) {
        setUploadStatus("running");

        for (let attempt = 0; attempt < 120; attempt += 1) {
          let job;
          try {
            job = await checkJobStatus(jobId);
          } catch (err) {
            if (attempt === 119) throw err;
            await new Promise((resolve) => window.setTimeout(resolve, 2000));
            continue;
          }

          if (job.status === "done") {
            const response = await fetchRisks(selectedIndicator, jobId, { limit: 1000 });
            setRisks(response.risks ?? []);
            setTotalRiskCount(response.total_found ?? response.risks?.length ?? 0);
            setUploadStatus("done");
            return;
          }

          if (job.status === "failed") {
            setUploadStatus("error");
            setUploadError(job.error_message || "Ошибка расчета рисков");
            return;
          }

          await new Promise((resolve) => window.setTimeout(resolve, 2000));
        }

        throw new Error("Обработка файла занимает слишком много времени");
      }

      setUploadStatus("done");
    } catch (err) {
      setUploadStatus("error");
      setUploadError(err instanceof Error ? err.message : "Не удалось загрузить файл");
    }
  };

  const filtered = anomalies.filter((item) => {
    const matchesSeverity = selectedSeverity === "all" || item.severity === selectedSeverity;
    const matchesSearch = !search.trim() || [item.title, item.organization, item.description, item.date].some((value) =>
      value.toLowerCase().includes(search.toLowerCase()),
    );

    return matchesSeverity && matchesSearch;
  });

  const totalAmount = anomalies.reduce((sum, item) => sum + item.amount, 0);
  const criticalCount = anomalies.filter((item) => item.severity === "critical").length;

  return (
    <>
      <PageHeader
        title="ИИ-Аналитик"
        subtitle="Автоматический разбор документов и обнаружение аномалий"
      />

      <div className="space-y-6 p-8">
        <div className="rounded-xl border border-border bg-surface p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-medium text-subtle">
            <Sparkles className="h-4 w-4 text-cyan-500" />
            Алгоритм анализа
          </div>
          <div className="flex flex-wrap gap-2">
            {indicatorOptions.map((option) => {
              const isActive = selectedIndicator === option.id;

              return (
                <button
                  key={option.id}
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => setSelectedIndicator(option.id)}
                  className={`rounded-lg border px-3 py-2 text-left text-sm transition-all ${
                    isActive
                      ? "border-cyan-500 bg-cyan-500/10 text-cyan-600 shadow-sm ring-2 ring-cyan-500/20 dark:text-cyan-300"
                      : "border-border bg-surface text-body hover:border-cyan-500/40 hover:text-cyan-600"
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>

          <div className="mt-4 flex flex-col gap-3 border-t border-border pt-4 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              {severityOptions.map((option) => {
                const isActive = selectedSeverity === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setSelectedSeverity(option.value)}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
                      isActive
                        ? "border-cyan-500 bg-cyan-500/10 text-cyan-600 dark:text-cyan-300"
                        : "border-border bg-surface text-subtle hover:border-cyan-500/40 hover:text-cyan-600"
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                className="max-w-[220px] text-xs text-slate-300 file:mr-3 file:rounded-md file:border-0 file:bg-cyan-500/20 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-cyan-300 hover:file:bg-cyan-500/30"
              />
              <button
                type="button"
                onClick={handleUpload}
                disabled={!selectedFile || uploadStatus === "uploading" || uploadStatus === "running"}
                className="inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-3 py-2 text-xs font-bold text-white transition-all hover:bg-cyan-500 disabled:opacity-50"
              >
                <UploadCloud className="h-4 w-4" />
                {uploadStatus === "uploading" ? "Отправка..." : uploadStatus === "running" ? "Анализ..." : uploadStatus === "done" ? "Готово" : "Загрузить файл"}
              </button>
            </div>
          </div>

          {uploadError ? <div className="mt-3 text-sm text-red-400">{uploadError}</div> : null}
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <KpiCard
            icon={AlertTriangle}
            label="Аномалий обнаружено"
            value={isLoading ? 0 : totalRiskCount}
            accent="bg-red-500/10 text-red-500 dark:text-red-400"
            subtext={totalRiskCount ? `${criticalCount} критических · показано ${anomalies.length}` : "Нет данных"}
          />
          <KpiCard
            icon={Database}
            label="Источников проверено"
            value={1}
            accent="bg-cyan-500/10 text-cyan-600 dark:text-cyan-400"
            subtext="Последняя выгрузка"
          />
          <KpiCard
            icon={Sparkles}
            label="Сумма нарушений"
            value={isLoading ? "0 ед." : formatMetricValue(totalAmount)}
            accent="bg-amber-500/10 text-amber-600 dark:text-amber-300"
            subtext="По загруженным записям"
          />
          <KpiCard
            icon={FileText}
            label="Документов обработано"
            value={isLoading ? 0 : totalRiskCount}
            accent="bg-violet-500/10 text-violet-600 dark:text-violet-400"
            subtext={totalRiskCount ? "Всего по алгоритму" : "Нет данных"}
          />
        </div>

        {error ? <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4 text-sm text-red-400">{error}</div> : null}

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative max-w-md flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск по аномалии, организации или дате..."
              className="w-full rounded-lg border border-border bg-surface pl-9 pr-3 py-2.5 text-sm text-foreground placeholder:text-subtle focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="rounded-xl border border-border bg-surface p-12 text-center text-subtle">Загрузка аномалий...</div>
        ) : filtered.length === 0 ? (
          <div className="flex min-h-[260px] items-center justify-center rounded-xl border border-border bg-surface p-8 text-center text-base text-subtle">
            Аномалий не обнаружено. Запустите анализ реестров.
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((item) => {
              const accent =
                item.severity === "critical"
                  ? "bg-red-500/10 text-red-500 border-red-500/30"
                  : item.severity === "warning"
                    ? "bg-amber-500/10 text-amber-600 border-amber-500/30"
                    : "bg-blue-500/10 text-blue-600 border-blue-500/30";

              return (
                <div key={item.id} className="rounded-xl border border-border bg-surface p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold ${accent}`}>
                          {item.severity === "critical" ? "Критично" : item.severity === "warning" ? "Внимание" : "Информация"}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-md bg-surface-2 px-2 py-0.5 text-[11px] font-medium text-subtle">
                          <Building2 className="h-3 w-3" />
                          {item.organization}
                        </span>
                      </div>

                      <h3 className="text-base font-semibold text-heading">{item.title}</h3>
                      <p className="mt-2 text-sm text-body">{item.description}</p>

                      <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-subtle">
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{item.date}</span>
                        <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3" />{item.organization}</span>
                      </div>
                    </div>

                    <div className="shrink-0 rounded-lg bg-primary/10 px-3 py-2 text-right">
                      <div className="text-[11px] uppercase tracking-wider text-subtle">Сумма</div>
                      <div className="text-lg font-bold text-heading">{formatMetricValue(item.amount)}</div>
                    </div>
                  </div>

                  <div className="mt-4 rounded-lg border border-border-subtle bg-surface-2/60 p-4 text-sm text-body">
                    {item.detailText}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
