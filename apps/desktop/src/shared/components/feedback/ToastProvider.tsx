import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from "react";

type ToastTone = "success" | "warning" | "danger" | "info";

type ToastInput = {
  title?: string;
  message: string;
  tone?: ToastTone;
  durationMs?: number;
};

type ToastRecord = ToastInput & {
  id: number;
  tone: ToastTone;
};

type ToastContextValue = {
  showToast: (toast: ToastInput) => number;
  dismissToast: (id: number) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const toneClasses: Record<ToastTone, string> = {
  success: "border-success/20 bg-white text-slate-900",
  warning: "border-warning/20 bg-white text-slate-900",
  danger: "border-danger/20 bg-white text-slate-900",
  info: "border-brand-900/10 bg-white text-slate-900",
};

const toneAccentClasses: Record<ToastTone, string> = {
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
  info: "bg-brand-900",
};

export function ToastProvider({ children }: PropsWithChildren) {
  const [toasts, setToasts] = useState<ToastRecord[]>([]);
  const idRef = useRef(0);

  const dismissToast = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    ({ tone = "info", durationMs, ...toast }: ToastInput) => {
      const id = ++idRef.current;
      const nextToast: ToastRecord = { id, tone, ...toast };
      setToasts((current) => [...current, nextToast]);

      const timeout = durationMs ?? (tone === "danger" ? 7000 : 4200);
      if (timeout > 0) {
        window.setTimeout(() => {
          dismissToast(id);
        }, timeout);
      }

      return id;
    },
    [dismissToast]
  );

  const value = useMemo(() => ({ showToast, dismissToast }), [dismissToast, showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="pointer-events-none fixed right-4 top-4 z-[120] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-3"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={[
              "pointer-events-auto overflow-hidden rounded-[24px] border shadow-card backdrop-blur-xl",
              toneClasses[toast.tone],
            ].join(" ")}
            role="status"
          >
            <div className={["h-1 w-full", toneAccentClasses[toast.tone]].join(" ")} />
            <div className="flex items-start gap-3 px-4 py-4">
              <div className={["mt-1 h-2.5 w-2.5 shrink-0 rounded-full", toneAccentClasses[toast.tone]].join(" ")} />
              <div className="min-w-0 flex-1">
                {toast.title ? <p className="text-sm font-semibold text-slate-950">{toast.title}</p> : null}
                <p className={toast.title ? "mt-1 text-sm text-slate-600" : "text-sm text-slate-700"}>{toast.message}</p>
              </div>
              <button
                type="button"
                onClick={() => dismissToast(toast.id)}
                className="rounded-full px-2 py-1 text-xs font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
              >
                Dismiss
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider.");
  }
  return context;
}
