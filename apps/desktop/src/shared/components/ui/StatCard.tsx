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
  return (
    <article className="stat-card">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[0.72rem] font-bold uppercase tracking-[0.16em] text-slate-500">
            {label}
          </p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
            {value}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          {icon ? <Icon name={icon} className="text-slate-400" /> : null}
          {delta ? <Chip variant={tone}>{delta}</Chip> : null}
        </div>
      </div>
      {hint ? <p className="field-help mt-4">{hint}</p> : null}
    </article>
  );
}