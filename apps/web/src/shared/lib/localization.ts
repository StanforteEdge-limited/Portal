import { useState, useEffect } from "react";

export type TimeFormat = "12h" | "24h";
export type DateFormat = "DD/MM/YYYY" | "D MMM YYYY" | "YYYY-MM-DD" | "MM/DD/YYYY";
export type WeekStartsOn = "monday" | "sunday";

export interface LocalizationSettings {
  timezone: string;
  timeFormat: TimeFormat;
  dateFormat: DateFormat;
  weekStartsOn: WeekStartsOn;
  currency: string;
}

export const DEFAULT_LOCALIZATION_SETTINGS: LocalizationSettings = {
  timezone: "Africa/Lagos", // Default to Nigeria (WAT / UTC+1)
  timeFormat: "12h",       // Default to 12-hour AM/PM preferred by Nigerian users
  dateFormat: "DD/MM/YYYY", // Standard Nigerian & British format
  weekStartsOn: "monday",
  currency: "NGN",
};

export const COMMON_TIMEZONES = [
  { value: "Africa/Lagos", label: "Africa/Lagos (WAT, UTC+1) — Nigeria (Default)", offset: "UTC+1" },
  { value: "Africa/Accra", label: "Africa/Accra (GMT, UTC+0) — Ghana", offset: "UTC+0" },
  { value: "Africa/Nairobi", label: "Africa/Nairobi (EAT, UTC+3) — Kenya", offset: "UTC+3" },
  { value: "Africa/Johannesburg", label: "Africa/Johannesburg (SAST, UTC+2) — South Africa", offset: "UTC+2" },
  { value: "Europe/London", label: "Europe/London (GMT/BST, UTC+0/+1) — United Kingdom", offset: "UTC+0" },
  { value: "America/New_York", label: "America/New_York (EST/EDT, UTC-5/-4) — United States", offset: "UTC-5" },
  { value: "UTC", label: "UTC (Coordinated Universal Time)", offset: "UTC+0" },
];

export const TIME_FORMAT_OPTIONS: { value: TimeFormat; label: string; preview: string }[] = [
  { value: "12h", label: "12-hour with AM / PM (Recommended for Nigeria)", preview: "1:00 AM – 3:30 PM" },
  { value: "24h", label: "24-hour Military", preview: "01:00 – 15:30" },
];

export const DATE_FORMAT_OPTIONS: { value: DateFormat; label: string; preview: string }[] = [
  { value: "DD/MM/YYYY", label: "DD/MM/YYYY (Day/Month/Year — Standard Nigeria)", preview: "10/11/2026" },
  { value: "D MMM YYYY", label: "D MMM YYYY (Medium readable)", preview: "10 Nov 2026" },
  { value: "YYYY-MM-DD", label: "YYYY-MM-DD (ISO standard)", preview: "2026-11-10" },
  { value: "MM/DD/YYYY", label: "MM/DD/YYYY (US format)", preview: "11/10/2026" },
];

const STORAGE_KEY = "stanforte_localization_settings";

export function getLocalizationSettings(): LocalizationSettings {
  if (typeof window === "undefined") return DEFAULT_LOCALIZATION_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_LOCALIZATION_SETTINGS;
    const parsed = JSON.parse(raw);
    return {
      timezone: parsed.timezone || DEFAULT_LOCALIZATION_SETTINGS.timezone,
      timeFormat: parsed.timeFormat === "24h" ? "24h" : "12h",
      dateFormat: parsed.dateFormat || DEFAULT_LOCALIZATION_SETTINGS.dateFormat,
      weekStartsOn: parsed.weekStartsOn === "sunday" ? "sunday" : "monday",
      currency: parsed.currency || DEFAULT_LOCALIZATION_SETTINGS.currency,
    };
  } catch {
    return DEFAULT_LOCALIZATION_SETTINGS;
  }
}

export function saveLocalizationSettings(settings: Partial<LocalizationSettings>): LocalizationSettings {
  const current = getLocalizationSettings();
  const updated: LocalizationSettings = { ...current, ...settings };
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event("stanforte:localization_changed"));
  }
  return updated;
}

/**
 * Format a time string or Date object into the user's preferred time display.
 * Handles "09:00", "17:00", "09:00:00", ISO strings, or Date objects.
 */
