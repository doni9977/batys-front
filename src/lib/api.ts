import { apiUrl } from "./config";

const AUTH_TOKEN_KEY = "batys-auth-token";

export type LoginResponse = {
  status: "success";
  token: string;
  username: string;
};

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
  // A3
  service_hour?: number;
  service_count?: number;
  daily_count?: number;
  threshold?: number;

  // A10
  actual_interval_minutes?: number;
  required_interval_minutes?: number;
  previous_service_name?: string;
  service_name?: string;

  // A1, A2
  patient_age?: number;
  patient_gender?: string;
  reason?: string;

  // A4
  total_count?: number;
  allowed_per_day?: number;

  // A7
  year?: number;
  total_quantity?: number;
  allowed_per_year?: number;

  // A8
  quantity?: number;
  actual_amount?: number;
  allowed_amount?: number;
  excess_amount?: number;
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
  page: number;
  limit: number;
  total_pages: number;
  risks: RiskRecord[];
};

export const uploadFile = async (
  file: File,
  endpoint: string = "/api/upload",
): Promise<UploadResponse> => {
  const formData = new FormData();
  const fieldName = endpoint.includes("inpatient") ? "files" : "file";
  formData.append(fieldName, file);

  const response = await authenticatedFetch(apiUrl(endpoint), {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "Upload failed");
  }

  return response.json() as Promise<UploadResponse>;
};

export const uploadNonResidentFile = async (file: File): Promise<UploadResponse> =>
  uploadFile(file, "/api/upload-nr");

export const uploadInpatientFile = async (file: File): Promise<UploadResponse> =>
  uploadFile(file, "/api/upload-inpatient");

export const checkJobStatus = async (jobId: number): Promise<RiskJobStatus> => {
  const response = await authenticatedFetch(apiUrl(`/api/risk-jobs/${jobId}`));

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "Status check failed");
  }

  return response.json() as Promise<RiskJobStatus>;
};

export const fetchRisks = async (
  indicator: string,
  jobId?: number,
  page: number = 1,
  limit: number = 100,
): Promise<RisksResponse> => {
  const params = new URLSearchParams();
  if (jobId) params.set("job_id", jobId.toString());
  if (page) params.set("page", page.toString());
  if (limit) params.set("limit", limit.toString());
  const query = params.toString();
  const response = await authenticatedFetch(
    apiUrl(`/api/risks/${indicator}${query ? `?${query}` : ""}`),
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "Failed to fetch risks");
  }

  return response.json() as Promise<RisksResponse>;
};

export type RegistrySubject = {
  clinic_name: string;
  total_amount: number;
  total_risks: number;
  bin?: string;
  district?: string;
};

export type RegistryResponse = {
  job_id?: number;
  subjects: RegistrySubject[];
};

export const fetchRegistry = async (domain: string = "osms"): Promise<RegistryResponse> => {
  const normalizedDomain = domain.trim().toLowerCase();
  if (!normalizedDomain) throw new Error("Не выбран домен реестра");
  const response = await authenticatedFetch(
    apiUrl(`/api/registry?domain=${encodeURIComponent(normalizedDomain)}`),
  );
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "Failed to fetch registry");
  }
  return response.json() as Promise<RegistryResponse>;
};

// ── Analytics ──────────────────────────────────────────────────────────────
export type AnalyticsMonthRow = { month: string; amount: number; count: number };
export type AnalyticsIndicatorRow = { indicator: string; amount: number; count: number };
export type AnalyticsClinicRow = { clinic_name: string; amount: number; count: number };

export type AnalyticsResponse = {
  job_id: number;
  kpi: {
    total_amount: number;
    total_risks: number;
    unique_clinics: number;
    critical_clinics: number;
    latest_date: string;
  };
  by_month: AnalyticsMonthRow[];
  by_indicator: AnalyticsIndicatorRow[];
  by_clinic: AnalyticsClinicRow[];
};

export const getAuthToken = () => {
  try {
    return localStorage.getItem(AUTH_TOKEN_KEY);
  } catch {
    return null;
  }
};

export const setAuthToken = (token: string) => {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
  window.dispatchEvent(new Event("batys-auth-changed"));
};

export const clearAuthToken = () => {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  window.dispatchEvent(new Event("batys-auth-changed"));
};

export const isAuthenticated = () => Boolean(getAuthToken());

export const login = async (username: string, password: string): Promise<LoginResponse> => {
  const response = await fetch(apiUrl("/api/auth/login"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error || "Не удалось выполнить вход");
  }

  const result = (await response.json()) as LoginResponse;
  setAuthToken(result.token);
  return result;
};

const authenticatedFetch = (input: RequestInfo | URL, init: RequestInit = {}) => {
  const headers = new Headers(init.headers);
  const token = getAuthToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  return fetch(input, { ...init, headers });
};

export const fetchAnalytics = async (domain: string = "osms"): Promise<AnalyticsResponse> => {
  const normalizedDomain = domain.trim().toLowerCase();
  if (!normalizedDomain) throw new Error("Не выбран домен аналитики");
  const response = await authenticatedFetch(
    apiUrl(`/api/analytics?domain=${encodeURIComponent(normalizedDomain)}`),
  );
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "Failed to fetch analytics");
  }
  return response.json() as Promise<AnalyticsResponse>;
};
