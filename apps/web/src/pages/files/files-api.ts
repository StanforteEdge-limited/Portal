import { httpRequest } from "@/shared/lib/core";

export type FileAssetRecord = {
  id: string;
  file_name: string;
  mime_type: string | null;
  file_size: number | null;
  storage_path: string;
  public_url: string | null;
  usage?: {
    attached: boolean;
    request_items: number;
    pv_evidence: number;
    retirement_refs: number;
  };
};

export async function listFileAssets(params?: {
  search?: string;
  include_usage?: boolean;
  page?: number;
  per_page?: number;
  uploaded_by?: string;
  file_type?: "images" | "videos" | "documents";
  attached?: boolean;
}) {
  const query = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined || value === null || value === "") return;
      query.set(key, String(value));
    });
  }

  const suffix = query.toString() ? `?${query.toString()}` : "";
  const response = await httpRequest<any>(`/files${suffix}`);
  const rows = (response as any)?.data?.items ?? [];

  return rows.map(
    (row: any) =>
      ({
        id: String(row.id),
        file_name: String(row.file_name ?? row.fileName ?? ""),
        mime_type: (row.mime_type ?? row.mimeType ?? null) as string | null,
        file_size:
          row.file_size !== undefined && row.file_size !== null
            ? Number(row.file_size)
            : row.fileSize !== undefined && row.fileSize !== null
              ? Number(row.fileSize)
              : null,
        storage_path: String(row.storage_path ?? row.storagePath ?? ""),
        public_url: (row.public_url ?? row.publicUrl ?? null) as string | null,
        usage: row.usage
          ? {
              attached: Boolean(row.usage.attached),
              request_items: Number(row.usage.request_items ?? 0),
              pv_evidence: Number(row.usage.pv_evidence ?? 0),
              retirement_refs: Number(row.usage.retirement_refs ?? 0),
            }
          : undefined,
      }) satisfies FileAssetRecord
  );
}

export async function getFileAsset(id: string): Promise<FileAssetRecord | null> {
  try {
    const res = await httpRequest<any>(`/files/${id}`);
    const row = (res as any)?.data ?? res;
    if (!row?.id) return null;
    return {
      id: row.id,
      file_name: row.file_name ?? row.fileName ?? "",
      mime_type: row.mime_type ?? row.mimeType ?? null,
      file_size: row.file_size ?? row.fileSize ?? null,
      storage_path: row.storage_path ?? row.storagePath ?? "",
      public_url: row.public_url ?? row.publicUrl ?? null,
    };
  } catch {
    return null;
  }
}

export async function getFileAssets(ids: string[]): Promise<FileAssetRecord[]> {
  if (!ids.length) return [];
  const results = await Promise.all(ids.map((id) => getFileAsset(id)));
  return results.filter((r): r is FileAssetRecord => r !== null);
}

export async function deleteFileAsset(id: string): Promise<void> {
  await httpRequest<unknown>(`/files/${id}`, { method: "DELETE" });
}

export async function uploadFileAsset(
  file: File,
  payload?: { organization_id?: string; metadata?: Record<string, unknown> }
) {
  const form = new FormData();
  form.append("file", file);
  if (payload?.organization_id) form.append("organization_id", payload.organization_id);
  if (payload?.metadata) form.append("metadata_json", JSON.stringify(payload.metadata));

  const res = await httpRequest<any>("/files/upload", {
    method: "POST",
    body: form,
  });
  return (res?.data ?? res) as FileAssetRecord;
}
