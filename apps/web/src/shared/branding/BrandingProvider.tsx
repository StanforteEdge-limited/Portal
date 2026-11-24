import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { applyBrandTheme, getBrandTheme } from "@stanforte/shared";
import {
  getWorkspaceProfile,
  type WorkspaceProfile,
} from "@/shared/api/workspace-api";
import { getPresignedFileUrl } from "@/pages/files/files-api";
import { useCachedQuery } from "@/shared/lib/core";
import { hydrateThemeFromProfile } from "@/shared/lib/theme";

export const DEFAULT_PRIMARY_COLOR = "#ff6900";
const PRIMARY_COLOR_STORAGE_KEY = "stanforte.brand_primary_color";
const BRANDING_EVENT = "stanforte:branding-updated";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;

type BrandingOverride = {
  primaryColor?: string | null;
  logoFileId?: string | null;
  logoUrl?: string | null;
  brandName?: string | null;
};

type BrandingContextValue = {
  logoUrl: string | null;
  primaryColor: string;
  brandName: string | null;
};

const BrandingContext = createContext<BrandingContextValue>({
  logoUrl: null,
  primaryColor: DEFAULT_PRIMARY_COLOR,
  brandName: null,
});

function parseHex(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  return [
    parseInt(clean.slice(0, 2), 16),
    parseInt(clean.slice(2, 4), 16),
    parseInt(clean.slice(4, 6), 16),
  ];
}

function clampByte(v: number): number {
  return Math.max(0, Math.min(255, Math.round(v)));
}

function mixRgb(
  a: [number, number, number],
  b: [number, number, number],
  weightB: number,
): [number, number, number] {
  const wA = 1 - weightB;
  return [
    clampByte(a[0] * wA + b[0] * weightB),
    clampByte(a[1] * wA + b[1] * weightB),
    clampByte(a[2] * wA + b[2] * weightB),
  ];
}

function rgbToHex([r, g, b]: [number, number, number]): string {
  return (
    "#" +
    [r, g, b]
      .map((c) => c.toString(16).padStart(2, "0"))
      .join("")
  );
}

function rgbTriplet([r, g, b]: [number, number, number]): string {
  return `${r} ${g} ${b}`;
}

export function normalizeHexColor(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return HEX_COLOR_RE.test(trimmed) ? trimmed.toLowerCase() : null;
}

export function applyPrimaryColor(color: string | null | undefined): string {
  const normalized = normalizeHexColor(color) ?? DEFAULT_PRIMARY_COLOR;
  if (typeof document === "undefined") return normalized;

  const base = parseHex(normalized);
  const white: [number, number, number] = [255, 255, 255];
  const black: [number, number, number] = [0, 0, 0];

  const hover = mixRgb(base, black, 0.12);
  const dark = mixRgb(base, black, 0.28);

  const root = document.documentElement.style;
  root.setProperty("--primary-color", normalized);
  root.setProperty("--primary-hover", rgbToHex(hover));
  root.setProperty("--primary-dark", rgbToHex(dark));
  root.setProperty("--primary-rgb", rgbTriplet(base));
  root.setProperty("--primary-soft", `rgba(${base[0]}, ${base[1]}, ${base[2]}, 0.12)`);
  root.setProperty("--primary-ring", `rgba(${base[0]}, ${base[1]}, ${base[2]}, 0.18)`);

  // Keep Tailwind brand-* palette tokens synchronized with the custom primary color
  root.setProperty("--brand-50", rgbTriplet(mixRgb(base, white, 0.92)));
  root.setProperty("--brand-100", rgbTriplet(mixRgb(base, white, 0.84)));
  root.setProperty("--brand-200", rgbTriplet(mixRgb(base, white, 0.68)));
  root.setProperty("--brand-300", rgbTriplet(mixRgb(base, white, 0.48)));
  root.setProperty("--brand-400", rgbTriplet(mixRgb(base, white, 0.24)));
  root.setProperty("--brand-500", rgbTriplet(base));
  root.setProperty("--brand-600", rgbTriplet(hover));
  root.setProperty("--brand-700", rgbTriplet(dark));
  root.setProperty("--brand-800", rgbTriplet(mixRgb(base, black, 0.42)));
  root.setProperty("--brand-900", rgbTriplet(mixRgb(base, black, 0.56)));

  try {
    if (normalized === DEFAULT_PRIMARY_COLOR) {
      window.localStorage.removeItem(PRIMARY_COLOR_STORAGE_KEY);
    } else {
      window.localStorage.setItem(PRIMARY_COLOR_STORAGE_KEY, normalized);
    }
  } catch {
    // ignore storage errors
  }

  return normalized;
}

