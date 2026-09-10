import React, { Component, type ReactNode } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { ToastProvider } from "@/shared";
import App from "./App";
import { AuthProvider } from "@/shared/context/AuthProvider";
import { AppVersion } from "@/shared/components/AppVersion";
import "./styles.css";
import faviconUrl from "../../shared/assets/brand/stanforte-icon-white.png";

class AppErrorBoundary extends Component<{ children: ReactNode }, { crashed: boolean }> {
  state = { crashed: false };
  static getDerivedStateFromError() { return { crashed: true }; }
  componentDidCatch(error: unknown) { console.error("[AppErrorBoundary]", error); }
  render() {
    if (this.state.crashed) {
      return (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100vh", gap: "12px", fontFamily: "sans-serif", color: "#334155" }}>
          <p style={{ fontSize: "16px", fontWeight: 600 }}>Something went wrong.</p>
          <button type="button" onClick={() => window.location.reload()} style={{ padding: "8px 20px", borderRadius: "999px", background: "#1e293b", color: "#fff", border: "none", cursor: "pointer", fontSize: "14px" }}>
            Refresh page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const CHUNK_RELOAD_KEY = "__chunk_reload_once__";
const SW_CLEANUP_KEY = "__sw_cleanup_once__";

const shouldForceReloadOnChunkError = (message: string) => {
  const text = String(message || "").toLowerCase();
  return (
    text.includes("failed to fetch dynamically imported module") ||
    text.includes("dynamically imported module") ||
    text.includes("chunkloaderror") ||
    text.includes("loading css chunk")
  );
};

window.addEventListener("unhandledrejection", (event) => {
  const reasonText = String((event as PromiseRejectionEvent)?.reason || "");
  if (!shouldForceReloadOnChunkError(reasonText)) return;

  if (sessionStorage.getItem(CHUNK_RELOAD_KEY) === "1") {
    sessionStorage.removeItem(CHUNK_RELOAD_KEY);
    return;
  }
  sessionStorage.setItem(CHUNK_RELOAD_KEY, "1");
  window.location.reload();
});

window.addEventListener("error", (event) => {
  const message = String(event.message || "");
  if (!shouldForceReloadOnChunkError(message)) return;

  if (sessionStorage.getItem(CHUNK_RELOAD_KEY) === "1") {
    sessionStorage.removeItem(CHUNK_RELOAD_KEY);
    return;
  }
  sessionStorage.setItem(CHUNK_RELOAD_KEY, "1");
  window.location.reload();
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .getRegistrations()
      .then(async (registrations) => {
        if (!registrations.length) return;

        await Promise.all(registrations.map((registration) => registration.unregister()));

        if (typeof caches !== "undefined") {
          const keys = await caches.keys();
          await Promise.all(keys.map((key) => caches.delete(key)));
        }

        if (sessionStorage.getItem(SW_CLEANUP_KEY) === "1") {
          sessionStorage.removeItem(SW_CLEANUP_KEY);
          return;
        }

        sessionStorage.setItem(SW_CLEANUP_KEY, "1");
        window.location.reload();
      })
      .catch(() => undefined);
  });
}

const faviconLink =
  document.querySelector<HTMLLinkElement>("link[rel='icon']") ||
  document.querySelector<HTMLLinkElement>("link[rel='shortcut icon']");

if (faviconLink) {
  faviconLink.href = faviconUrl;
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <AppErrorBoundary>
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <AuthProvider>
          <ToastProvider>
            <App />
          </ToastProvider>
        </AuthProvider>
      </BrowserRouter>
    </AppErrorBoundary>
    <AppVersion />
  </React.StrictMode>,
);