export function formatDisplayTime(
  value?: string | Date | null,
  formatOverride?: TimeFormat
): string {
  if (!value) return "—";

  const settings = getLocalizationSettings();
  const use12Hour = (formatOverride ?? settings.timeFormat) === "12h";

  if (typeof value === "string") {
    const clean = value.trim();
    if (!clean) return "—";

    // Matches "09:00", "17:00:00", "9:30"
    const timeMatch = clean.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
    if (timeMatch) {
      const originalHours = parseInt(timeMatch[1], 10);
      const minutes = timeMatch[2];

      if (use12Hour) {
        const period = originalHours >= 12 ? "PM" : "AM";
        const displayHours = originalHours % 12 || 12;
        return `${displayHours}:${minutes} ${period}`;
      } else {
        return `${String(originalHours).padStart(2, "0")}:${minutes}`;
      }
    }

    // Already has AM/PM
    if (/am|pm/i.test(clean)) {
      if (!use12Hour) {
        // Convert "9:00 AM" or "5:00 PM" to 24-hour if requested
        const ampmMatch = clean.match(/^(\d{1,2}):(\d{2})\s*(am|pm)$/i);
        if (ampmMatch) {
          let h = parseInt(ampmMatch[1], 10);
          const m = ampmMatch[2];
          const isPM = ampmMatch[3].toLowerCase() === "pm";
          if (isPM && h < 12) h += 12;
          if (!isPM && h === 12) h = 0;
          return `${String(h).padStart(2, "0")}:${m}`;
        }
      }
      return clean;
    }
  }

  // Parse as Date
  const dateObj = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(dateObj.getTime())) return typeof value === "string" ? value : "—";

  try {
    return dateObj.toLocaleTimeString("en-US", {
      hour: use12Hour ? "numeric" : "2-digit",
      minute: "2-digit",
      hour12: use12Hour,
      timeZone: settings.timezone,
    });
  } catch {
    return dateObj.toLocaleTimeString("en-US", {
      hour: use12Hour ? "numeric" : "2-digit",
      minute: "2-digit",
      hour12: use12Hour,
    });
  }
}

/**
 * Format a Date or date string according to the configured format and timezone.
 */
export function formatDisplayDateLocalized(
  value?: string | Date | null,
  formatOverride?: DateFormat
): string {
  if (!value) return "—";

  const settings = getLocalizationSettings();
  const format = formatOverride ?? settings.dateFormat;
  const dateObj = typeof value === "string" ? new Date(value) : value;

  if (Number.isNaN(dateObj.getTime())) return typeof value === "string" ? value : "—";

  try {
    // Get year, month, day in target timezone
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: settings.timezone,
      year: "numeric",
      month: format === "D MMM YYYY" ? "short" : "2-digit",
      day: "2-digit",
    });

    const parts = formatter.formatToParts(dateObj);
    const day = parts.find((p) => p.type === "day")?.value || "";
    const month = parts.find((p) => p.type === "month")?.value || "";
    const year = parts.find((p) => p.type === "year")?.value || "";

    switch (format) {
      case "DD/MM/YYYY":
        return `${day}/${month}/${year}`;
      case "D MMM YYYY":
        return `${parseInt(day, 10)} ${month} ${year}`;
      case "YYYY-MM-DD":
        return `${year}-${month}-${day}`;
      case "MM/DD/YYYY":
        return `${month}/${day}/${year}`;
      default:
        return `${day}/${month}/${year}`;
    }
  } catch {
    return dateObj.toLocaleDateString();
  }
}

export const formatDisplayDate = formatDisplayDateLocalized;

/**
 * React hook for consuming and updating localization settings with live reactivity.
 */
export function useLocalization() {
  const [settings, setSettings] = useState<LocalizationSettings>(getLocalizationSettings());

  useEffect(() => {
    function handleChange() {
      setSettings(getLocalizationSettings());
    }

    window.addEventListener("stanforte:localization_changed", handleChange);
    window.addEventListener("storage", handleChange);
    return () => {
      window.removeEventListener("stanforte:localization_changed", handleChange);
      window.removeEventListener("storage", handleChange);
    };
  }, []);

  const update = (partial: Partial<LocalizationSettings>) => {
    const updated = saveLocalizationSettings(partial);
    setSettings(updated);
  };

  const formatTime = (val?: string | Date | null, override?: TimeFormat) =>
    formatDisplayTime(val, override ?? settings.timeFormat);

  const formatDate = (val?: string | Date | null, override?: DateFormat) =>
    formatDisplayDateLocalized(val, override ?? settings.dateFormat);

  return {
    settings,
    update,
    formatTime,
    formatDate,
    timezones: COMMON_TIMEZONES,
    timeFormatOptions: TIME_FORMAT_OPTIONS,
    dateFormatOptions: DATE_FORMAT_OPTIONS,
  };
}

