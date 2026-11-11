import { ReactNode } from "react";
import { createPortal } from "react-dom";

type SlideOverProps = {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  size?: "sm" | "md" | "lg" | "xl" | "xxl";
};

export function SlideOver({
  open,
  onClose,
  children,
  size = "lg",
}: SlideOverProps) {
  if (!open) return null;

  const sizeClasses = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-xl",
    xl: "max-w-2xl",
    xxl: "max-w-4xl",
  }[size];

  const content = (
    <div className="fixed inset-0 z-[100] flex justify-end overflow-hidden">
      {/* Backdrop with smooth blur */}
      <div
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity duration-300"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel - full height top-to-bottom grounded to screen edges */}
      <div
        className={`
          relative z-[101] w-full h-full h-[100dvh] max-h-screen flex flex-col bg-white shadow-2xl border-l border-slate-200
          ${sizeClasses}
          animate-in slide-in-from-right duration-200
        `}
      >
        {/* Inner container with overflow handling */}
        <div className="flex flex-col min-h-0 h-full overflow-hidden">
          {children}
        </div>
      </div>
    </div>
  );

  if (typeof document === "undefined") return content;
  return createPortal(content, document.body);
}

type SlideOverPanelProps = {
  children: ReactNode;
};

export function SlideOverPanel({ children }: SlideOverPanelProps) {
  return <div className="flex flex-col min-h-0 h-full">{children}</div>;
}

type SlideOverHeaderProps = {
  title: string;
  subtitle?: string;
  onClose: () => void;
};

export function SlideOverHeader({
  title,
  subtitle,
  onClose,
}: SlideOverHeaderProps) {
  return (
    <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200/80 bg-slate-50/80 shrink-0">
      <div className="min-w-0 pr-4">
        <h2 className="text-base sm:text-lg font-bold text-slate-900 font-headline truncate tracking-tight">
          {title}
        </h2>
        {subtitle && (
          <p className="text-xs text-slate-500 mt-0.5 truncate">{subtitle}</p>
        )}
      </div>
      <button
        type="button"
        onClick={onClose}
        className="p-1.5 shrink-0 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition"
        aria-label="Close panel"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

type SlideOverContentProps = {
  children: ReactNode;
  className?: string;
};

export function SlideOverContent({
  children,
  className = "",
}: SlideOverContentProps) {
  return (
    <div className={`flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-6 space-y-4 ${className}`}>
      {children}
    </div>
  );
}

type SlideOverFooterProps = {
  children: ReactNode;
  className?: string;
};

export function SlideOverFooter({ children, className = "" }: SlideOverFooterProps) {
  return (
    <div className={`flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50 shrink-0 ${className}`}>
      {children}
    </div>
  );
}
