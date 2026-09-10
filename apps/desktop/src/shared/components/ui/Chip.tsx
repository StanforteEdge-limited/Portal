import type { ReactNode } from "react";

type ChipVariant = "neutral" | "success" | "warning" | "pending" | "danger";

type ChipProps = {
  variant?: ChipVariant;
  className?: string;
  children: ReactNode;
};

const styles: Record<ChipVariant, string> = {
  neutral: "bg-slate-100 text-slate-600",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  pending: "bg-pending/10 text-slate-700",
  danger: "bg-danger/10 text-danger",
};

export function Chip({ variant = "neutral", className = "", children }: ChipProps) {
  return (
    <span
      className={[
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold",
        styles[variant],
        className,
      ].filter(Boolean).join(" ")}
    >
      {children}
    </span>
  );
}
