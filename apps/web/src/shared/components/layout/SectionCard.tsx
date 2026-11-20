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
    <section
      className={[
        "bg-white rounded-2xl border border-neutral-900/[0.08] shadow-xs p-5 sm:p-6 mt-6",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {title || action ? (
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            {title ? (
              <h2 className="text-base font-medium tracking-tight text-neutral-900 font-headline">
                {title}
              </h2>
            ) : null}
            {description ? (
              <p className="mt-1 max-w-2xl text-sm text-neutral-500">{description}</p>
            ) : null}
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}
