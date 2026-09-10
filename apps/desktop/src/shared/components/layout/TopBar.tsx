import { useEffect, useRef, useState, type RefObject } from "react";
import { setBadgeCount } from "@/lib/tauri-bridge";
import { NavLink, useLocation } from "react-router-dom";
import { Button, Chip, Icon } from "@/shared";
import type { WorkspaceNotification } from "@/shared/api/workspace-api";
import stanforteLogo from "../../../../../shared/assets/brand/Landscape.svg";
import stanforteIcon from "../../../../../shared/assets/brand/icon.svg";

type TopBarProps = {
  user: {
    name: string;
    title?: string;
  };
  sidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
  notifications?: WorkspaceNotification[];
  unreadCount?: number;
  onMarkNotificationRead?: (id: string) => void | Promise<void>;
  onMarkAllNotificationsRead?: () => void | Promise<void>;
  onSignOut?: () => void | Promise<void>;
};

function formatRelativeTime(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const diffMs = Date.now() - date.getTime();
  const tense = diffMs >= 0 ? "ago" : "from now";
  const diff = Math.abs(diffMs);
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (diff < minute) return "Just now";
  if (diff < hour) {
    const count = Math.round(diff / minute);
    return `${count} minute${count === 1 ? "" : "s"} ${tense}`;
  }
  if (diff < day) {
    const count = Math.round(diff / hour);
    return `${count} hour${count === 1 ? "" : "s"} ${tense}`;
  }
  const count = Math.round(diff / day);
  return `${count} day${count === 1 ? "" : "s"} ${tense}`;
}

function useDismissOnEscape(
  ref: RefObject<HTMLElement>,
  close: () => void,
  open: boolean,
) {
  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        close();
      }
    }

    function handleMouseDown(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        close();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleMouseDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleMouseDown);
    };
  }, [close, open, ref]);
}

