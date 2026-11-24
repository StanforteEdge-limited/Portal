import { useCallback, useEffect, useState } from "react";
import { updateWorkspaceProfile } from "@/shared/api/workspace-api";

export type ThemeMode = "light" | "dark" | "system";

const USER_STORAGE_KEY = "portal_theme_mode";
const TENANT_STORAGE_KEY = "portal_tenant_default_theme_mode";
const THEME_EVENT = "portal-theme-mode-change";

function parseThemeMode(value: unknown): ThemeMode | null {
  return value === "light" || value === "dark" || value === "system" ? value : null;
}

export function getSavedUserThemeMode(): ThemeMode | null {
  if (typeof window === "undefined") return null;
  return parseThemeMode(localStorage.getItem(USER_STORAGE_KEY));
}

export function getSavedTenantDefaultThemeMode(): ThemeMode | null {
  if (typeof window === "undefined") return null;
  return parseThemeMode(localStorage.getItem(TENANT_STORAGE_KEY));
}

export function getEffectiveThemeMode(
  userMode: ThemeMode | null = getSavedUserThemeMode(),
  tenantDefault: ThemeMode | null = getSavedTenantDefaultThemeMode(),
): ThemeMode {
  return userMode ?? tenantDefault ?? "light";
}

export function resolveIsDark(mode: ThemeMode): boolean {
  if (mode === "dark") return true;
  if (mode === "light") return false;
  if (typeof window === "undefined") return false;
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
}

export function applyThemeMode(mode: ThemeMode): void {
  if (typeof document === "undefined") return;
  const isDark = resolveIsDark(mode);
  document.documentElement.classList.toggle("dark", isDark);
  document.documentElement.style.colorScheme = isDark ? "dark" : "light";
}

function broadcastThemeState(userMode: ThemeMode | null, tenantDefault: ThemeMode | null): void {
  if (typeof window === "undefined") return;
  if (userMode) {
    localStorage.setItem(USER_STORAGE_KEY, userMode);
  } else {
    localStorage.removeItem(USER_STORAGE_KEY);
  }
  if (tenantDefault) {
    localStorage.setItem(TENANT_STORAGE_KEY, tenantDefault);
  } else {
    localStorage.removeItem(TENANT_STORAGE_KEY);
  }
  const effective = getEffectiveThemeMode(userMode, tenantDefault);
  applyThemeMode(effective);
  window.dispatchEvent(
    new CustomEvent<{ userMode: ThemeMode | null; tenantDefault: ThemeMode | null }>(THEME_EVENT, {
      detail: { userMode, tenantDefault },
    }),
  );
}

/** Called when `/profile` loads so user preference and tenant global default take effect immediately. */
export function hydrateThemeFromProfile(profile?: {
  settings?: { theme_mode?: ThemeMode | null; [key: string]: unknown } | null;
  tenant_default_theme_mode?: ThemeMode | null;
} | null): void {
  if (!profile) return;
  const userMode = parseThemeMode(profile.settings?.theme_mode);
  const tenantDefault = parseThemeMode(profile.tenant_default_theme_mode);
  broadcastThemeState(userMode, tenantDefault);
}

/** Called when a tenant owner updates the workspace's global default theme. */
export function setTenantDefaultThemeMode(next: ThemeMode | null): void {
  broadcastThemeState(getSavedUserThemeMode(), parseThemeMode(next));
}

export function useThemeMode() {
  const [userMode, setUserModeState] = useState<ThemeMode | null>(getSavedUserThemeMode);
  const [tenantDefault, setTenantDefaultState] = useState<ThemeMode | null>(
    getSavedTenantDefaultThemeMode,
  );

  const mode = getEffectiveThemeMode(userMode, tenantDefault);
  const [isDark, setIsDark] = useState<boolean>(() => resolveIsDark(mode));

  useEffect(() => {
    applyThemeMode(mode);
    setIsDark(resolveIsDark(mode));

    if (mode !== "system" || typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      applyThemeMode("system");
      setIsDark(mq.matches);
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [mode]);

  useEffect(() => {
    const onExternalChange = (e: Event) => {
      const detail = (e as CustomEvent<{ userMode: ThemeMode | null; tenantDefault: ThemeMode | null }>).detail;
      if (!detail) return;
      setUserModeState(detail.userMode);
      setTenantDefaultState(detail.tenantDefault);
    };
    window.addEventListener(THEME_EVENT, onExternalChange);
    return () => window.removeEventListener(THEME_EVENT, onExternalChange);
  }, []);

  const setMode = useCallback(
    (next: ThemeMode | null) => {
      const parsed = parseThemeMode(next);
      broadcastThemeState(parsed, getSavedTenantDefaultThemeMode());
      setUserModeState(parsed);
      void updateWorkspaceProfile({ settings: { theme_mode: parsed } }).catch(() => {
        // Keep local preference active even if network fails temporarily
      });
    },
    [],
  );

  const toggleLightDark = useCallback(() => {
    setMode(isDark ? "light" : "dark");
  }, [isDark, setMode]);

  return {
    mode,
    userMode,
    tenantDefault,
    isDark,
    setMode,
    toggleLightDark,
  };
}
