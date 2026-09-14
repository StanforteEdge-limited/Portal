import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
} from "react";
import { applyBrandTheme, getBrandTheme } from "@stanforte/shared";
import {
  getWorkspaceProfile,
  type WorkspaceProfile,
} from "@/shared/api/workspace-api";
import { useCachedQuery } from "@/shared/lib/core";

type BrandingContextValue = {
  logoUrl: string | null;
};

const BrandingContext = createContext<BrandingContextValue>({ logoUrl: null });

export function BrandingProvider({ children }: { children: ReactNode }) {
  const { data: profile } = useCachedQuery<WorkspaceProfile>(
    "branding:profile",
    () => getWorkspaceProfile(),
  );

  const org = useMemo(() => {
    const orgs = profile?.organizations ?? [];
    return (
      orgs.find((o) => o.id === (profile?.primary_organization_id ?? null)) ??
      orgs[0] ??
      null
    );
  }, [profile]);

  useEffect(() => {
    if (!org) return;
    applyBrandTheme(getBrandTheme(org.theme));
  }, [org]);

  const value = useMemo(
    () => ({ logoUrl: org?.logo_url ?? null }),
    [org],
  );

  return (
    <BrandingContext.Provider value={value}>
      {children}
    </BrandingContext.Provider>
  );
}

export function useOrgBranding() {
  return useContext(BrandingContext);
}