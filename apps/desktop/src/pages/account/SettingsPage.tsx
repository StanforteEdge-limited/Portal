import { useState } from "react";
import { Button, SectionCard, StatCard, TextField } from "@/shared";
import { changeWorkspacePassword } from "@/shared/api/workspace-api";
import { AccountShellPage } from "./page-helpers";
import { versionService } from "@/lib/VersionService";

type CheckStatus = "idle" | "checking" | "up-to-date" | "update-available";

const appVersion = import.meta.env.VITE_APP_VERSION as string;
const buildVersion = import.meta.env.VITE_BUILD_VERSION as string;
const builtAt = import.meta.env.VITE_APP_BUILT_AT as string | undefined;

function formatBuiltAt(iso: string | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function SettingsPage() {
  const [passwordForm, setPasswordForm] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [checkStatus, setCheckStatus] = useState<CheckStatus>("idle");
  const [latestBuild, setLatestBuild] = useState<string | null>(null);

  async function handleChangePassword() {
    if (!passwordForm.current_password || !passwordForm.new_password || !passwordForm.confirm_password) {
      setNotice("Fill all password fields.");
      return;
    }
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      setNotice("New password and confirmation do not match.");
      return;
    }
    try {
      setSaving(true);
      setNotice(null);
      await changeWorkspacePassword(passwordForm);
      setPasswordForm({ current_password: "", new_password: "", confirm_password: "" });
      setNotice("Password updated successfully.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to update password.");
    } finally {
      setSaving(false);
    }
  }

  async function handleCheckForUpdates() {
    setCheckStatus("checking");
    try {
      const result = await versionService.checkForUpdates();
      if (result.hasUpdate) {
        setLatestBuild(result.latestVersion ?? null);
        setCheckStatus("update-available");

        if (result.isTauri && result.tauriDownloadAndInstall) {
          const confirmed = window.confirm(
            `Update ${result.latestVersion} is available. Install now?`
          );
          if (confirmed) {
            await result.tauriDownloadAndInstall();
          }
        } else {
          window.dispatchEvent(new CustomEvent("pwa-force-update", { detail: { latestVersion: result.latestVersion } }));
        }
      } else {
        setLatestBuild(null);
        setCheckStatus("up-to-date");
      }
    } catch {
      setCheckStatus("idle");
    }
  }

  return (
    <AccountShellPage
      activeLabel="Settings"
      breadcrumbs={[
        { label: "Profile", path: "/profile" },
        { label: "Settings" },
      ]}
      eyebrow=""
      title="Settings"
      description="Manage security, notifications, and workspace defaults in one place."
    >
      <div className="grid gap-6 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-8">
          <SectionCard title="Notification Preferences" description="This reflects the same preference categories we'll later bind to persistent settings.">
            <div className="grid gap-3">
              {[
                ["In-app notifications", "Receive live alerts inside the workspace."],
                ["Email notifications", "Get important updates in your inbox."],
                ["Approval reminders", "Receive nudges when a request waits on you."],
                ["Attendance reminders", "Get reminders for onsite days and attendance actions."],
              ].map(([label, text]) => (
                <label key={label} className="flex items-center justify-between rounded-[18px] border border-slate-100 bg-slate-50 px-4 py-3">
                  <span>
                    <span className="block text-sm font-semibold text-slate-800">{label}</span>
                    <span className="mt-1 block text-sm text-slate-500">{text}</span>
                  </span>
                  <input type="checkbox" defaultChecked className="h-5 w-5 rounded border-slate-300 text-brand-900 focus:ring-brand-900" />
                </label>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Security" description="Ported from the existing profile/security flow.">
            {notice ? (
              <div className="mb-4 rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                {notice}
              </div>
            ) : null}
            <div className="grid gap-4 md:grid-cols-2">
              <TextField
                label="Current Password"
                type="password"
                value={passwordForm.current_password}
                onChange={(event) => setPasswordForm((prev) => ({ ...prev, current_password: event.target.value }))}
              />
              <div />
              <TextField
                label="New Password"
                type="password"
                value={passwordForm.new_password}
                onChange={(event) => setPasswordForm((prev) => ({ ...prev, new_password: event.target.value }))}
              />
              <TextField
                label="Confirm New Password"
                type="password"
                value={passwordForm.confirm_password}
                onChange={(event) => setPasswordForm((prev) => ({ ...prev, confirm_password: event.target.value }))}
              />
            </div>
            <Button className="mt-4" onClick={() => void handleChangePassword()} disabled={saving}>
              {saving ? "Updating..." : "Update Password"}
            </Button>
          </SectionCard>

          <SectionCard title="System" description="Portal version information.">
            <div className="grid gap-3">
              {[
                ["App Version", appVersion],
                ["Build Version", buildVersion],
                ["Built", formatBuiltAt(builtAt)],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="flex items-center justify-between rounded-[18px] border border-slate-100 bg-slate-50 px-4 py-3"
                >
                  <span className="text-sm text-slate-500">{label}</span>
                  <span className="text-sm font-semibold text-slate-800">{value}</span>
                </div>
              ))}
            </div>

            <div className="mt-4 flex items-center justify-between gap-3">
              <div>
                {checkStatus === "up-to-date" && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                    Up to date
                  </span>
                )}
                {checkStatus === "update-available" && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                    {latestBuild ? `Build ${latestBuild} available` : "Update available"}
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                {checkStatus === "update-available" && (
                  <Button size="sm" onClick={() => void versionService.applyUpdate(latestBuild)}>
                    Reload
                  </Button>
                )}
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => void handleCheckForUpdates()}
                  disabled={checkStatus === "checking"}
                >
                  {checkStatus === "checking" ? "Checking..." : "Check for updates"}
                </Button>
              </div>
            </div>
          </SectionCard>
        </div>

        <div className="space-y-6 lg:col-span-4">
          <StatCard label="Security" value="Active" tone="success" hint="Password change is now wired to the API." />
          <StatCard label="Portal Build" value={buildVersion} tone="neutral" hint="Auto-increments on every server deploy." />
        </div>
      </div>
    </AccountShellPage>
  );
}
