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
    sm: "sm:max-w-sm",
    md: "md:max-w-md",
    lg: "md:max-w-lg",
    xl: "lg:max-w-2xl",
    xxl: "lg:max-w-4xl",  
  }[size];

  const content = (
    <div className="fixed inset-0 z-[100] flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 top-0 bg-black/50" onClick={onClose} />

      {/* Panel - full width mobile, fixed max-width desktop */}
      <div
        className={`
          relative z-[101] w-full flex flex-col bg-white shadow-xl
          ${sizeClasses}
          max-h-[100dvh] lg:max-h-[calc(100vh-4rem)]
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
    <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b shrink-0 bg-white">
      <div className="min-w-0">
        <h2 className="text-base sm:text-lg font-semibold text-slate-900 truncate">{title}</h2>
        {subtitle && (
          <p className="text-sm text-slate-500 mt-0.5 truncate">{subtitle}</p>
        )}
      </div>
      <button
        type="button"
        onClick={onClose}
        className="p-2 shrink-0 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
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
    <div className={`flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-4 sm:px-6 py-4 ${className}`}>
      {children}
    </div>
  );
}

type SlideOverFooterProps = {
  children: ReactNode;
};

export function SlideOverFooter({ children }: SlideOverFooterProps) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3 px-4 sm:px-6 py-3 sm:py-4 border-t bg-slate-50 shrink-0">
      {children}
    </div>
  );
}
