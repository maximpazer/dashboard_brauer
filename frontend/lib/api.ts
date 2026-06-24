import type {
  Batch,
  ChatRequestBody,
  ChatResponseBody,
  DiagnoseRequestBody,
  DiagnosisOptions,
  Feature,
  GroupsSummary,
  MethodologyPayload,
  PredictResult,
} from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`API-Fehler ${res.status} bei ${path}`);
  return res.json() as Promise<T>;
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`API-Fehler ${res.status} bei ${path}`);
  return res.json() as Promise<T>;
}

export const api = {
  features: () => getJson<Feature[]>("/api/features"),
  groupsSummary: () => getJson<GroupsSummary>("/api/groups/summary"),
  predict: (features: Record<string, number>) =>
    postJson<PredictResult>("/api/predict", { features }),
  diagnosisOptions: () => getJson<DiagnosisOptions>("/api/diagnosis/options"),
  diagnose: (body: DiagnoseRequestBody) => postJson<PredictResult>("/api/diagnose", body),
  methodology: () => getJson<MethodologyPayload>("/api/methodology"),
  chat: (body: ChatRequestBody) => postJson<ChatResponseBody>("/api/chat", body),
  saveBatch: (inputs: Record<string, number>, note: string, label?: string) =>
    postJson<Batch>("/api/batches", { inputs, note, label }),
  batchesList: () => getJson<Batch[]>("/api/batches"),
  batchDetail: (id: string) => getJson<Batch>(`/api/batches/${id}`),
};
