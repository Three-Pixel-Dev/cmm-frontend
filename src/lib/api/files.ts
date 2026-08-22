import { API_BASE, type ApiEnvelope } from "./http";

export interface UploadedFile {
  id: string;
  url: string;
}

export async function uploadFile(file: File): Promise<UploadedFile> {
  const fd = new FormData();
  fd.append("file", file);
  const base = API_BASE ? `${API_BASE}/api/v1` : "/api/v1";

  let res: Response;
  try {
    res = await fetch(`${base}/files/`, { method: "POST", body: fd, credentials: "include" });
  } catch {
    throw new Error(
      `Cannot reach the API${API_BASE ? ` at ${API_BASE}` : ""}. Is the gateway running?`,
    );
  }

  const json = (await res.json().catch(() => null)) as ApiEnvelope<UploadedFile> | null;
  if (!res.ok || !json?.success || !json.data?.url) {
    throw new Error(json?.error || json?.message || `Upload failed (${res.status})`);
  }
  return { id: String(json.data.id), url: json.data.url };
}
