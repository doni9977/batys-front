import { apiUrl } from "./config";

export type UploadResponse = {
  status: "success" | "error";
  message: string;
  risk_job_id: number;
};

export type RiskJobStatus = {
  id: number;
  status: "queued" | "running" | "done" | "failed";
  source_file: string;
  loaded_records: number;
  risks_found: number;
  error_message: string;
  started_at?: string;
  finished_at?: string;
};

export type RiskDetails = {
  service_count: number;
  threshold: number;
};

export type RiskRecord = {
  id: number;
  indicator: string;
  job_id: number;
  clinic_name: string;
  doctor_name: string;
  patient_iin: string;
  risk_date: string;
  amount: number;
  details: RiskDetails;
};

export type RisksResponse = {
  indicator: string;
  description: string;
  total_found: number;
  total_pages: number;
  risks: RiskRecord[];
};

export type AnalyticsResponse = {
  job_id: number;
  kpi: {
    total_amount: number;
    total_risks: number;
    unique_clinics: number;
    critical_clinics: number;
    latest_date: string;
  };
  by_month: Array<{
    month: string;
    amount: number;
    count: number;
  }>;
  by_indicator: Array<{
    indicator: string;
    amount: number;
    count: number;
  }>;
  by_clinic: Array<{
    clinic_name: string;
    amount: number;
    count: number;
  }>;
};

export type RegistryResponse = {
  job_id?: number;
  subjects: Array<{
    clinic_name: string;
    total_amount: number;
    total_risks: number;
    bin: string;
    district: string;
  }>;
};

export const uploadFile = async (file: File): Promise<UploadResponse> => {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(apiUrl("/api/upload"), {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "Upload failed");
  }

  return response.json() as Promise<UploadResponse>;
};

export const checkJobStatus = async (jobId: number): Promise<RiskJobStatus> => {
  const response = await fetch(apiUrl(`/api/risk-jobs/${jobId}`));

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "Status check failed");
  }

  return response.json() as Promise<RiskJobStatus>;
};

export const fetchAnalytics = async (domain: string): Promise<AnalyticsResponse> => {
  const normalizedDomain = domain.trim().toLowerCase();
  if (!normalizedDomain) {
    throw new Error("Не выбран домен аналитики");
  }

  const response = await fetch(apiUrl(`/api/analytics?domain=${encodeURIComponent(normalizedDomain)}`));
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "Failed to fetch analytics");
  }

  return response.json() as Promise<AnalyticsResponse>;
};

export const fetchRegistry = async (domain: string): Promise<RegistryResponse> => {
  const normalizedDomain = domain.trim().toLowerCase();
  if (!normalizedDomain) {
    throw new Error("Не выбран домен реестра");
  }

  const response = await fetch(apiUrl(`/api/registry?domain=${encodeURIComponent(normalizedDomain)}`));
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "Failed to fetch registry");
  }

  return response.json() as Promise<RegistryResponse>;
};

export const fetchRisks = async (
  indicator: string,
  jobId?: number,
  options?: { page?: number; limit?: number },
): Promise<RisksResponse> => {
  const normalizedIndicator = typeof indicator === "string" ? indicator.trim().toLowerCase() : "";
  if (!normalizedIndicator) {
    throw new Error("Не выбран алгоритм анализа");
  }

  const params = new URLSearchParams();
  if (jobId) params.set("job_id", String(jobId));
  if (options?.page) params.set("page", String(options.page));
  if (options?.limit) params.set("limit", String(options.limit));
  const query = params.toString();
  const url = apiUrl(`/api/risks/${normalizedIndicator}${query ? `?${query}` : ""}`);
  const response = await fetch(url);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "Failed to fetch risks");
  }

  return response.json() as Promise<RisksResponse>;
};