import { useEffect, useRef, useState } from "react";
import { Button } from "@/shared";
import { versionService } from "@/lib/VersionService";

type BannerStatus = "idle" | "checking" | "available" | "reloading";

const CHECK_INTERVAL_MS = 5 * 60 * 1000;

export function UpdateBanner() {
  const [status, setStatus] = useState<BannerStatus>("idle");
  const [latestVersion, setLatestVersion] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    async function check() {
      const result = await versionService.checkForUpdates();
      if (result.hasUpdate) {
        setLatestVersion(result.latestVersion);
        setStatus("available");
      } else {
        setStatus("idle");
      }
    }

    check();
    intervalRef.current = setInterval(check, CHECK_INTERVAL_MS);

    const handleFocus = () => {
      if (document.visibilityState === "visible") check();
    };
    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleFocus);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleFocus);
    };
  }, []);

  if (status !== "available") return null;

  function handleReload() {
    setStatus("reloading");
    void versionService.applyUpdate(latestVersion);
  }

  return (
    <div className="fixed left-0 right-0 top-16 z-50 flex items-center justify-between bg-amber-50 border-b border-amber-200 px-4 py-2 shadow-sm">
      <div className="flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-amber-500" />
        <span className="text-sm font-medium text-amber-800">
          Build {latestVersion} is available
        </span>
      </div>
      <Button size="sm" onClick={handleReload}>
        Reload
      </Button>
    </div>
  );
}