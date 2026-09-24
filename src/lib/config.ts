const configuredApiUrl = import.meta.env.VITE_API_URL?.trim();

export const API_BASE_URL = (
  configuredApiUrl === "*" ? "" : configuredApiUrl || "http://localhost:3000"
).replace(/\/$/, "");

export const WS_BASE_URL = API_BASE_URL.replace(/^http:/, "ws:").replace(/^https:/, "wss:");

export const apiUrl = (path: string) =>
  `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;

export const websocketUrl = (path = "/ws") =>
  `${WS_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
