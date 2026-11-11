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

export type UploadFileInput =
  | File
  | {
      file: File;
      name?: string;
      category?: string;
      access_level?: string;
      organization_id?: string;
      metadata?: Record<string, unknown>;
    };

/**
 * Uploads any file directly to object storage (S3/Contabo) using a presigned URL.
 * No file bytes are uploaded to or handled by the Fastify backend server.
 * Supports all file formats: images, documents, spreadsheets, videos, archives, etc.
 */
export async function uploadFileAsset(
  input: UploadFileInput,
  legacyPayload?: { organization_id?: string; metadata?: Record<string, unknown> }
): Promise<FileAssetRecord> {
  const file: File = input instanceof File ? input : input.file;
  const payload = input instanceof File ? legacyPayload : input;

  // 1. Obtain presigned upload URL from backend API (fast metadata-only call)
  const presignRes = await httpRequest<{
    key: string;
    url: string;
    fields?: Record<string, string>;
    public_url?: string;
  }>("/files/presign-upload", {
    method: "POST",
    body: {
      file_name: file.name,
      mime_type: file.type || "application/octet-stream",
      file_size: file.size,
      expires_in_seconds: 600,
    },
  });

  const presignData = (presignRes as any)?.data ?? presignRes;
  const { key, url, public_url } = presignData;
  if (!url) {
    throw new Error("Unable to obtain presigned upload URL from storage service");
  }

  // 2. Upload file directly from browser to S3 / Object Storage using HTTP PUT
  const uploadResponse = await fetch(url, {
    method: "PUT",
    body: file,
    headers: file.type ? { "Content-Type": file.type } : { "Content-Type": "application/octet-stream" },
  });

  if (!uploadResponse.ok) {
    throw new Error(`Direct upload failed (${uploadResponse.status} ${uploadResponse.statusText})`);
  }

  // 3. Register file asset record in backend PostgreSQL database
  const attachRes = await httpRequest<any>("/files/attach", {
    method: "POST",
    body: {
      storage_path: key,
      file_url: public_url || url.split("?")[0],
      file_name: file.name,
      mime_type: file.type || "application/octet-stream",
      file_size: file.size,
      organization_id: (payload as any)?.organization_id,
      metadata: (payload as any)?.metadata,
    },
  });

  const row = (attachRes as any)?.data ?? attachRes;
  return {
    id: String(row.id),
    file_name: String(row.file_name ?? row.fileName ?? file.name),
    mime_type: (row.mime_type ?? row.mimeType ?? file.type) as string | null,
    file_size: Number(row.file_size ?? row.fileSize ?? file.size),
    storage_path: String(row.storage_path ?? row.storagePath ?? key),
    public_url: (row.public_url ?? row.publicUrl ?? public_url ?? null) as string | null,
  };
}
