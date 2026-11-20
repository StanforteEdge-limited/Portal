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
    <article className="bg-white rounded-2xl border border-neutral-900/[0.08] shadow-xs p-5 flex flex-col justify-between gap-3">
      <div className="space-y-2">
        <p className="text-xs font-normal text-neutral-500">{label}</p>
        <p className="text-[28px] leading-none font-medium tracking-tight text-neutral-900 font-headline tabular-nums">
          {value}
        </p>
      </div>

      {delta || hint ? (
        <div className="flex items-center gap-2 pt-2 border-t border-neutral-900/[0.06]">
          {delta ? <Chip variant={tone}>{delta}</Chip> : null}
          {hint ? <p className="text-xs text-neutral-500 truncate">{hint}</p> : null}
        </div>
      ) : null}
    </article>
  );
}
