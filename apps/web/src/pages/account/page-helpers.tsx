import type { ReactNode } from "react";
import { PageHeader, type BreadcrumbItem } from "@/shared";
import { roleLabel, userDisplayName } from "@stanforte/shared";
import { AppShell } from "@/shared/components/layout/AppShell";
import { useAuth } from "@/shared/context/AuthProvider";
import { buildAppNavigation, buildAppMobileNav } from "@/shared/navigation";

export function AccountShellPage({
  activeLabel,
  breadcrumbs,
  eyebrow,
  title,
  description,
  children,
}: {
  activeLabel: string;
  breadcrumbs?: BreadcrumbItem[];
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  const { user } = useAuth();

  return (
    <AppShell
      navigation={buildAppNavigation()}
      activeLabel={activeLabel}
      user={{
        name: userDisplayName(user),
        role: roleLabel(user?.roles?.[0] || "staff"),
      }}
      mobileNav={buildAppMobileNav("Profile")}
    >
      <div className="hidden lg:block">
        <PageHeader
          breadcrumbs={breadcrumbs}
          eyebrow={eyebrow}
          title={title}
          description={description}
        />
        {children}
      </div>

      <div className="space-y-4 lg:hidden">
        <div className="pt-1">
          <p className="text-[0.72rem] font-bold uppercase tracking-[0.18em] text-slate-500">
            {eyebrow}
          </p>
          <h1 className="page-title mt-2 text-[clamp(1.7rem,7vw,2.2rem)]">
            {title}
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-slate-500">
            {description}
          </p>
        </div>
        {children}
      </div>
    </AppShell>
  );
}
