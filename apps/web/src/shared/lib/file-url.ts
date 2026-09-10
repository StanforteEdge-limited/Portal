import { API_BASE_URL } from "./env";

const apiOrigin = API_BASE_URL.replace(/\/v\d+.*$/, "");

export function getFileViewUrl(file: {
  public_url?: string | null;
  storage_path?: string | null;
}): string | null {
  if (file.public_url) return file.public_url;
  if (file.storage_path) return `${apiOrigin}/${file.storage_path}`;
  return null;
}
