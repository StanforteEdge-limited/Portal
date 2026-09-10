import { useEffect, useState } from "react";
import { Button } from "@/shared";
import { versionService } from "@/lib/VersionService";

const POLL_INTERVAL_MS = 3 * 60 * 1000;
const RELOAD_FLAG = "se_version_reload";

export function AppVersion() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [newBuildVersion, setNewBuildVersion] = useState<string | null>(null);

  async function checkVersion() {
    const result = await versionService.checkForUpdates();
    if (result.hasUpdate) {
      setNewBuildVersion(result.latestVersion);
      setUpdateAvailable(true);
    } else {
      setNewBuildVersion(null);
      setUpdateAvailable(false);
    }
  }

  useEffect(() => {
    const handleForceUpdate = (event: Event) => {
      const customEvent = event as CustomEvent;
      const latestVersion = customEvent.detail?.latestVersion || null;
      setNewBuildVersion(latestVersion);
      setUpdateAvailable(true);
    };

    window.addEventListener("pwa-force-update", handleForceUpdate);

    if (import.meta.env.DEV) {
      return () => {
        window.removeEventListener("pwa-force-update", handleForceUpdate);
      };
    }

    const justReloaded = sessionStorage.getItem(RELOAD_FLAG);
    if (justReloaded) {
      sessionStorage.removeItem(RELOAD_FLAG);
      const timer = window.setTimeout(() => void checkVersion(), 10_000);
      const interval = window.setInterval(() => void checkVersion(), POLL_INTERVAL_MS);
      return () => {
        window.removeEventListener("pwa-force-update", handleForceUpdate);
        window.clearTimeout(timer);
        window.clearInterval(interval);
      };
    }

    void checkVersion();
    const timer = window.setInterval(() => void checkVersion(), POLL_INTERVAL_MS);
    return () => {
      window.removeEventListener("pwa-force-update", handleForceUpdate);
      window.clearInterval(timer);
    };
  }, []);

  if (!updateAvailable) return null;

  return (
    <div className="fixed bottom-3 right-3 z-[1100] w-64 rounded-2xl border border-slate-200 bg-white p-4 shadow-lg">
      <p className="text-sm font-semibold text-slate-800">New version available</p>
      {newBuildVersion && (
        <p className="mt-0.5 text-xs text-slate-500">
          Build {newBuildVersion} is ready
        </p>
      )}
      <Button
        size="sm"
        className="mt-3 w-full"
        onClick={() => {
          void versionService.applyUpdate(newBuildVersion);
        }}
      >
        Reload now
      </Button>
    </div>
  );
}
