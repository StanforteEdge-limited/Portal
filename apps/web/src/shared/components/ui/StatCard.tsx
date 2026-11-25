import { Chip } from "./Chip";
import { hasAnyPermission } from "@stanforte/shared";
import { useAuth } from "@/shared/context/AuthProvider";

type StatCardProps = {
  label: string;
  value: string;
  delta?: string;
  tone?: "neutral" | "success" | "warning" | "pending" | "danger";
  hint?: string;
  /** Retained for caller compatibility; stat cards render numbers without decorative icon tiles. */
  icon?: string;
  requiredPermissions?: string[];
};

export function StatCard({
  label,
  value,
  delta,
  tone = "neutral",
  hint,
  requiredPermissions,
}: StatCardProps) {
  const { user } = useAuth();
  if (requiredPermissions?.length && !hasAnyPermission(user, requiredPermissions)) {
    return null;
  }

  return (
    <article className="bg-white dark:bg-neutral-900 rounded-xl sm:rounded-2xl border border-neutral-900/[0.08] dark:border-neutral-800 shadow-xs p-3.5 sm:p-5 flex flex-col justify-between gap-2 sm:gap-3">
      <div className="space-y-1 sm:space-y-2">
        <p className="text-[11px] sm:text-xs font-normal text-neutral-500 truncate">{label}</p>
        <p className="text-xl sm:text-[28px] leading-tight sm:leading-none font-medium tracking-tight text-neutral-900 dark:text-white font-headline tabular-nums">
          {value}
        </p>
      </div>

      {delta || hint ? (
        <div className="flex items-center gap-1.5 sm:gap-2 pt-1.5 sm:pt-2 border-t border-neutral-900/[0.06] dark:border-neutral-800">
          {delta ? <Chip variant={tone}>{delta}</Chip> : null}
          {hint ? <p className="text-[10px] sm:text-xs text-neutral-500 truncate">{hint}</p> : null}
        </div>
      ) : null}
    </article>
  );
}
