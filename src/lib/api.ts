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
  risks: RiskRecord[];
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

export const fetchRisks = async (indicator: string, jobId?: number): Promise<RisksResponse> => {
  const url = jobId
    ? apiUrl(`/api/risks/${indicator}?job_id=${jobId}`)
    : apiUrl(`/api/risks/${indicator}`);
  const response = await fetch(url);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "Failed to fetch risks");
  }

  return response.json() as Promise<RisksResponse>;
};