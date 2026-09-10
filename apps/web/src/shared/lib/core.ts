import {
  createAuthApi,
  createHrApi,
  createResourceApi,
  createPolicyApi,
  createDocumentApi,
  createAttendanceApi,
  createWorkApi,
  createRequestApi,
  createAdminUsersApi,
  createFinanceApi,
  createProcurementApi,
  createMailApi,
  createCacheStore,
  createHttpClient,
  createSessionStorage,
  useCachedQuery as useSharedCachedQuery,
  useDirectory as useSharedDirectory,
} from "@stanforte/shared";
import { API_BASE_URL, CACHE_PREFIX } from "@/shared/lib/env";

export const authSession = createSessionStorage("pwa2_auth");

export const httpRequest = createHttpClient({
  apiBaseUrl: API_BASE_URL,
  session: authSession,
});

export const authApi = createAuthApi(httpRequest);
export const hrApi = createHrApi(httpRequest);
export const resourceApi = createResourceApi(httpRequest);
export const policyApi = createPolicyApi(httpRequest);
export const documentApi = createDocumentApi(httpRequest);
export const attendanceApi = createAttendanceApi(httpRequest);
export const workApi = createWorkApi(httpRequest);
export const requestApi = createRequestApi(httpRequest);
export const adminUsersApi = createAdminUsersApi(httpRequest);
export const financeApi = createFinanceApi(httpRequest);
export const procurementApi = createProcurementApi(httpRequest);
export const mailApi = createMailApi(httpRequest);
export const cacheStore = createCacheStore(CACHE_PREFIX);

export const useCachedQuery = <T,>(
  key: string,
  fetcher: () => Promise<T>,
  options?: {
    ttlMs?: number;
    storage?: "memory" | "local";
    revalidateOnMount?: boolean;
  }
) => useSharedCachedQuery(cacheStore, key, fetcher, options);

export { useDirectory } from "./use-directory";
