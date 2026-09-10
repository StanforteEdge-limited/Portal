import { useState } from "react";
import { NavLink } from "react-router-dom";
import { Button, Chip, EmptyState, Icon, SectionCard, StatCard } from "@/shared";
import { formatRelativeTime } from "@stanforte/shared";
import { useCachedQuery } from "@/shared/lib/core";
import {
  getWorkspaceUnreadNotificationCount,
  listWorkspaceNotifications,
  markAllWorkspaceNotificationsRead,
  markWorkspaceNotificationRead,
} from "@/shared/api/workspace-api";
import { AccountShellPage } from "./page-helpers";

export default function NotificationsPage() {
  const {
    data: notifications,
    loading,
    error,
    refetch,
  } = useCachedQuery("workspace:notifications", () => listWorkspaceNotifications(), {
    ttlMs: 1000 * 60,
    storage: "memory",
  });
  const { data: unreadCount } = useCachedQuery("workspace:notifications:unread-count", () => getWorkspaceUnreadNotificationCount(), {
    ttlMs: 1000 * 30,
    storage: "memory",
  });
  const [busyId, setBusyId] = useState<string>("");

  async function markRead(id: string) {
    try {
      setBusyId(id);
      await markWorkspaceNotificationRead(id);
      await refetch();
    } finally {
      setBusyId("");
    }
  }

  async function markAllRead() {
    try {
      setBusyId("all");
      await markAllWorkspaceNotificationsRead();
      await refetch();
    } finally {
      setBusyId("");
    }
  }

  return (
    <AccountShellPage
      activeLabel=""
      breadcrumbs={[
        { label: "Workspace", path: "/profile" },
        { label: "Notifications" },
      ]}
      eyebrow="Workspace > Notifications"
      title="Notifications"
      description="Review the updates, reminders, and workflow events that need your attention."
    >
      <div className="grid gap-6 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-8">
          <SectionCard
            title="Inbox"
            description="Live notifications from the existing workspace service."
            action={
              <Button variant="secondary" size="sm" onClick={() => void markAllRead()} disabled={busyId === "all"}>
                {busyId === "all" ? "Marking..." : "Mark all read"}
              </Button>
            }
          >
            {loading ? <div className="text-sm text-slate-500">Loading notifications...</div> : null}
            {error ? <div className="text-sm text-danger">{error}</div> : null}
            {!loading && !(notifications ?? []).length ? (
              <EmptyState title="No notifications yet" description="New updates from requests, attendance, and profile actions will show here." />
            ) : null}
            <div className="space-y-3">
              {(notifications ?? []).map((item: Record<string, any>) => {
                const inner = (
                  <article className="flex items-start gap-4 rounded-[22px] border border-slate-100 bg-white px-5 py-4 shadow-sm">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-900/10 text-brand-900">
                      <Icon name={item.status === "unread" ? "notifications_active" : "notifications"} className="text-[20px]" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-slate-950">{item.title}</p>
                        <Chip variant={item.status === "unread" ? "pending" : "neutral"}>{item.status}</Chip>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-slate-500">{item.message}</p>
                      <div className="mt-3 flex items-center gap-3">
                        <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{formatRelativeTime(item.createdAt)}</span>
                        {item.status === "unread" ? (
                          <button
                            type="button"
                            className="text-sm font-semibold text-brand-900"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              void markRead(item.id);
                            }}
                            disabled={busyId === item.id}
                          >
                            {busyId === item.id ? "Marking..." : "Mark as read"}
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </article>
                );
                return item.link ? (
                  <NavLink key={item.id} to={item.link}>{inner}</NavLink>
                ) : (
                  <div key={item.id}>{inner}</div>
                );
              })}
            </div>
          </SectionCard>
        </div>

        <div className="space-y-6 lg:col-span-4">
          <StatCard label="Unread" value={String(unreadCount ?? 0)} tone="warning" hint="Live unread count from the notifications service." />
          <StatCard label="Total" value={String((notifications ?? []).length)} tone="neutral" hint="All loaded notifications in the current inbox view." />
        </div>
      </div>
    </AccountShellPage>
  );
}
