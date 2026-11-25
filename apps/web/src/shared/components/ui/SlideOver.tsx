import { ReactNode, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

type SlideOverProps = {
  open?: boolean;
  isOpen?: boolean;
  onClose: () => void;
  children: ReactNode;
  size?: "sm" | "md" | "lg" | "xl" | "xxl";
  ariaLabel?: string;
};

export function SlideOver({
  open,
  isOpen,
  onClose,
  children,
  size = "lg",
  ariaLabel = "Panel",
}: SlideOverProps) {
  const isVisible = open !== undefined ? open : isOpen !== undefined ? isOpen : true;
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isVisible || typeof document === "undefined") return;
    const prevBodyOverflow = document.body.style.overflow;
    const prevHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = prevBodyOverflow;
      document.documentElement.style.overflow = prevHtmlOverflow;
    };
  }, [isVisible, onClose]);

  if (!isVisible) return null;

  const sizeClasses = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-xl",
    xl: "max-w-2xl",
    xxl: "max-w-4xl",
  }[size];

  const content = (
    <div className="fixed inset-0 z-[100] flex justify-end overflow-hidden overscroll-none">
      <div
        className="fixed inset-0 bg-neutral-950/40 transition-opacity duration-200 touch-none"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        className={`relative z-[101] w-full h-[100dvh] max-h-screen flex flex-col bg-white shadow-soft border-l border-neutral-900/[0.08] overscroll-contain ${sizeClasses}`}
      >
        <div className="flex flex-col min-h-0 h-full overflow-hidden overscroll-contain">
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
  return <div className="flex flex-col min-h-0 h-full overscroll-contain">{children}</div>;
}

type SlideOverHeaderProps = {
  title: string;
  subtitle?: string;
  onClose: () => void;
};

export function SlideOverHeader({ title, subtitle, onClose }: SlideOverHeaderProps) {
  return (
    <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-900/[0.08] bg-[#fafafa] shrink-0">
      <div className="min-w-0 pr-4">
        <h2 className="text-base font-medium text-neutral-900 font-headline truncate tracking-tight">
          {title}
        </h2>
        {subtitle ? <p className="text-xs text-neutral-500 mt-0.5 truncate">{subtitle}</p> : null}
      </div>
      <button
        type="button"
        onClick={onClose}
        className="min-h-[44px] min-w-[44px] -mr-2 p-2.5 shrink-0 inline-flex items-center justify-center text-neutral-500 hover:text-neutral-900 hover:bg-neutral-200/60 rounded-lg transition-colors duration-150"
        aria-label="Close panel"
      >
        <X className="w-5 h-5" strokeWidth={1.5} />
      </button>
    </div>
  );
}

type SlideOverContentProps = {
  children: ReactNode;
  className?: string;
};

export function SlideOverContent({ children, className = "" }: SlideOverContentProps) {
  return (
    <div className={`flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain p-6 space-y-4 ${className}`}>
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
    <div className={`flex items-center justify-end gap-2 px-6 py-4 border-t border-neutral-900/[0.08] bg-[#fafafa] shrink-0 ${className}`}>
      {children}
    </div>
  );
}
