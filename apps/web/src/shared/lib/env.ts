export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() || "http://127.0.0.1:3000/v1";

const _appVersion = (import.meta.env.VITE_APP_VERSION as string | undefined)?.trim() || "0";
export const CACHE_PREFIX = `pwa2_cache:v${_appVersion}:`;
