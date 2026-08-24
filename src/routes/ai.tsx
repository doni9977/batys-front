import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useDomainMeta } from "../lib/domain";
import {
  Sparkles,
  AlertTriangle,
  Database,
  Search,
  FileText,
  Clock,
  Building2,
  CheckCircle2,
  UploadCloud,
  ChevronLeft,
  ChevronRight,
  User,
} from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { fetchRisks, uploadFile, checkJobStatus, type RiskRecord } from "../lib/api";

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
  indicator: string;
  title: string;
  description: string;
  severity: Severity;
  organization: string;
  doctor: string;
  patient: string;
  date: string;
  amount: number;
  detailText: string;
};

const severityOptions = [
  { value: "all", label: "Все" },
  { value: "critical", label: "Критично" },
  { value: "warning", label: "Внимание" },
  { value: "info", label: "Информация" },
] as const;

const formatAmount = (indicator: string, value: number) => {
  if (indicator === "A3") return `${value} ед.`;
  if (indicator === "A10") return `${value} мин.`;
  if (indicator === "A1" || indicator === "A2" || indicator === "NR1" || indicator === "NR2") return "—";
  if (indicator === "NR3") return `${value} комп.`;
  return `${value.toLocaleString("ru-RU")} ₸`;
};

const getSeverity = (indicator: string, amount: number): Severity => {
  if (indicator === "A1" || indicator === "A2" || indicator === "A3") return "critical";
  if (indicator.startsWith("NR")) return "critical";
  if (indicator === "A4" || indicator === "A7" || indicator === "A10") return "warning";
  if (amount > 50000) return "critical";
  if (amount > 10000) return "warning";
  return "info";
};

