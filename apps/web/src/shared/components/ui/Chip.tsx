import type { ReactNode } from "react";

type ChipVariant = "neutral" | "success" | "warning" | "pending" | "danger";

type ChipProps = {
  variant?: ChipVariant;
  className?: string;
  children: ReactNode;
};

const styles: Record<ChipVariant, string> = {
  neutral: "bg-neutral-100 text-neutral-700 border border-neutral-900/[0.06]",
  success: "bg-emerald-50 text-emerald-700 border border-emerald-600/15",
  warning: "bg-amber-50 text-amber-800 border border-amber-600/15",
  pending: "bg-neutral-100 text-neutral-700 border border-neutral-900/[0.08]",
  danger: "bg-red-50 text-red-700 border border-red-600/15",
};

export function Chip({ variant = "neutral", className = "", children }: ChipProps) {
  return (
    <span
      className={[
        "inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium transition-colors duration-150",
        styles[variant],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <span
        className={[
          "w-1.5 h-1.5 rounded-full shrink-0",
          variant === "success"
            ? "bg-emerald-600"
            : variant === "warning"
            ? "bg-amber-600"
            : variant === "pending"
            ? "bg-neutral-500"
            : variant === "danger"
            ? "bg-red-600"
            : "bg-neutral-400",
        ].join(" ")}
      />
      {children}
    </span>
  );
}
