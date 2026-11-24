import { useState, useEffect, useCallback } from "react";

export type PresenceStatus = "online" | "away" | "busy" | "offline";

export interface StatusOption {
  id: PresenceStatus;
  label: string;
  dotColor: string;
  badgeBg: string;
  textColor: string;
  description: string;
}

export const PRESENCE_STATUS_OPTIONS: StatusOption[] = [
  {
    id: "online",
    label: "Online",
    dotColor: "bg-emerald-500",
    badgeBg: "bg-emerald-50 text-emerald-700 border-emerald-200/70 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60",
    textColor: "text-emerald-600 dark:text-emerald-400",
    description: "Available",
  },
  {
    id: "away",
    label: "Away",
    dotColor: "bg-amber-500",
    badgeBg: "bg-amber-50 text-amber-700 border-amber-200/70 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60",
    textColor: "text-amber-600 dark:text-amber-400",
    description: "Away",
  },
  {
    id: "busy",
    label: "Busy",
    dotColor: "bg-rose-500",
    badgeBg: "bg-rose-50 text-rose-700 border-rose-200/70 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/60",
    textColor: "text-rose-600 dark:text-rose-400",
    description: "Do not disturb",
  },
  {
    id: "offline",
    label: "Offline",
    dotColor: "bg-neutral-400",
    badgeBg: "bg-neutral-100 text-neutral-600 border-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:border-neutral-700",
    textColor: "text-neutral-500 dark:text-neutral-400",
    description: "Offline",
  },
];

const PRESENCE_EVENT = "portal-user-presence-change";
const STORAGE_KEY = "portal_user_presence_status";

export function getSavedUserStatus(): PresenceStatus {
  if (typeof window === "undefined") return "online";
  const saved = localStorage.getItem(STORAGE_KEY) as PresenceStatus;
  if (saved && ["online", "away", "busy", "offline"].includes(saved)) {
    return saved;
  }
  return "online";
}

/**
 * Hook to read and set the current user's live presence status.
 */
export function useUserPresence() {
  const [status, setStatusState] = useState<PresenceStatus>(getSavedUserStatus);

  useEffect(() => {
    const handler = (e: Event) => {
      const next = (e as CustomEvent<PresenceStatus>).detail;
      if (next) setStatusState(next);
    };
    window.addEventListener(PRESENCE_EVENT, handler);
    return () => window.removeEventListener(PRESENCE_EVENT, handler);
  }, []);

  const setStatus = useCallback((next: PresenceStatus) => {
    localStorage.setItem(STORAGE_KEY, next);
    setStatusState(next);
    window.dispatchEvent(
      new CustomEvent<PresenceStatus>(PRESENCE_EVENT, { detail: next })
    );
  }, []);

  const currentConfig =
    PRESENCE_STATUS_OPTIONS.find((o) => o.id === status) ||
    PRESENCE_STATUS_OPTIONS[0];

  return {
    status,
    setStatus,
    currentConfig,
    options: PRESENCE_STATUS_OPTIONS,
  };
}