function KpiCard({ icon: Icon, label, value, accent, subtext }: { icon: typeof Sparkles; label: string; value: string | number; accent: string; subtext?: string }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/40 p-6 backdrop-blur-xl transition-all hover:scale-[1.02] hover:bg-white/60 hover:shadow-lg dark:border-white/5 dark:bg-black/40 dark:hover:bg-black/60">
      <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient:to-br from-white/20 to-transparent blur-2xl" />
      <div className="relative z-10 flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">{label}</span>
        <div className={`rounded-xl p-2.5 shadow-sm ${accent}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <div className="relative z-10 mt-4 text-3xl font-bold tracking-tight text-slate-800 dark:text-slate-100">{value}</div>
      {subtext && <div className="relative z-10 mt-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">{subtext}</div>}
    </div>
  );
}

function AiPage() {
  const meta = useDomainMeta();
  const [risks, setRisks] = useState<RiskRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [selectedIndicator, setSelectedIndicator] = useState<string>(meta.algorithms[0].id);
  const [selectedSeverity, setSelectedSeverity] = useState<(typeof severityOptions)[number]["value"]>("all");
  
  // Pagination State
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalFound, setTotalFound] = useState(0);
  const limit = 50;

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<"idle" | "uploading" | "running" | "done" | "error">("idle");
  const [uploadError, setUploadError] = useState("");

  // Reset page and indicator when domain changes
  useEffect(() => {
    setSelectedIndicator(meta.algorithms[0].id);
    setPage(1);
  }, [meta.id]);

  useEffect(() => {
    setPage(1);
  }, [selectedIndicator]);

  useEffect(() => {
    let isMounted = true;

    async function loadRisks() {
      try {
        setIsLoading(true);
        setError("");
        const response = await fetchRisks(selectedIndicator, undefined, page, limit);

        if (!isMounted) return;
        setRisks(response.risks ?? []);
        setTotalPages(response.total_pages ?? 1);
        setTotalFound(response.total_found ?? 0);
      } catch (err) {
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : "Не удалось загрузить аномалии");
        setRisks([]);
        setTotalPages(1);
        setTotalFound(0);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    void loadRisks();
    return () => {
      isMounted = false;
    };
  }, [selectedIndicator, page]);

  const anomalies = useMemo<Anomaly[]>(() => {
    return risks.map((risk, index) => {
      const amount = Number(risk.amount || 0);
      const clinicName = risk.clinic_name || "Неизвестная клиника";

      const detailText = (() => {
        const ind = risk.indicator;
        const d = risk.details as any;
        
        if (ind === "A1" || ind === "A2") {
          return `${d?.reason || "Нарушение"}: Пациенту ${d?.patient_age || "—"} лет, Пол: ${d?.patient_gender || "—"}`;
        }
        if (ind === "A3") {
          return `Врач оказал ${d?.service_count} услуг за час (норма ${d?.threshold}) и ${d?.daily_count} услуг за день (норма 200)`;
        }
        if (ind === "A4") {
          return `Услуга оказана ${d?.total_count} раз за день (ограничение: ${d?.allowed_per_day} в день)`;
        }
        if (ind === "A7") {
          return `За год услуга оказана ${d?.total_quantity} раз (годовой лимит: ${d?.allowed_per_year})`;
        }
        if (ind === "A8") {
          return `Завышение стоимости: сумма к оплате ${d?.actual_amount} ₸ (макс. тариф с учетом количества: ${d?.allowed_amount} ₸). Разница: ${d?.excess_amount} ₸`;
        }
        if (ind === "A10") {
          return `Интервал между услугами составил ${d?.actual_interval_minutes} мин (норматив ${d?.required_interval_minutes} мин). Предыдущая услуга: ${d?.previous_service_name || "—"}`;
        }
        if (ind === "NR1") {
          return `${d?.reason}. Регистрация ТОО "${d?.company_name}" (БИН: ${d?.bin}). Дата рег: ${d?.reg_date}.`;
        }
        if (ind === "NR2") {
          return `${d?.reason}. Пребывание ${d?.stay_days} дн. ГРНЗ авто: ${d?.vehicle_plate}. КПП: ${d?.crossing_point}. Ввезено номиналов на данном авто: ${d?.shared_plate_count}.`;
        }
        if (ind === "NR3") {
          return `${d?.reason}. Нотариус: ${d?.notary}, Переводчик: ${d?.translator}. Зарегистрировали вместе ${d?.pair_count} компаний нерезидентов.`;
        }
        if (ind === "NR4") {
          return `${d?.reason}. Заявленный уставной капитал: ${d?.authorized_capital} ₸ (порог ${d?.threshold} ₸). Вид деятельности: ${d?.activity_type}`;
        }
                if (ind === "S1") {
          return `Услуга "${d?.service_name || "—"}" оказана в поликлинике ${d?.service_date}, когда пациент находился в стационаре (${d?.admission_date} — ${d?.discharge_date}). Физически невозможно.`;
        }
        if (ind === "S2") {
          return `Повторная госпитализация через ${d?.gap_days} дн. с тем же диагнозом (${d?.icd10_code}). Предыдущая выписка: ${d?.prev_discharge}, новое поступление: ${d?.new_admission_date}. Признак дробления случая.`;
        }
        if (ind === "S3") {
          return `Круглосуточный стационар при пребывании ${d?.bed_days} койко-дн. — дорогой тариф не соответствует сроку. Диагноз: ${d?.diagnosis || "—"} (${d?.icd10_code}).`;
        }
        if (ind === "S4") {
          return `${d?.reason}. Врач: ${risk.doctor_name}, отделение: ${d?.department}. Экстренных ${d?.emergency_patients} из ${d?.total_patients} (${d?.emergency_percent}%).`;
        }
        if (ind === "S5") {
          return `Услуга "${d?.service_name || "—"}" оказана в поликлинике ${d?.service_date}, после зафиксированной даты смерти пациента (${d?.death_date}).`;
        }
        return `${meta.doctorLabel} ${risk.doctor_name || clinicName} нарушил правила`;
      })();

      return {
        id: risk.id || index + 1,
        indicator: risk.indicator,
        title: (risk.details as any)?.service_name || risk.indicator,
        description: (risk.details as any)?.service_code ? `Код: ${(risk.details as any).service_code}` : clinicName,
        severity: getSeverity(risk.indicator, amount),
        organization: clinicName,
        doctor: risk.doctor_name || "—",
        patient: risk.patient_iin || (risk.details as any)?.patient_name || "—",
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
      const uploadResult = await uploadFile(selectedFile, meta.uploadEndpoint);
      const jobId = typeof uploadResult.risk_job_id === "number" ? uploadResult.risk_job_id : undefined;

      if (jobId) {
        setUploadStatus("running");
        
        // Wait and poll until job is done
        const pollTimer = setInterval(async () => {
          try {
             const job = await checkJobStatus(jobId);
             if (job.status === "done" || job.status === "failed") {
                clearInterval(pollTimer);
                if (job.status === "done") {
                  const response = await fetchRisks(selectedIndicator, jobId, 1, limit);
                  setRisks(response.risks ?? []);
                  setTotalPages(response.total_pages ?? 1);
                  setTotalFound(response.total_found ?? 0);
                  setPage(1);
                  setUploadStatus("done");
                } else {
                  setUploadStatus("error");
                  setUploadError(job.error_message || "Ошибка расчета рисков");
                }
             }
          } catch(e) {
            console.error(e);
          }
        }, 3000);
        return;
      }

      setUploadStatus("done");
    } catch (err) {
      setUploadStatus("error");
      setUploadError(err instanceof Error ? err.message : "Не удалось загрузить файл");
    }
  };

  const filtered = anomalies.filter((item) => {
    const matchesSeverity = selectedSeverity === "all" || item.severity === selectedSeverity;
    const matchesSearch = !search.trim() || [item.title, item.organization, item.doctor, item.patient, item.date].some((value) =>
      value.toLowerCase().includes(search.toLowerCase()),
    );
    return matchesSeverity && matchesSearch;
  });

  const totalMoneyAmount = filtered.reduce((sum, item) => {
    if (item.indicator === "A1" || item.indicator === "A2" || item.indicator === "A3" || item.indicator === "A10") return sum;
    return sum + item.amount;
  }, 0);

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950/50">
      <PageHeader
        title="ИИ-Аналитик"
        subtitle="Интеллектуальный поиск фрода и аномалий в данных медицинского страхования"
      />

      <div className="mx-auto max-w-7xl space-y-8 p-4 md:p-8">
        {/* Controls Section - Glassmorphism Card */}
        <div className="rounded-3xl border border-white/20 bg-white/60 p-6 shadow-xl shadow-slate-200/40 backdrop-blur-2xl dark:border-white/10 dark:bg-black/60 dark:shadow-none">
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-500 dark:text-slate-400">
            <div className="rounded-full bg-cyan-500/20 p-1.5">
              <Sparkles className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
            </div>
            Алгоритм анализа
          </div>
          
          <div className="flex flex-wrap gap-2">
            {meta.algorithms.map((option) => {
              const isActive = selectedIndicator === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => setSelectedIndicator(option.id)}
                  className={`rounded-xl border px-4 py-2.5 text-sm font-medium transition-all duration-300 ${
                    isActive
                      ? "border-cyan-500/50 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 text-cyan-700 shadow-md shadow-cyan-500/10 ring-1 ring-cyan-500/20 dark:text-cyan-300"
                      : "border-slate-200/50 bg-white/50 text-slate-600 hover:border-cyan-500/30 hover:bg-cyan-50/50 hover:text-cyan-700 dark:border-white/5 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>

          <div className="mt-6 flex flex-col gap-4 border-t border-slate-200/50 pt-6 md:flex-row md:items-center md:justify-between dark:border-white/10">
            <div className="flex flex-wrap items-center gap-2 bg-slate-100/50 p-1 rounded-xl dark:bg-white/5">
              {severityOptions.map((option) => {
                const isActive = selectedSeverity === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setSelectedSeverity(option.value)}
                    className={`rounded-lg px-4 py-2 text-xs font-semibold transition-all duration-200 ${
                      isActive
                        ? "bg-white text-slate-800 shadow-sm dark:bg-slate-800 dark:text-slate-100"
                        : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <label className="group relative cursor-pointer overflow-hidden rounded-xl border border-dashed border-cyan-300/50 bg-cyan-50/50 px-4 py-2 transition-all hover:bg-cyan-50 dark:border-cyan-500/30 dark:bg-cyan-500/10 dark:hover:bg-cyan-500/20">
                <span className="flex items-center gap-2 text-xs font-semibold text-cyan-700 dark:text-cyan-300">
                  <FileText className="h-4 w-4" />
                  {selectedFile ? selectedFile.name : "Выбрать Excel"}
                </span>
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="hidden"
                />
              </label>
              
              <button
                type="button"
                onClick={handleUpload}
                disabled={!selectedFile || uploadStatus === "uploading" || uploadStatus === "running"}
                className="group relative inline-flex items-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-cyan-500/20 transition-all hover:scale-105 hover:shadow-cyan-500/40 disabled:pointer-events-none disabled:opacity-50"
              >
                <div className="absolute inset-0 bg-white/20 opacity-0 transition-opacity group-hover:opacity-100" />
                <UploadCloud className="relative z-10 h-4 w-4" />
                <span className="relative z-10">
                  {uploadStatus === "uploading" ? "Отправка..." : uploadStatus === "running" ? "Анализ ИИ..." : uploadStatus === "done" ? "Готово!" : "Запуск анализа"}
                </span>
              </button>
            </div>
          </div>

          {uploadError ? (
            <div className="mt-4 rounded-xl bg-red-500/10 p-3 text-sm font-medium text-red-600 dark:text-red-400">
              {uploadError}
            </div>
          ) : null}
        </div>

        {/* KPI Cards Grid */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
          <KpiCard
            icon={AlertTriangle}
            label="Аномалий найдено"
            value={isLoading ? "—" : totalFound.toLocaleString("ru-RU")}
            accent="bg-gradient-to-br from-red-500 to-rose-600 text-white shadow-red-500/30"
            subtext="Всего записей по фильтру"
          />
          <KpiCard
            icon={Database}
            label="Источников"
            value={1}
            accent="bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-cyan-500/30"
            subtext="Реестр ДЭР"
          />
          <KpiCard
            icon={Sparkles}
            label="Ущерб на странице"
            value={isLoading ? "—" : `${totalMoneyAmount.toLocaleString("ru-RU")} ₸`}
            accent="bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-amber-500/30"
            subtext="Сумма рисков (текущая страница)"
          />
          <KpiCard
            icon={FileText}
            label="Страницы"
            value={isLoading ? "—" : `${page} / ${totalPages}`}
            accent="bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-violet-500/30"
            subtext={`По ${limit} записей`}
          />
        </div>

        {error ? (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-5 text-sm font-medium text-red-600 dark:text-red-400">
            {error}
          </div>
        ) : null}

        {/* Search */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative max-w-lg flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск по услуге, клинике, врачу или пациенту..."
              className="w-full rounded-2xl border border-white/20 bg-white/60 py-3.5 pl-11 pr-4 text-sm font-medium text-slate-800 placeholder:text-slate-400 shadow-sm backdrop-blur-xl transition-all focus:border-cyan-500/50 focus:bg-white focus:outline-none focus:ring-4 focus:ring-cyan-500/10 dark:border-white/10 dark:bg-black/40 dark:text-slate-200 dark:focus:bg-black/60"
            />
          </div>
        </div>

        {/* Results */}
        {isLoading ? (
          <div className="flex min-h-[300px] flex-col items-center justify-center rounded-3xl border border-white/20 bg-white/40 p-12 backdrop-blur-xl dark:border-white/10 dark:bg-black/40">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-cyan-500/30 border-t-cyan-500" />
            <p className="mt-4 text-sm font-medium text-slate-500">Загрузка данных ИИ...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex min-h-[300px] flex-col items-center justify-center rounded-3xl border border-white/20 bg-white/40 p-12 text-center backdrop-blur-xl dark:border-white/10 dark:bg-black/40">
            <div className="rounded-full bg-slate-100 p-4 dark:bg-white/5">
              <CheckCircle2 className="h-8 w-8 text-slate-400" />
            </div>
            <p className="mt-4 text-base font-semibold text-slate-700 dark:text-slate-300">Аномалий не обнаружено</p>
            <p className="mt-1 text-sm text-slate-500">Попробуйте изменить фильтры или загрузить новый файл.</p>
          </div>
        ) : (
          <div className="space-y-5">
            {filtered.map((item) => {
              const isCritical = item.severity === "critical";
              const isWarning = item.severity === "warning";
              
              const accentColor = isCritical
                ? "from-red-500/10 to-transparent border-red-500/20 text-red-700 dark:text-red-400"
                : isWarning
                  ? "from-amber-500/10 to-transparent border-amber-500/20 text-amber-700 dark:text-amber-400"
                  : "from-blue-500/10 to-transparent border-blue-500/20 text-blue-700 dark:text-blue-400";
              
              const badgeClass = isCritical
                ? "bg-red-500 text-white shadow-red-500/30"
                : isWarning
                  ? "bg-amber-500 text-white shadow-amber-500/30"
                  : "bg-blue-500 text-white shadow-blue-500/30";

              return (
                <div 
                  key={item.id} 
                  className={`group relative overflow-hidden rounded-3xl border bg-gradient-to-r ${accentColor} bg-white/60 p-6 shadow-sm backdrop-blur-xl transition-all hover:-translate-y-1 hover:shadow-md dark:bg-black/40`}
                >
                  <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex-1 space-y-4">
                      {/* Tags */}
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`inline-flex items-center rounded-lg px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider shadow-sm ${badgeClass}`}>
                          {isCritical ? "Критично" : isWarning ? "Внимание" : "Информация"}
                        </span>
                        <span className="inline-flex items-center gap-1.5 rounded-lg bg-white/80 px-2.5 py-1 text-xs font-semibold text-slate-600 shadow-sm dark:bg-white/10 dark:text-slate-300">
                          <Building2 className="h-3.5 w-3.5 text-slate-400" />
                          {item.organization}
                        </span>
                        {item.date && item.date !== "—" && (
                          <span className="inline-flex items-center gap-1.5 rounded-lg bg-white/80 px-2.5 py-1 text-xs font-semibold text-slate-600 shadow-sm dark:bg-white/10 dark:text-slate-300">
                            <Clock className="h-3.5 w-3.5 text-slate-400" />
                            {item.date}
                          </span>
                        )}
                      </div>

                      {/* Content */}
                      <div>
                        <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">{item.title}</h3>
                        <p className="mt-1 text-sm font-medium text-slate-500">{item.description}</p>
                      </div>

                      <div className="flex flex-wrap items-center gap-4 text-sm font-medium text-slate-600 dark:text-slate-400">
                         <span className="flex items-center gap-1.5">
                            <User className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
                            <span className="text-slate-400">{meta.doctorLabel}:</span> {item.doctor}
                         </span>
                         <span className="flex items-center gap-1.5">
                            <CheckCircle2 className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
                            <span className="text-slate-400">{meta.iinLabel}:</span> {item.patient}
                         </span>
                      </div>
                    </div>

                    {/* Amount & Detail Box */}
                    <div className="flex shrink-0 flex-col gap-3 lg:w-72 lg:items-end">
                       {item.amount > 0 && !["A1", "A2", "NR1", "NR2"].includes(item.indicator) && (
                         <div className="rounded-2xl bg-white/80 p-4 text-right shadow-sm ring-1 ring-slate-900/5 dark:bg-black/40 dark:ring-white/10">
                           <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                             {item.indicator === "A3" || item.indicator === "A10" ? "Превышение норматива" : item.indicator === "NR3" ? "Компаний" : "Сумма ущерба"}
                           </div>
                           <div className={`mt-1 text-2xl font-black tracking-tight ${isCritical ? 'text-red-600 dark:text-red-400' : 'text-slate-800 dark:text-slate-100'}`}>
                             {formatAmount(item.indicator, item.amount)}
                           </div>
                         </div>
                      )}
                    </div>
                  </div>

                  {/* Detail explanation */}
                  <div className="mt-5 rounded-2xl bg-white/50 p-4 text-sm font-medium text-slate-700 ring-1 ring-slate-900/5 dark:bg-black/20 dark:text-slate-300 dark:ring-white/5">
                     <span className="text-cyan-600 dark:text-cyan-400 font-bold mr-2">Решение ИИ:</span>
                     {item.detailText}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination UI */}
        {!isLoading && totalPages > 1 && (
          <div className="flex items-center justify-between rounded-2xl border border-white/20 bg-white/60 p-4 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-black/40">
            <div className="text-sm font-medium text-slate-500">
              Показано {(page - 1) * limit + 1} – {Math.min(page * limit, totalFound)} из {totalFound} аномалий
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white text-slate-600 shadow-sm transition-all hover:bg-slate-50 hover:text-cyan-600 disabled:opacity-50 dark:bg-white/5 dark:text-slate-400 dark:hover:bg-white/10"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              
              <div className="flex h-10 items-center justify-center rounded-xl bg-white px-4 text-sm font-bold text-slate-700 shadow-sm dark:bg-white/5 dark:text-slate-200">
                Страница {page} из {totalPages}
              </div>
              
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white text-slate-600 shadow-sm transition-all hover:bg-slate-50 hover:text-cyan-600 disabled:opacity-50 dark:bg-white/5 dark:text-slate-400 dark:hover:bg-white/10"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
