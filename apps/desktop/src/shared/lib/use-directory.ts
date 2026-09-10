import { resourceApi, hrApi, cacheStore } from "@/shared/lib/core";
import { useDirectory as useSharedDirectory } from "@stanforte/shared";
 
/**
 * Hook to provide cached access to organization, team, and employee directories.
 * PWA wrapper that injects local API instances into the shared logic.
 */
export function useDirectory() {
  return useSharedDirectory(cacheStore, {
    resource: resourceApi,
    hr: hrApi
  });
}
