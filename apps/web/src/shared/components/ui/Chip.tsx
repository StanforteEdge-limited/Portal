import type { ReactNode } from "react";

type ChipVariant = "neutral" | "success" | "warning" | "pending" | "danger";

type ChipProps = {
  variant?: ChipVariant;
  className?: string;
  children: ReactNode;
};

const styles: Record<ChipVariant, string> = {
  neutral: "bg-slate-100 text-slate-700 border border-slate-200/60",
  success: "bg-emerald-50 text-emerald-700 border border-emerald-200/60",
  warning: "bg-amber-50 text-amber-700 border border-amber-200/60",
  pending: "bg-blue-50 text-blue-700 border border-blue-200/60",
  danger: "bg-rose-50 text-rose-700 border border-rose-200/60",
};

export function Chip({ variant = "neutral", className = "", children }: ChipProps) {
  return (
    <span
      className={[
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold transition-colors",
        styles[variant],
        className,
      ].filter(Boolean).join(" ")}
    >
      <span
        className={[
          "w-1.5 h-1.5 rounded-full shrink-0",
          variant === "success"
            ? "bg-emerald-500"
            : variant === "warning"
            ? "bg-amber-500"
            : variant === "pending"
            ? "bg-blue-500"
            : variant === "danger"
            ? "bg-rose-500"
            : "bg-slate-400",
        ].join(" ")}
      />
      {children}
    </span>
  );
}
