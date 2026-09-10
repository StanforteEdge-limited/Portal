import { Icon, SectionCard } from "@/shared";
import { AccountShellPage } from "./page-helpers";
import { checkForUpdates } from "@/lib/tauri-bridge";

interface ChangelogSection {
  Added?: string[];
  Changed?: string[];
  Fixed?: string[];
  [key: string]: string[] | undefined;
}

interface ChangelogEntry {
  version: string;
  date: string;
  sections: ChangelogSection;
}

const APP_VERSION = (import.meta.env.VITE_APP_VERSION as string | undefined) ?? "—";
const BUILD_DATE = (import.meta.env.VITE_APP_BUILD_DATE as string | undefined) ?? "";
const DOWNLOAD_BASE = (import.meta.env.VITE_DOWNLOAD_BASE_URL as string | undefined) ?? "";

function parseChangelog(): ChangelogEntry[] {
  const raw = import.meta.env.VITE_CHANGELOG as string | undefined;
  if (!raw) return [];
  try {
    return JSON.parse(raw) as ChangelogEntry[];
  } catch {
    return [];
  }
}

const PLATFORMS: Array<{
  label: string;
  filename: (v: string) => string;
  icon: string;
}> = [
  {
    label: "macOS (Apple Silicon)",
    filename: (v) => `Stanforte.Portal_${v}_aarch64.dmg`,
    icon: "laptop_mac",
  },
  {
    label: "macOS (Intel)",
    filename: (v) => `Stanforte.Portal_${v}_x64.dmg`,
    icon: "laptop_mac",
  },
  {
    label: "Windows",
    filename: (v) => `Stanforte.Portal_${v}_x64-setup.exe`,
    icon: "desktop_windows",
  },
  {
    label: "Linux (.AppImage)",
    filename: (v) => `Stanforte.Portal_${v}_amd64.AppImage`,
    icon: "terminal",
  },
];

export default function DownloadPage() {
  const entries = parseChangelog();

  return (
    <AccountShellPage
      activeLabel=""
      breadcrumbs={[
        { label: "Workspace", path: "/profile" },
        { label: "Download" },
      ]}
      eyebrow="Workspace > Download"
      title="Download Stanforte Portal"
      description="Get the native desktop app for a faster, offline-capable experience."
    >
      <div className="grid gap-6 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-8">
          <SectionCard
            title="Desktop App"
            description="Download the latest build for your operating system."
          >
            <div className="mb-6 flex items-center gap-3">
              <span className="flex h-2 w-2 rounded-full bg-emerald-500" />
              <span className="text-sm font-semibold text-slate-900">
                Version {APP_VERSION}
              </span>
              {BUILD_DATE ? (
                <span className="text-sm text-slate-400">— Built {BUILD_DATE}</span>
              ) : null}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {PLATFORMS.map((platform) => {
                const href = DOWNLOAD_BASE
                  ? `${DOWNLOAD_BASE}/v${APP_VERSION}/${platform.filename(APP_VERSION)}`
                  : undefined;
                return (
                  <a
                    key={platform.label}
                    href={href}
                    aria-disabled={!href}
                    className={[
                      "flex items-center gap-3 rounded-2xl border px-5 py-4 transition",
                      href
                        ? "cursor-pointer border-slate-200 bg-white hover:border-brand-900/30 hover:bg-slate-50"
                        : "pointer-events-none cursor-not-allowed border-slate-100 bg-slate-50 opacity-50",
                    ].join(" ")}
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-900/10 text-brand-900">
                      <Icon name={platform.icon} className="text-[20px]" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-900">
                        {platform.label}
                      </p>
                      {!href ? (
                        <p className="text-xs text-slate-400">Not yet available</p>
                      ) : (
                        <p className="truncate text-xs text-slate-400">
                          {platform.filename(APP_VERSION)}
                        </p>
                      )}
                    </div>
                    {href ? (
                      <Icon
                        name="download"
                        className="shrink-0 text-[20px] text-slate-400"
                      />
                    ) : null}
                  </a>
                );
              })}
            </div>

            <div className="mt-4 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => void checkForUpdates()}
                className="flex items-center gap-2 text-sm font-semibold text-brand-900 hover:underline"
              >
                <Icon name="system_update" className="text-[18px]" />
                Check for updates
              </button>
            </div>
          </SectionCard>

          <SectionCard
            title="Changelog"
            description="What changed in each release."
          >
            {entries.length === 0 ? (
              <p className="text-sm text-slate-400">No changelog available.</p>
            ) : (
              <div className="space-y-4">
                {entries.map((entry) => (
                  <div
                    key={entry.version}
                    className="rounded-2xl border border-slate-100 bg-slate-50 px-5 py-4"
                  >
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <span className="text-sm font-bold text-brand-900">
                        v{entry.version}
                      </span>
                      <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                        {entry.date}
                      </span>
                    </div>
                    {Object.entries(entry.sections).map(([section, items]) =>
                      items && items.length > 0 ? (
                        <div key={section} className="mb-2 last:mb-0">
                          <p className="mb-1 text-xs font-bold uppercase tracking-wider text-slate-400">
                            {section}
                          </p>
                          <ul className="space-y-1">
                            {items.map((item, i) => (
                              <li
                                key={i}
                                className="flex gap-2 text-sm text-slate-600"
                              >
                                <span className="shrink-0 text-slate-300">•</span>
                                {item}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : null
                    )}
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </div>

        <div className="space-y-6 lg:col-span-4">
          <SectionCard title="PWA (Web App)">
            <p className="text-sm leading-6 text-slate-600">
              The portal is also available as a Progressive Web App — no
              installation required. Open it in any modern browser and add it to
              your home screen.
            </p>
          </SectionCard>
        </div>
      </div>
    </AccountShellPage>
  );
}
