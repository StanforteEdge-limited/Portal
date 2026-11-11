import { Chip } from "./Chip";
import { Icon } from "./Icon";
import { hasAnyPermission } from "@stanforte/shared";
import { useAuth } from "@/shared/context/AuthProvider";

type StatCardProps = {
  label: string;
  value: string;
  delta?: string;
  tone?: "neutral" | "success" | "warning" | "pending" | "danger";
  hint?: string;
  icon?: string;
  requiredPermissions?: string[];
};

export function StatCard({
  label,
  value,
  delta,
  tone = "neutral",
  hint,
  icon,
  requiredPermissions,
}: StatCardProps) {
  const { user } = useAuth();
  if (requiredPermissions?.length && !hasAnyPermission(user, requiredPermissions)) {
    return null;
  }

  const toneBg =
    tone === "success"
      ? "bg-emerald-50 text-emerald-600"
      : tone === "warning" || tone === "pending"
      ? "bg-amber-50 text-amber-600"
      : tone === "danger"
      ? "bg-rose-50 text-rose-600"
      : "bg-blue-50 text-blue-600";

  return (
    <article className="bg-white rounded-2xl border border-slate-100 shadow-2xs hover:border-slate-200/80 transition-all p-5 flex flex-col justify-between space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs font-semibold text-slate-500">{label}</p>
          <p className="text-2xl font-bold tracking-tight text-slate-900 font-headline">{value}</p>
        </div>
        {icon ? (
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-2xs ${toneBg}`}>
            <Icon name={icon} className="text-[20px]" />
          </div>
        ) : null}
      </div>

      {(delta || hint) ? (
        <div className="flex items-center gap-2 pt-2 border-t border-slate-100/80">
          {delta ? <Chip variant={tone}>{delta}</Chip> : null}
          {hint ? <p className="text-[11px] text-slate-400 truncate">{hint}</p> : null}
        </div>
      ) : null}
    </article>
  );
}
