import type { ReactNode } from "react";
import { hasAnyPermission } from "@stanforte/shared";
import { useAuth } from "@/shared/context/AuthProvider";

type SectionCardProps = {
  title?: string;
  description?: string;
  action?: ReactNode;
  className?: string;
  children: ReactNode;
  requiredPermissions?: string[];
};

export function SectionCard({
  title,
  description,
  action,
  className,
  children,
  requiredPermissions,
}: SectionCardProps) {
  const { user } = useAuth();
  if (requiredPermissions?.length && !hasAnyPermission(user, requiredPermissions)) {
    return null;
  }
  return (
    <section className={["section-card p-5 sm:p-6 mt-6", className].filter(Boolean).join(" ")}>
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          {title ? (
            <>
              <h2 className="font-headline text-lg font-semibold tracking-tight text-slate-950">
                {title}
              </h2>
              {description ? (
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                  {description}
                </p>
              ) : null}
            </>
          ) : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {children}
    </section>
  );
}