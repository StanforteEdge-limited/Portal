import { IS_TAURI, checkTauriUpdate } from "./tauri-bridge";

export type VersionManifest = {
  app_version: string;
  build_version: string;
  built_at: string;
};

export type UpdateCheckResult = {
  hasUpdate: boolean;
  latestVersion: string | null;
  isTauri: boolean;
  tauriDownloadAndInstall?: () => Promise<void>;
};

class VersionService {
  private buildVersion = import.meta.env.VITE_BUILD_VERSION as string | undefined;
  private builtAt = import.meta.env.VITE_APP_BUILT_AT as string | undefined;

  private toComparableBuildVersion(value: string | null | undefined): number[] | null {
    const normalized = String(value ?? "").trim();
    if (!normalized || !/^\d+(?:\.\d+)*$/.test(normalized)) {
      return null;
    }
    return normalized.split(".").map((part) => Number(part));
  }

  public compareBuildVersions(current: string | null | undefined, latest: string | null | undefined): number {
    const currentParts = this.toComparableBuildVersion(current);
    const latestParts = this.toComparableBuildVersion(latest);
    if (!currentParts || !latestParts) return 0;
    const maxLength = Math.max(currentParts.length, latestParts.length);
    for (let index = 0; index < maxLength; index += 1) {
      const currentValue = currentParts[index] ?? 0;
      const latestValue = latestParts[index] ?? 0;
      if (latestValue > currentValue) return 1;
      if (latestValue < currentValue) return -1;
    }
    return 0;
  }

  public async checkForUpdates(): Promise<UpdateCheckResult> {
    if (import.meta.env.DEV) {
      return { hasUpdate: false, latestVersion: null, isTauri: false };
    }

    if (IS_TAURI) {
      try {
        const info = await checkTauriUpdate();
        if (info && info.available) {
          return {
            hasUpdate: true,
            latestVersion: info.version ?? null,
            isTauri: true,
            tauriDownloadAndInstall: info.downloadAndInstall,
          };
        }
      } catch (error) {
        console.error("[VersionService] Tauri update check failed:", error);
      }
      return { hasUpdate: false, latestVersion: null, isTauri: true };
    }

    let hasUpdate = false;
    let latestVersion: string | null = null;

    // Phase 1: Local version.json check
    try {
      const res = await fetch(`/version.json?t=${Date.now()}`, {
        cache: "no-store",
      });
      if (res.ok) {
        const payload = (await res.json()) as VersionManifest;
        const versionComparison = this.compareBuildVersions(this.buildVersion, payload.build_version);
        const hasNewerBuild = versionComparison > 0;
        const shouldUseBuiltAtFallback = versionComparison === 0 && !this.toComparableBuildVersion(this.buildVersion);
        const hasNewerBuiltAt = Boolean(
          shouldUseBuiltAtFallback &&
          payload.built_at &&
          this.builtAt &&
          payload.built_at !== this.builtAt
        );

        if (hasNewerBuild || hasNewerBuiltAt) {
          hasUpdate = true;
          latestVersion = payload.build_version;
        }
      }
    } catch (error) {
      console.warn("[VersionService] Web asset version check failed:", error);
    }

    // Phase 2: Central API check
    try {
      const apiBase = import.meta.env.VITE_API_BASE_URL || "/v1";
      const apiRes = await fetch(`${apiBase}/version?platform=pwa&module=portal`, {
        cache: "no-store",
      });
      if (apiRes.ok) {
        const apiPayload = (await apiRes.json()) as {
          version: string;
          minVersion: string;
          forceUpdate: boolean;
          releaseNotes: string[];
        };

        const minComparison = this.compareBuildVersions(this.buildVersion, apiPayload.minVersion);
        const belowMin = minComparison > 0;

        const versionComparison = this.compareBuildVersions(this.buildVersion, apiPayload.version);
        const hasNewerVersion = versionComparison > 0;

        if (belowMin || hasNewerVersion || apiPayload.forceUpdate) {
          hasUpdate = true;
          if (!latestVersion || this.compareBuildVersions(latestVersion, apiPayload.version) > 0) {
            latestVersion = apiPayload.version;
          }
        }
      }
    } catch (error) {
      console.warn("[VersionService] Central API version check failed:", error);
    }

    return { hasUpdate, latestVersion, isTauri: false };
  }

  public async applyUpdate(latestVersion?: string | null): Promise<void> {
    const RELOAD_FLAG = "se_version_reload";
    if (latestVersion) {
      sessionStorage.setItem(RELOAD_FLAG, latestVersion);
    } else {
      sessionStorage.setItem(RELOAD_FLAG, "pending");
    }

    // Deletes all cache entries using the browser Cache API
    try {
      if (typeof caches !== "undefined") {
        const keys = await caches.keys();
        await Promise.all(keys.map((key) => caches.delete(key)));
      }
    } catch (error) {
      console.error("[VersionService] Failed to clean Cache API:", error);
    }

    // Unregisters all Service Workers
    try {
      if ("serviceWorker" in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map((registration) => registration.unregister()));
      }
    } catch (error) {
      console.error("[VersionService] Failed to unregister service workers:", error);
    }

    // Delays for browser cleanup, then forces a page reload
    setTimeout(() => {
      window.location.reload();
    }, 500);
  }
}

export const versionService = new VersionService();
