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
  breadcrumbs?: any[];
  eyebrow?: string;
};

export function PageHeader({
  title,
  description,
  actions,
  className = "",
}: PageHeaderProps) {
  return (
    <header
      className={`flex flex-col md:flex-row md:items-end justify-between gap-4 pb-5 mb-6 border-b border-neutral-900/[0.08] ${className}`}
    >
      <div className="min-w-0 space-y-1">
        <h1 className="text-2xl sm:text-[28px] leading-tight font-medium text-neutral-900 tracking-tight font-headline">
          {title}
        </h1>
        {description ? (
          <p className="text-sm text-neutral-500 max-w-2xl leading-relaxed">{description}</p>
        ) : null}
      </div>

      {actions ? (
        <div className="flex flex-wrap items-center gap-2 shrink-0 self-start md:self-auto">
          {actions}
        </div>
      ) : null}
    </header>
  );
}

export default PageHeader;