export function DesktopTopBar({
  user,
  sidebarCollapsed = false,
  onToggleSidebar,
  notifications = [],
  unreadCount = 0,
  onMarkNotificationRead,
  onMarkAllNotificationsRead,
  onSignOut,
}: TopBarProps) {
  const location = useLocation();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [busyId, setBusyId] = useState<string>("");
  const notificationRef = useRef<HTMLDivElement | null>(null);
  const profileRef = useRef<HTMLDivElement | null>(null);
  useDismissOnEscape(
    notificationRef,
    () => setNotificationsOpen(false),
    notificationsOpen,
  );
  useDismissOnEscape(profileRef, () => setProfileOpen(false), profileOpen);

  const iconButtonClass = (active: boolean) =>
    [
      "relative flex h-10 w-10 items-center justify-center rounded-full transition-colors",
      active
        ? "bg-brand-900/10 text-brand-900"
        : "hover:bg-surface-container-high",
    ].join(" ");

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!notificationRef.current) return;
      if (!notificationRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
      if (
        profileRef.current &&
        !profileRef.current.contains(event.target as Node)
      ) {
        setProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    void setBadgeCount(unreadCount);
  }, [unreadCount]);

  async function handleMarkRead(id: string) {
    if (!onMarkNotificationRead) return;
    try {
      setBusyId(id);
      await onMarkNotificationRead(id);
    } finally {
      setBusyId("");
    }
  }

  async function handleMarkAllRead() {
    if (!onMarkAllNotificationsRead) return;
    try {
      setBusyId("all");
      await onMarkAllNotificationsRead();
    } finally {
      setBusyId("");
    }
  }

  return (
    <header className="fixed top-0 z-50 hidden h-16 w-full items-center justify-between border-b border-outline-variant bg-surface-container-lowest/95 backdrop-blur-md transition-all duration-300 lg:flex">
      <div
        className={[
          sidebarCollapsed ? "w-[6rem] px-4" : "w-64 px-6",
          "flex items-center gap-3 transition-all duration-300",
        ].join(" ")}
      >
        <button
          type="button"
          onClick={onToggleSidebar}
          className="flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-surface-container-high"
          aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <Icon name={sidebarCollapsed ? "menu_open" : "menu"} />
        </button>
        <NavLink
          to="/"
          className="flex items-center"
          aria-label="Go to dashboard"
        >
          <img
            src={sidebarCollapsed ? stanforteIcon : stanforteLogo}
            alt="Stanforte Edge"
            className={
              sidebarCollapsed
                ? "w-54 h-auto object-contain"
                : "h-12 w-auto object-contain"
            }
          />
        </NavLink>
      </div>

      <div className="flex flex-1 items-center justify-end gap-4 px-8">
        <div className="w-full max-w-md">
          <div className="relative group">
            <label htmlFor="workspace-search" className="sr-only">
              Search the workspace
            </label>
            <Icon
              name="search"
              className="absolute left-4 top-1/2 -translate-y-1/2 text-xl text-on-surface-variant transition-colors group-focus-within:text-primary"
            />
            <input
              id="workspace-search"
              className="input-base h-10 rounded-full border-0 bg-surface-container-low pl-11 pr-4 text-sm"
              placeholder="Search operations..."
              type="search"
              aria-label="Search the workspace"
            />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 px-6">
        <NavLink
          to="/download"
          className={({ isActive }) =>
            `${iconButtonClass(isActive)} focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-900/10`
          }
          aria-label="Download desktop app"
        >
          <Icon name="download" />
        </NavLink>

        <NavLink
          to="/mail"
          className={({ isActive }) =>
            `${iconButtonClass(isActive)} focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-900/10`
          }
          aria-label="Mail"
        >
          <Icon name="mail" />
        </NavLink>

        <div className="text-on-surface-variant">
          <div className="relative" ref={notificationRef}>
            <button
              type="button"
              className={`${iconButtonClass(location.pathname === "/notifications" || notificationsOpen)} focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-900/10`}
              onClick={() => setNotificationsOpen((value) => !value)}
              aria-label={
                unreadCount > 0
                  ? `Open notifications, ${unreadCount} unread`
                  : "Open notifications"
              }
              aria-haspopup="menu"
              aria-expanded={notificationsOpen}
              aria-controls="workspace-notifications-menu"
            >
              <Icon name="notifications" />
              {unreadCount > 0 ? (
                <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-danger ring-2 ring-surface-container-lowest" />
              ) : null}
            </button>

            {notificationsOpen ? (
              <div
                id="workspace-notifications-menu"
                role="menu"
                aria-label="Notifications"
                className="absolute right-0 top-[calc(100%+0.75rem)] w-[460px] rounded-[24px] border border-slate-200 bg-white p-4 shadow-card"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-950">
                      Notifications
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Quick updates from your workspace.
                    </p>
                  </div>
                  <div className="flex flex-nowrap items-center gap-2">
                    <Chip variant="pending">{unreadCount} unread</Chip>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => void handleMarkAllRead()}
                      disabled={busyId === "all"}
                    >
                      {busyId === "all" ? "..." : "Read all"}
                    </Button>
                  </div>
                </div>
                <div className="mt-4 space-y-3">
                  {notifications.length ? (
                    notifications.slice(0, 5).map((item) => {
                      const inner = (
                        <div className="rounded-[18px] border border-slate-100 bg-slate-50 px-4 py-3">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-semibold text-slate-900">
                              {item.title}
                            </p>
                            <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                              {formatRelativeTime(item.createdAt)}
                            </span>
                          </div>
                          <p className="mt-2 text-sm leading-6 text-slate-500">
                            {item.message}
                          </p>
                          {item.status === "unread" ? (
                            <button
                              type="button"
                              className="mt-2 text-sm font-semibold text-brand-900 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-900/10"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                void handleMarkRead(item.id);
                              }}
                              disabled={busyId === item.id}
                              role="menuitem"
                            >
                              {busyId === item.id ? "Marking..." : "Mark as read"}
                            </button>
                          ) : null}
                        </div>
                      );
                      return item.link ? (
                        <NavLink key={item.id} to={item.link} onClick={() => setNotificationsOpen(false)}>
                          {inner}
                        </NavLink>
                      ) : (
                        <div key={item.id}>{inner}</div>
                      );
                    })
                  ) : (
                    <div className="rounded-[18px] border border-slate-100 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                      No notifications yet.
                    </div>
                  )}
                </div>
                <NavLink
                  to="/notifications"
                  className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-brand-900"
                  onClick={() => setNotificationsOpen(false)}
                >
                  See more
                  <Icon name="arrow_forward" className="text-[18px]" />
                </NavLink>
              </div>
            ) : null}
          </div>
        </div>

        <div className="relative" ref={profileRef}>
          <button
            type="button"
            className={[
              "flex cursor-pointer items-center gap-3 rounded-full py-1 pl-4 pr-1 transition-colors group focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-900/10",
              profileOpen || location.pathname === "/profile"
                ? "bg-brand-900/10"
                : "hover:bg-surface-container-high",
            ].join(" ")}
            onClick={() => setProfileOpen((value) => !value)}
            aria-haspopup="menu"
            aria-expanded={profileOpen}
            aria-label="Open profile menu"
            aria-controls="workspace-user-menu"
          >
            <div className="hidden flex-col items-end sm:flex">
              <span className="font-headline text-sm font-bold text-on-surface capitalize">
                {user.name}
              </span>
              <span className="text-[11px] font-semibold text-on-surface-variant">
                {user.title || ""}
              </span>
            </div>
            <div className="relative">
              <img
                alt="User profile"
                className="h-10 w-10 rounded-full object-cover ring-2 ring-surface-variant group-hover:ring-primary"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuBcoNhvOt-GUZkPMQeUBdmlfONJ2qyrlakMHezuxW8XASGhvdfudzsS5XFT0m7gGzwEe_9uf5cpF1_7gSdm1bP9vJRrpw7EuujkQpQ3FiSMo0UTsZBkkFY7XJAWzSXlAZjAnlKQ6Z6zWKrMazaq8VfAmvRdZn8JB8UqRVol078fLrEps0zOc41g_RBXRLM1y5H2ZmWJ1d9eMkFHRxWshrJf7kHkDMGew26LCshf_Uvr3RQoAUKvIlglC7e8LCs5p9-P6VWpu1QsjLQ8"
              />
            </div>
          </button>

          {profileOpen ? (
            <div
              id="workspace-user-menu"
              role="menu"
              aria-label="User menu"
              className="absolute right-0 top-[calc(100%+0.75rem)] w-[280px] rounded-[24px] border border-slate-200 bg-white p-4 shadow-card"
            >
              <div className="border-b border-slate-100 pb-3">
                <p className="text-sm font-semibold text-slate-950">
                  {user.name}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  {user.title || "Staff"}
                </p>
              </div>
              <div className="mt-3 space-y-1">
                 <NavLink
                  to="/profile"
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-900/10"
                  role="menuitem"
                >
                  <Icon name="person" />
                  Profile
                </NavLink>
                <NavLink
                  to="/policies"
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-900/10"
                  role="menuitem"
                >
                  <Icon name="policy" />
                  Policies & Sign-offs
                </NavLink>
                <NavLink
                  to="/settings"
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-900/10"
                  role="menuitem"
                >
                  <Icon name="settings" />
                  Settings
                </NavLink>
                <NavLink
                  to="/help"
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-900/10"
                  role="menuitem"
                >
                  <Icon name="help" />
                  Support
                </NavLink>
                <button
                  type="button"
                  onClick={() => {
                    setProfileOpen(false);
                    void onSignOut?.();
                  }}
                  className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm font-semibold text-danger transition hover:bg-danger/5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-danger/10"
                  role="menuitem"
                >
                  <Icon name="logout" />
                  Logout
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}

export function MobileTopBar({
  user,
  unreadCount = 0,
  onSignOut,
}: TopBarProps) {
  const location = useLocation();
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        profileRef.current &&
        !profileRef.current.contains(event.target as Node)
      ) {
        setProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="fixed top-0 z-50 flex h-16 w-full items-center justify-between bg-surface/80 px-6 backdrop-blur-[24px] lg:hidden">
      <NavLink
        to="/"
        className="flex items-center"
        aria-label="Go to dashboard"
      >
        <img
          src={stanforteLogo}
          alt="Stanforte Edge"
          className="h-10 w-auto object-contain"
        />
      </NavLink>
      <div className="flex items-center gap-2">
        <NavLink
          to="/mail"
          className={[
            "relative rounded-full p-2 transition-all active:scale-95 active:opacity-80 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-900/10",
            location.pathname === "/mail"
              ? "bg-brand-900/10 text-brand-900"
              : "",
          ].join(" ")}
          aria-label="Mail"
        >
          <Icon name="mail" />
        </NavLink>

        <NavLink
          to="/notifications"
          className={[
            "relative rounded-full p-2 transition-all active:scale-95 active:opacity-80 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-900/10",
            location.pathname === "/notifications"
              ? "bg-brand-900/10 text-brand-900"
              : "",
          ].join(" ")}
          aria-label={
            unreadCount > 0
              ? `Notifications, ${unreadCount} unread`
              : "Notifications"
          }
        >
          <Icon name="notifications" />
          {unreadCount > 0 ? (
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-danger" />
          ) : null}
        </NavLink>

        <div className="relative" ref={profileRef}>
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-primary-fixed focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-900/10"
            onClick={() => setProfileOpen((value) => !value)}
            aria-haspopup="menu"
            aria-expanded={profileOpen}
            aria-label="Open profile menu"
            aria-controls="workspace-mobile-user-menu"
          >
            <img
              alt="Staff Profile"
              className="h-full w-full object-cover"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuCOPNtlHIad3cDeI_zmEW_McJwfs0Xse9dEKgbkZvOCekttM07L3lMR0U0RMHkB6EQNnuV4xSkmooq4gbuOhawcfkjxmQSrCB4Hj-Z7dFSKh3vbJUqMAO2aLdW6HePzSVQJeuSLw6q0YrqUofuV5g7T0QXCmu4tgCGt5kn01KmW16LR9mT0pxhck6D-lNnqLm5CisqJfVTDZR6h8SYrCIQ68_c0UwkN2E9U2gefeWTod5AlGbwioZFQGxt7WedAv-KLD_BfhsoCAc7U"
            />
          </button>

          {profileOpen ? (
            <div
              id="workspace-mobile-user-menu"
              role="menu"
              aria-label="User menu"
              className="absolute right-0 top-[calc(100%+0.75rem)] w-[240px] rounded-[24px] border border-slate-200 bg-white p-4 shadow-card"
            >
              <div className="border-b border-slate-100 pb-3">
                <p className="text-sm font-semibold text-slate-950">
                  {user.name}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  {user.title || "Staff"}
                </p>
              </div>
              <div className="mt-3 space-y-1">
                <NavLink
                  to="/policies"
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-900/10"
                  role="menuitem"
                >
                  <Icon name="policy" />
                  Policies & Sign-offs
                </NavLink>
                <NavLink
                  to="/settings"
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-900/10"
                  role="menuitem"
                >
                  <Icon name="settings" />
                  Settings
                </NavLink>
                <NavLink
                  to="/help"
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-900/10"
                  role="menuitem"
                >
                  <Icon name="help" />
                  Support
                </NavLink>
                <button
                  type="button"
                  onClick={() => {
                    setProfileOpen(false);
                    void onSignOut?.();
                  }}
                  className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm font-semibold text-danger transition hover:bg-danger/5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-danger/10"
                  role="menuitem"
                >
                  <Icon name="logout" />
                  Logout
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
