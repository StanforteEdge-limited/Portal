import React, { useState, useRef, useEffect } from "react";
import { Mail, Briefcase, ShieldCheck } from "lucide-react";
import {
  PRESENCE_STATUS_OPTIONS,
  type PresenceStatus,
  getSavedUserStatus,
} from "@/shared/hooks/useUserPresence";
import { useAuth } from "@/shared/context/AuthProvider";

export interface HoverUser {
  id?: string;
  name: string;
  email?: string;
  role?: string;
  avatar?: string;
  status?: PresenceStatus;
}

interface UserHoverCardProps {
  user: HoverUser;
  children: React.ReactNode;
  side?: "top" | "bottom" | "right" | "left";
  className?: string;
}

export function UserHoverCard({
  user,
  children,
  side = "top",
  className = "",
}: UserHoverCardProps) {
  const [open, setOpen] = useState(false);
  const hoverTimeoutRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { user: authUser } = useAuth();

  // If this user is the logged in user, use their current live status
  const isSelf = String(authUser?.id || "") === String(user.id || "");
  const effectiveStatus: PresenceStatus = user.status
    ? user.status
    : isSelf
    ? getSavedUserStatus()
    : "online";

  const statusConfig =
    PRESENCE_STATUS_OPTIONS.find((s) => s.id === effectiveStatus) ||
    PRESENCE_STATUS_OPTIONS[0];

  const handleMouseEnter = () => {
    clearTimeout(hoverTimeoutRef.current);
    hoverTimeoutRef.current = setTimeout(() => {
      setOpen(true);
    }, 250);
  };

  const handleMouseLeave = () => {
    clearTimeout(hoverTimeoutRef.current);
    hoverTimeoutRef.current = setTimeout(() => {
      setOpen(false);
    }, 150);
  };

  useEffect(() => {
    return () => clearTimeout(hoverTimeoutRef.current);
  }, []);

  const getPositionClasses = () => {
    switch (side) {
      case "bottom":
        return "top-full left-0 mt-2";
      case "right":
        return "left-full top-0 ml-2";
      case "left":
        return "right-full top-0 mr-2";
      case "top":
      default:
        return "bottom-full left-0 mb-2";
    }
  };

  return (
    <div
      ref={containerRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`relative inline-flex items-center ${className}`}
    >
      {children}

      {open && (
        <div
          role="tooltip"
          onMouseEnter={() => clearTimeout(hoverTimeoutRef.current)}
          onMouseLeave={handleMouseLeave}
          className={`absolute ${getPositionClasses()} z-50 w-64 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-3.5 shadow-xl text-left animate-in fade-in zoom-in-95 pointer-events-auto select-none`}
        >
          <div className="flex items-start gap-3">
            <div className="relative shrink-0">
              <div className="w-10 h-10 rounded-full bg-[#ff6900] text-white font-semibold text-xs flex items-center justify-center shadow-xs">
                {user.avatar || user.name.slice(0, 2).toUpperCase()}
              </div>
              <span
                className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white dark:border-neutral-900 ${statusConfig.dotColor}`}
                title={statusConfig.label}
              />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-1">
                <h4 className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 truncate">
                  {user.name}
                </h4>
                <span
                  className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border ${statusConfig.badgeBg}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dotColor}`} />
                  <span>{statusConfig.label}</span>
                </span>
              </div>

              {user.role && (
                <div className="flex items-center gap-1 text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5 truncate">
                  <Briefcase className="h-3 w-3 shrink-0 text-neutral-400" />
                  <span className="truncate">{user.role}</span>
                </div>
              )}

              {user.email && (
                <div className="flex items-center gap-1 text-[11px] text-neutral-400 dark:text-neutral-500 mt-1 truncate">
                  <Mail className="h-3 w-3 shrink-0" />
                  <span className="truncate font-mono">{user.email}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
