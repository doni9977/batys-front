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

export const uploadFile = async (file: File, endpoint: string = "/api/upload"): Promise<UploadResponse> => {
  const formData = new FormData();
  const fieldName = endpoint.includes("inpatient") ? "files" : "file";
  formData.append(fieldName, file);

  const response = await fetch(endpoint, {
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
  const response = await fetch(`/api/risk-jobs/${jobId}`);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "Status check failed");
  }

  return response.json() as Promise<RiskJobStatus>;
};

export const fetchRisks = async (indicator: string, jobId?: number, page: number = 1, limit: number = 100): Promise<RisksResponse> => {
  const url = new URL(`/api/risks/${indicator}`, window.location.origin);
  if (jobId) url.searchParams.append("job_id", jobId.toString());
  url.searchParams.append("page", page.toString());
  url.searchParams.append("limit", limit.toString());

  const response = await fetch(url.pathname + url.search);

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
  const url = new URL("/api/registry", window.location.origin);
  url.searchParams.append("domain", domain);
  const response = await fetch(url.pathname + url.search);
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

export const fetchAnalytics = async (domain: string = "osms"): Promise<AnalyticsResponse> => {
  const url = new URL("/api/analytics", window.location.origin);
  url.searchParams.append("domain", domain);
  const response = await fetch(url.pathname + url.search);
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "Failed to fetch analytics");
  }
  return response.json() as Promise<AnalyticsResponse>;
};