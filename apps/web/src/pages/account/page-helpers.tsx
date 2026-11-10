import type { ReactNode } from "react";
import { PortalLayout } from "@/components/layout/PortalLayout";
import { ChevronRight } from "lucide-react";
import { Link } from "@/shared/router-adapter";

export function AccountShellPage({
  activeLabel,
  breadcrumbs,
  eyebrow,
  title,
  description,
  children,
}: {
  activeLabel: string;
  breadcrumbs?: Array<{ label: string; path?: string }>;
  eyebrow?: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <PortalLayout activeNav={activeLabel}>
      <div className="space-y-6">
        <div>
          {breadcrumbs && breadcrumbs.length > 0 && (
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-1">
              {breadcrumbs.map((b, i) => (
                <span key={b.label} className="flex items-center gap-2">
                  {i > 0 && <ChevronRight className="h-3 w-3 text-slate-400" />}
                  {b.path ? (
                    <Link to={b.path} className="hover:text-slate-800 transition">
                      {b.label}
                    </Link>
                  ) : (
                    <span className={i === breadcrumbs.length - 1 ? "text-[#ff6900]" : ""}>
                      {b.label}
                    </span>
                  )}
                </span>
              ))}
            </div>
          )}
          <h1 className="text-2xl font-black text-slate-900 tracking-tight font-headline">
            {title}
          </h1>
          {description && (
            <p className="text-xs text-slate-500 mt-0.5">{description}</p>
          )}
        </div>

        {children}
      </div>
    </PortalLayout>
  );
}
