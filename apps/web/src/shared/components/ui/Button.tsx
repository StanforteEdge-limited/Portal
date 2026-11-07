import type { ButtonHTMLAttributes, ReactNode } from "react";
import { hasAnyPermission } from "@stanforte/shared";
import { useAuth } from "@/shared/context/AuthProvider";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: ReactNode;
  requiredPermissions?: string[];
};

const base =
  "inline-flex items-center justify-center rounded-xl font-bold transition focus:outline-none focus:ring-2 focus:ring-orange-500/20 disabled:cursor-not-allowed disabled:opacity-50";

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-[#ff6900] text-white shadow-md shadow-orange-500/20 hover:bg-[#ea580c] hover:shadow-orange-500/30",
  secondary:
    "border border-slate-200 bg-white text-slate-800 hover:bg-slate-50 shadow-sm",
  ghost: "bg-transparent text-slate-700 hover:bg-slate-100",
  danger: "bg-rose-600 text-white hover:bg-rose-700 shadow-sm",
};

const sizes: Record<ButtonSize, string> = {
  sm: "px-3.5 py-1.5 text-xs",
  md: "px-4 py-2 text-xs sm:text-sm",
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  requiredPermissions,
  ...props
}: ButtonProps) {
  const { user } = useAuth();
  if (requiredPermissions?.length && !hasAnyPermission(user, requiredPermissions)) {
    return null;
  }
  return (
    <button
      className={[base, variants[variant], sizes[size], className].filter(Boolean).join(" ")}
      {...props}
    >
      {children}
    </button>
  );
}
