import type { ReactNode } from "react";

export type PageHeaderProps = {
  title: string;
  description?: string;
  icon?: any;
  iconColor?: string;
  badge?: string;
  badgeColor?: string;
  actions?: ReactNode;
  className?: string;
  // Kept for backward compatibility if older legacy callers pass them
  breadcrumbs?: any[];
  eyebrow?: string;
};

export function PageHeader({
  title,
  description,
  icon: Icon,
  iconColor = "bg-orange-50 text-[#ff6900]",
  badge,
  badgeColor = "bg-emerald-50 text-emerald-700 border-emerald-200/60",
  actions,
  className = "",
}: PageHeaderProps) {
  return (
    <div
      className={`bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 ${className}`}
    >
      <div className="flex items-center gap-4">
        {Icon && (
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-xs ${iconColor}`}
          >
            <Icon className="h-6 w-6" />
          </div>
        )}
        <div className="min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight font-headline">
              {title}
            </h1>
            {badge && (
              <span
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${badgeColor}`}
              >
                {badge}
              </span>
            )}
          </div>
          {description && (
            <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
              {description}
            </p>
          )}
        </div>
      </div>

      {actions && (
        <div className="flex flex-wrap items-center gap-2.5 shrink-0 self-start md:self-auto">
          {actions}
        </div>
      )}
    </div>
  );
}

export default PageHeader;