export function dispatchBrandingUpdate(override: BrandingOverride) {
  if (override.primaryColor !== undefined) {
    applyPrimaryColor(override.primaryColor);
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent<BrandingOverride>(BRANDING_EVENT, { detail: override }));
  }
}

// Hydrate cached primary color immediately on module load to prevent flash of default orange
if (typeof window !== "undefined") {
  try {
    const cached = window.localStorage.getItem(PRIMARY_COLOR_STORAGE_KEY);
    if (cached && HEX_COLOR_RE.test(cached)) {
      applyPrimaryColor(cached);
    }
  } catch {
    // ignore
  }
}

export function BrandingProvider({ children }: { children: ReactNode }) {
  const { data: profile, refetch } = useCachedQuery<WorkspaceProfile>(
    "branding:profile",
    () => getWorkspaceProfile(),
  );
  const [override, setOverride] = useState<BrandingOverride | null>(null);
  const [resolvedLogoUrl, setResolvedLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    const onUpdate = (ev: Event) => {
      const detail = (ev as CustomEvent<BrandingOverride>).detail;
      if (detail) {
        setOverride((prev) => ({ ...prev, ...detail }));
      }
      void refetch();
    };
    window.addEventListener(BRANDING_EVENT, onUpdate);
    return () => window.removeEventListener(BRANDING_EVENT, onUpdate);
  }, [refetch]);

  const org = useMemo(() => {
    const orgs = profile?.organizations ?? [];
    return (
      orgs.find((o) => o.id === (profile?.primary_organization_id ?? null)) ??
      orgs[0] ??
      null
    );
  }, [profile]);

  const effectivePrimaryColor = useMemo(() => {
    if (override?.primaryColor !== undefined) {
      return normalizeHexColor(override.primaryColor) ?? DEFAULT_PRIMARY_COLOR;
    }
    return (
      normalizeHexColor(org?.primary_color) ??
      normalizeHexColor(profile?.tenant_primary_color) ??
      DEFAULT_PRIMARY_COLOR
    );
  }, [override?.primaryColor, org?.primary_color, profile?.tenant_primary_color]);

  const effectiveLogoFileId = useMemo(() => {
    if (override?.logoFileId !== undefined) return override.logoFileId;
    return org?.logo_file_id ?? profile?.tenant_logo_file_id ?? null;
  }, [override?.logoFileId, org?.logo_file_id, profile?.tenant_logo_file_id]);

  const effectiveRawLogoUrl = useMemo(() => {
    if (override?.logoUrl !== undefined) return override.logoUrl;
    return org?.logo_url ?? profile?.tenant_logo_url ?? null;
  }, [override?.logoUrl, org?.logo_url, profile?.tenant_logo_url]);

  const effectiveBrandName = useMemo(() => {
    if (override?.brandName !== undefined) return override.brandName;
    return profile?.tenant_name ?? org?.name ?? null;
  }, [override?.brandName, profile?.tenant_name, org?.name]);

  useEffect(() => {
    if (!profile) return;
    hydrateThemeFromProfile(profile);
  }, [profile]);

  useEffect(() => {
    if (org?.theme && !org.primary_color && !profile?.tenant_primary_color) {
      applyBrandTheme(getBrandTheme(org.theme));
    }
    applyPrimaryColor(effectivePrimaryColor);
  }, [org?.theme, org?.primary_color, profile?.tenant_primary_color, effectivePrimaryColor]);

  useEffect(() => {
    let cancelled = false;
    async function resolveLogo() {
      if (effectiveLogoFileId && UUID_RE.test(effectiveLogoFileId)) {
        try {
          const url = await getPresignedFileUrl(effectiveLogoFileId, {
            inline: true,
            expiresInSeconds: 3600,
          });
          if (!cancelled && url) {
            setResolvedLogoUrl(url);
            return;
          }
        } catch {
          // fall back to raw URL
        }
      }
      if (!cancelled) {
        setResolvedLogoUrl(effectiveRawLogoUrl || null);
      }
    }
    void resolveLogo();
    return () => {
      cancelled = true;
    };
  }, [effectiveLogoFileId, effectiveRawLogoUrl]);

  const value = useMemo<BrandingContextValue>(
    () => ({
      logoUrl: resolvedLogoUrl,
      primaryColor: effectivePrimaryColor,
      brandName: effectiveBrandName,
    }),
    [resolvedLogoUrl, effectivePrimaryColor, effectiveBrandName],
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
