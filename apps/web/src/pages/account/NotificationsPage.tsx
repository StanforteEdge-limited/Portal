import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Bell,
  CheckCheck,
  CheckCircle2,
  Clock,
  Filter,
  Inbox,
  RefreshCw,
  ExternalLink,
  AlertTriangle,
  Info,
  Calendar,
  FileText,
  DollarSign,
  ShieldAlert,
} from "lucide-react";
import { PortalLayout } from "@/components/layout/PortalLayout";
import { formatRelativeTime } from "@stanforte/shared";
import { useCachedQuery } from "@/shared/lib/core";
import {
  getWorkspaceUnreadNotificationCount,
  listWorkspaceNotifications,
  markAllWorkspaceNotificationsRead,
  markWorkspaceNotificationRead,
} from "@/shared/api/workspace-api";

interface NotificationItem {
  id: string;
  type?: string;
  title: string;
  message: string;
  link?: string;
  status: "read" | "unread";
  createdAt: string;
  sentVia?: string[];
}

export default function NotificationsPage() {
  const {
    data: rawNotifications,
    loading,
    error,
    refetch,
  } = useCachedQuery<NotificationItem[]>("workspace:notifications", () => listWorkspaceNotifications(), {
    ttlMs: 1000 * 30,
    storage: "memory",
  });

  const { data: rawUnreadCount, refetch: refetchUnreadCount } = useCachedQuery<number>(
    "workspace:notifications:unread-count",
    () => getWorkspaceUnreadNotificationCount(),
    {
      ttlMs: 1000 * 30,
      storage: "memory",
    }
  );

  const notifications = useMemo(() => rawNotifications ?? [], [rawNotifications]);
  const unreadCount = rawUnreadCount ?? notifications.filter((n) => n.status === "unread").length;
  const readCount = Math.max(0, notifications.length - unreadCount);
  const actionItemsCount = notifications.filter((n) => Boolean(n.link) || n.type === "action").length;

  const [activeTab, setActiveTab] = useState<"all" | "unread" | "read">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [busyId, setBusyId] = useState<string>("");

  const filteredNotifications = useMemo(() => {
    return notifications.filter((item) => {
      if (activeTab === "unread" && item.status !== "unread") return false;
      if (activeTab === "read" && item.status !== "read") return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return item.title.toLowerCase().includes(q) || item.message.toLowerCase().includes(q);
      }
      return true;
    });
  }, [notifications, activeTab, searchQuery]);

  async function handleMarkRead(id: string) {
    try {
      setBusyId(id);
      await markWorkspaceNotificationRead(id);
      await Promise.all([refetch(), refetchUnreadCount()]);
    } finally {
      setBusyId("");
    }
  }

  async function handleMarkAllRead() {
    try {
      setBusyId("all");
      await markAllWorkspaceNotificationsRead();
      await Promise.all([refetch(), refetchUnreadCount()]);
    } finally {
      setBusyId("");
    }
  }

  function getNotificationIcon(type?: string) {
    switch (type) {
      case "leave":
      case "attendance":
      case "schedule":
        return <Calendar className="w-5 h-5 text-sky-600" />;
      case "payroll":
      case "finance":
      case "expense":
        return <DollarSign className="w-5 h-5 text-emerald-600" />;
      case "document":
      case "policy":
        return <FileText className="w-5 h-5 text-amber-600" />;
      case "security":
      case "warning":
        return <ShieldAlert className="w-5 h-5 text-rose-600" />;
      case "alert":
        return <AlertTriangle className="w-5 h-5 text-amber-500" />;
      default:
        return <Info className="w-5 h-5 text-blue-600" />;
    }
  }

  return (
    <PortalLayout>
      <div className="space-y-6">
        {/* Header Section */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
              <Link to="/" className="hover:text-slate-800 transition-colors">
                Workspace
              </Link>
              <span>/</span>
              <span className="text-slate-900 font-bold">Notifications</span>
            </div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
              Notifications &amp; Activity
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Review company announcements, approvals, time-sensitive alerts, and system notices.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => {
                void refetch();
                void refetchUnreadCount();
              }}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-slate-400" : ""}`} />
              Refresh
            </button>
            <button
              onClick={() => void handleMarkAllRead()}
              disabled={busyId === "all" || unreadCount === 0}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#0a1128] px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-[#101b44] active:scale-95 disabled:opacity-40"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              {busyId === "all" ? "Marking all..." : "Mark all as read"}
            </button>
          </div>
        </div>

        {/* 4 KPI Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all hover:border-slate-300">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Total Notifications
              </span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                <Bell className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-extrabold tracking-tight text-slate-900">
                {notifications.length}
              </span>
              <span className="text-xs font-medium text-slate-500">inbox records</span>
            </div>
          </div>

          <div className="rounded-2xl border border-amber-200/80 bg-amber-50/30 p-5 shadow-sm transition-all hover:border-amber-300">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-amber-800">
                Unread Alerts
              </span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-extrabold tracking-tight text-amber-950">
                {unreadCount}
              </span>
              <span className="text-xs font-medium text-amber-700">requires attention</span>
            </div>
          </div>

          <div className="rounded-2xl border border-blue-200/80 bg-blue-50/30 p-5 shadow-sm transition-all hover:border-blue-300">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-blue-800">
                Action Items
              </span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                <ExternalLink className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-extrabold tracking-tight text-blue-950">
                {actionItemsCount}
              </span>
              <span className="text-xs font-medium text-blue-700">linked tasks</span>
            </div>
          </div>

          <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/30 p-5 shadow-sm transition-all hover:border-emerald-300">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-800">
                Cleared / Read
              </span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-extrabold tracking-tight text-emerald-950">
                {readCount}
              </span>
              <span className="text-xs font-medium text-emerald-700">archived</span>
            </div>
          </div>
        </div>

        {/* Content Box with Tabs and Filter Bar */}
        <div className="rounded-2xl border border-slate-200/90 bg-white shadow-sm overflow-hidden">
          {/* Controls Bar */}
          <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between bg-slate-50/50">
            {/* Filter Tabs */}
            <div className="flex items-center gap-1 rounded-xl bg-slate-200/70 p-1">
              <button
                onClick={() => setActiveTab("all")}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  activeTab === "all"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                All ({notifications.length})
              </button>
              <button
                onClick={() => setActiveTab("unread")}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  activeTab === "unread"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Unread ({unreadCount})
              </button>
              <button
                onClick={() => setActiveTab("read")}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  activeTab === "read"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Read ({readCount})
              </button>
            </div>

            {/* Quick Search */}
            <div className="relative w-full sm:w-64">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Filter by keyword..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white py-1.5 pl-8 pr-3 text-xs text-slate-900 placeholder-slate-400 focus:border-[#ff6900] focus:outline-none focus:ring-1 focus:ring-[#ff6900]"
              />
            </div>
          </div>

          {/* List Area */}
          <div className="divide-y divide-slate-100">
            {loading && notifications.length === 0 ? (
              <div className="p-12 text-center">
                <RefreshCw className="mx-auto w-6 h-6 animate-spin text-slate-400 mb-2" />
                <p className="text-sm font-medium text-slate-500">Loading notifications...</p>
              </div>
            ) : null}

            {error ? (
              <div className="p-8 text-center bg-rose-50/50">
                <AlertTriangle className="mx-auto w-6 h-6 text-rose-500 mb-2" />
                <p className="text-sm font-semibold text-rose-900">Failed to load notifications</p>
                <p className="mt-1 text-xs text-rose-600">{error}</p>
              </div>
            ) : null}

            {!loading && filteredNotifications.length === 0 ? (
              <div className="p-16 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                  <Inbox className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-semibold text-slate-900">No notifications found</h3>
                <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
                  {searchQuery
                    ? "No notifications match your search query."
                    : activeTab === "unread"
                    ? "Great news! You have no unread notifications waiting."
                    : "There are currently no notifications in this view."}
                </p>
              </div>
            ) : null}

            {filteredNotifications.map((item) => {
              const isUnread = item.status === "unread";
              return (
                <div
                  key={item.id}
                  className={`group flex items-start gap-4 p-4 transition hover:bg-slate-50/80 ${
                    isUnread ? "bg-amber-50/15" : "bg-white"
                  }`}
                >
                  {/* Status Indicator / Icon Badge */}
                  <div className="relative shrink-0">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-xl border ${
                        isUnread
                          ? "border-amber-200 bg-amber-50"
                          : "border-slate-200/80 bg-slate-50"
                      }`}
                    >
                      {getNotificationIcon(item.type)}
                    </div>
                    {isUnread && (
                      <span className="absolute -top-1 -right-1 flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ff6900] opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-[#ff6900]"></span>
                      </span>
                    )}
                  </div>

                  {/* Body Content */}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <h4
                          className={`text-sm ${
                            isUnread ? "font-bold text-slate-900" : "font-semibold text-slate-700"
                          }`}
                        >
                          {item.title}
                        </h4>
                        {item.type && (
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-600">
                            {item.type}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 text-xs text-slate-400">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{formatRelativeTime(item.createdAt)}</span>
                      </div>
                    </div>

                    <p className="mt-1 text-xs leading-relaxed text-slate-600">{item.message}</p>

                    {/* Actions Row */}
                    <div className="mt-3 flex items-center gap-3">
                      {item.link && (
                        <Link
                          to={item.link}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-[#0a1128] hover:text-[#ff6900] transition-colors"
                        >
                          <span>Open details</span>
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      )}

                      {isUnread && (
                        <button
                          type="button"
                          onClick={() => void handleMarkRead(item.id)}
                          disabled={busyId === item.id}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors disabled:opacity-50"
                        >
                          <CheckCheck className="w-3 h-3 text-emerald-600" />
                          <span>{busyId === item.id ? "Marking..." : "Mark as read"}</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </PortalLayout>
  );
}
