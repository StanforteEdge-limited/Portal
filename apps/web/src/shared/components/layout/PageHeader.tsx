import type { ReactNode } from "react";
import { Breadcrumbs, type BreadcrumbItem } from "./Breadcrumbs";

type PageHeaderProps = {
  breadcrumbs?: BreadcrumbItem[];
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
};

export function PageHeader({
  breadcrumbs,
  eyebrow,
  title,
  description,
  actions,
}: PageHeaderProps) {
  return (
    <section className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="max-w-3xl">
        {breadcrumbs?.length ? (
          <div className="mb-1.5">
            <Breadcrumbs items={breadcrumbs} />
          </div>
        ) : null}
        {eyebrow ? (
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#ff6900] mb-1">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight font-headline">
          {title}
        </h1>
        {description ? (
          <p className="mt-1 text-xs sm:text-sm text-slate-500 max-w-2xl">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-3 self-start sm:self-auto">{actions}</div> : null}
    </section>
  );
}
