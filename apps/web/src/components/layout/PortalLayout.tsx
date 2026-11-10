import { useState, useMemo, useRef, useEffect, type ReactNode } from "react";
import { Link, useNavigate, useLocation } from "@/shared/router-adapter";
import { useAuth } from "@/shared/context/AuthProvider";
import { StanforteLogo } from "@/components/brand/StanforteLogo";
import {
  LayoutDashboard,
  Users,
  Clock,
  Calendar,
  CalendarCheck,
  UserCheck,
  Building2,
  CreditCard,
  Wallet,
  PieChart,
  ShoppingCart,
  Receipt,
  FileCheck,
  FileText,
  Briefcase,
  CheckSquare,
  FolderOpen,
  BookOpen,
  HardDrive,
  Mail,
  Shield,
  Landmark,
  Settings,
  Search,
  Bell,
  ChevronDown,
  ChevronRight,
  LogOut,
  Menu,
  X,
  User as UserIcon,
  LayoutGrid,
  Sparkles,
  Sun,
  Moon,
  Laptop,
  PanelLeftClose,
  PanelLeft,
  ExternalLink,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";

export interface NavItemDef {
  label: string;
  icon: any;
  path: string;
  badge?: string;
  aliases?: string[];
  description?: string;
  adminOnly?: boolean;
}

export interface NavGroupDef {
  title: string;
  items: NavItemDef[];
}

/**
 * Standard Employee Navigation (Clean, minimal, uncluttered daily workspace)
 */
export const EMPLOYEE_NAV_ITEMS: NavItemDef[] = [
  {
    label: "Dashboard",
    icon: LayoutDashboard,
    path: "/dashboard",
    aliases: ["Home", "Overview"],
    description: "Daily KPIs, tasks, and quick actions",
  },
  {
    label: "Attendance",
    icon: Clock,
    path: "/attendance",
    aliases: ["Time & Attendance", "Clock In", "Shifts"],
    description: "Clock in/out, shift times, and attendance history",
  },
  {
    label: "Leave & Absence",
    icon: Calendar,
    path: "/leave",
    aliases: ["Leave", "Time Off", "Vacation"],
    description: "Submit leave requests and view balances",
  },
  {
    label: "My Requests",
    icon: FileText,
    path: "/requests",
    aliases: ["Requests", "Requisitions"],
    description: "Track personal requisitions and approvals",
  },
  {
    label: "My Payslips",
    icon: Receipt,
    path: "/account/payslips",
    aliases: ["Payslips", "Salary"],
    description: "Monthly salary statements and tax deductions",
  },
  {
    label: "Timesheets",
    icon: CalendarCheck,
    path: "/account/timesheets",
    aliases: ["Timesheet", "Work Logs"],
    description: "Weekly project time logs",
  },
  {
    label: "Teams & Groups",
    icon: UserCheck,
    path: "/teams",
    aliases: ["Teams", "Departments"],
    description: "Team rosters and work groups",
  },
  {
    label: "Documents",
    icon: FolderOpen,
    path: "/documents",
    aliases: ["Docs", "Policies"],
    description: "Company policies and handbook",
  },
];

/**
 * Admin Console Navigation (Management oversight & configuration)
 */
export const ADMIN_NAV_GROUPS: NavGroupDef[] = [
  {
    title: "Executive",
    items: [
      {
        label: "Dashboard",
        icon: LayoutDashboard,
        path: "/dashboard",
        aliases: ["Home", "Overview"],
        description: "Organization executive KPI metrics & activity stream",
      },
      {
        label: "Approval Queue",
        icon: FileCheck,
        path: "/requests/approvals",
        badge: "23",
        aliases: ["Approvals", "Decisions"],
        description: "Managerial decision queue for finance and leave",
      },
    ],
  },
  {
    title: "HR & Workforce",
    items: [
      {
        label: "Employees Directory",
        icon: Users,
        path: "/admin/users",
        aliases: ["HR & Workforce", "Users", "Directory", "Staff"],
        description: "Staff directory, onboarding and employee profiles",
      },
      {
        label: "Time & Attendance",
        icon: Clock,
        path: "/attendance",
        aliases: ["Attendance", "Shifts"],
        description: "Workforce hours tracked, anomalies and corrections",
      },
      {
        label: "Leave Management",
        icon: Calendar,
        path: "/leave",
        aliases: ["Leave", "Absences"],
        description: "Approve leave and monitor coverage",
      },
      {
        label: "Teams & Departments",
        icon: UserCheck,
        path: "/teams",
        aliases: ["Teams", "Groups"],
        description: "Organizational structure and department leads",
      },
    ],
  },
  {
    title: "Finance & Treasury",
    items: [
      {
        label: "Finance Hub",
        icon: Building2,
        path: "/finance",
        aliases: ["Finance", "Cash Flow"],
        description: "Treasury overview, payables and cash position",
      },
      {
        label: "Payroll Runs",
        icon: CreditCard,
        path: "/admin/payroll/authorization",
        aliases: ["Payroll", "Authorization"],
        description: "Monthly payroll sign-offs and disbursements",
      },
      {
        label: "Accounts & Ledger",
        icon: Wallet,
        path: "/finance/accounts",
        aliases: ["Accounts", "Ledger", "GL"],
        description: "Operating bank accounts and ledger entries",
      },
      {
        label: "Budgets & Plans",
        icon: PieChart,
        path: "/finance/budgets",
        aliases: ["Budgets"],
        description: "Fiscal year departmental budget envelopes",
      },
      {
        label: "Procurement & POs",
        icon: ShoppingCart,
        path: "/procurement",
        aliases: ["Procurement", "Purchase Orders"],
        description: "Vendor purchase orders and fulfillment",
      },
    ],
  },
  {
    title: "Governance & System",
    items: [
      {
        label: "Roles & Permissions",
        icon: Shield,
        path: "/admin/roles",
        aliases: ["Roles", "Permissions", "RBAC"],
        description: "Granular capabilities and access control",
      },
      {
        label: "Legal Entities",
        icon: Landmark,
        path: "/admin/organizations",
        aliases: ["Organizations", "Entities"],
        description: "Corporate entities and subsidiaries",
      },
      {
        label: "System Settings",
        icon: Settings,
        path: "/admin/settings",
        aliases: ["Settings", "Admin Settings"],
        description: "Audit trail, taxonomies and system config",
      },
    ],
  },
];

/**
 * All Application Catalog for the 9-dots App Launcher
 */
export const APP_LAUNCHER_CATALOG = [
  {
    category: "HR & WORKFORCE",
    apps: [
      {
        name: "Employees",
        description: "Directory, onboarding & staff profiles",
        icon: Users,
        path: "/admin/users",
        color: "bg-blue-50 text-blue-600",
      },
      {
        name: "Attendance",
        description: "Clock in/out, geolocation & shifts",
        icon: Clock,
        path: "/attendance",
        color: "bg-emerald-50 text-emerald-600",
      },
      {
        name: "Leave & Absence",
        description: "Vacation tracking, holidays & sign-offs",
        icon: Calendar,
        path: "/leave",
        color: "bg-purple-50 text-purple-600",
      },
      {
        name: "Teams & Groups",
        description: "Departments, committees & rosters",
        icon: UserCheck,
        path: "/teams",
        color: "bg-indigo-50 text-indigo-600",
      },
      {
        name: "Timesheets",
        description: "Weekly work logs & project tracking",
        icon: CalendarCheck,
        path: "/account/timesheets",
        color: "bg-teal-50 text-teal-600",
      },
    ],
  },
  {
    category: "FINANCE & TREASURY",
    apps: [
      {
        name: "Finance Hub",
        description: "Cash flow, payables & burn rate",
        icon: Building2,
        path: "/finance",
        color: "bg-amber-50 text-amber-600",
      },
      {
        name: "Payroll Runs",
        description: "Disbursement cycles & authorizations",
        icon: CreditCard,
        path: "/admin/payroll/authorization",
        color: "bg-rose-50 text-rose-600",
      },
      {
        name: "Accounts & Ledger",
        description: "Bank accounts & General Ledger",
        icon: Wallet,
        path: "/finance/accounts",
        color: "bg-emerald-50 text-emerald-600",
      },
      {
        name: "Budgets & Plans",
        description: "Fiscal departmental budget variances",
        icon: PieChart,
        path: "/finance/budgets",
        color: "bg-cyan-50 text-cyan-600",
      },
      {
        name: "Procurement",
        description: "Requisitions, purchase orders & vendors",
        icon: ShoppingCart,
        path: "/procurement",
        color: "bg-orange-50 text-[#ff6900]",
      },
      {
        name: "My Payslips",
        description: "Personal monthly pay stubs & tax files",
        icon: Receipt,
        path: "/account/payslips",
        color: "bg-blue-50 text-blue-600",
      },
    ],
  },
  {
    category: "OPERATIONS & WORKFLOWS",
    apps: [
      {
        name: "Approval Queue",
        description: "Managerial decision inbox",
        icon: FileCheck,
        path: "/requests/approvals",
        color: "bg-emerald-50 text-emerald-600",
        badge: "23",
      },
      {
        name: "My Requests",
        description: "Procurement, financial & HR tickets",
        icon: FileText,
        path: "/requests",
        color: "bg-blue-50 text-blue-600",
      },
      {
        name: "Projects",
        description: "Initiatives, milestones & delivery",
        icon: Briefcase,
        path: "/projects",
        color: "bg-purple-50 text-purple-600",
      },
      {
        name: "Documents",
        description: "Corporate repository & verified filings",
        icon: FolderOpen,
        path: "/documents",
        color: "bg-indigo-50 text-indigo-600",
      },
      {
        name: "Policies",
        description: "Code of conduct & employee handbooks",
        icon: BookOpen,
        path: "/policies",
        color: "bg-rose-50 text-rose-600",
      },
      {
        name: "Company Mail",
        description: "Internal notifications & broadcast stream",
        icon: Mail,
        path: "/mail",
        color: "bg-slate-100 text-slate-700",
      },
    ],
  },
  {
    category: "ADMINISTRATION & SECURITY",
    adminOnly: true,
    apps: [
      {
        name: "Roles & Access",
        description: "Granular RBAC permissions matrix",
        icon: Shield,
        path: "/admin/roles",
        color: "bg-purple-50 text-purple-700",
      },
      {
        name: "Legal Entities",
        description: "Corporate subsidiaries & organizations",
        icon: Landmark,
        path: "/admin/organizations",
        color: "bg-blue-50 text-blue-700",
      },
      {
        name: "System Settings",
        description: "System audit logs, taxonomies & config",
        icon: Settings,
        path: "/admin/settings",
        color: "bg-slate-100 text-slate-800",
      },
    ],
  },
];

export type NavItemKey = string;

interface PortalLayoutProps {
  children: ReactNode;
  activeNav?: NavItemKey;
}

export function PortalLayout({ children, activeNav }: PortalLayoutProps) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Drawers & Modals
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDrawerOpen, setUserDrawerOpen] = useState(false);
  const [appLauncherOpen, setAppLauncherOpen] = useState(false);

  // Search
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // App Launcher search
  const [launcherSearch, setLauncherSearch] = useState("");

  // Appearance Mode ('system' | 'light' | 'dark')
  const [appearanceMode, setAppearanceMode] = useState<"system" | "light" | "dark">("light");

  // Compact Rail Mode (persisted)
  const [isCompactRail, setIsCompactRail] = useState(() => {
    return localStorage.getItem("portal_rail_compact") === "true";
  });

  const toggleRail = (compact: boolean) => {
    setIsCompactRail(compact);
    localStorage.setItem("portal_rail_compact", String(compact));
  };

  // Determine User Role & Admin Authority
  const userRoles = useMemo(
    () => (user?.roles || []).map((r) => String(r).toLowerCase()),
    [user]
  );

  const isAdmin = useMemo(() => {
    return (
      userRoles.some((r) =>
        ["admin", "administrator", "super_admin", "hr_admin", "finance_admin", "owner"].includes(r)
      ) ||
      (user?.permissions || []).includes("*") ||
      (user?.permissions || []).some((p) => p.endsWith(".manage"))
    );
  }, [userRoles, user?.permissions]);

  // Workspace Mode: 'employee' (clean staff view) vs 'admin' (management console)
  const currentPath = location?.pathname || "";
  const isDefaultAdminRoute = currentPath.startsWith("/admin") || currentPath.startsWith("/finance");

  const [workspaceMode, setWorkspaceMode] = useState<"employee" | "admin">(() => {
    const saved = localStorage.getItem("portal_workspace_mode");
    if (saved === "admin" && isAdmin) return "admin";
    if (isDefaultAdminRoute && isAdmin) return "admin";
    return "employee";
  });

  // Switch workspace mode
  const switchWorkspaceMode = (mode: "employee" | "admin") => {
    setWorkspaceMode(mode);
    localStorage.setItem("portal_workspace_mode", mode);
    if (mode === "admin") {
      navigate("/admin/users");
    } else {
      navigate("/dashboard");
    }
  };

  const userName = user?.first_name
    ? `${user.first_name} ${user.last_name || ""}`.trim()
    : user?.email?.split("@")[0] || "Daniel Owonikoko";

  const userRole = user?.roles?.[0]
    ? String(user.roles[0]).replace(/_/g, " ")
    : isAdmin
    ? "Administrator"
    : "Staff Member";

  const orgName =
    (user as any)?.workspace_name ||
    user?.organizations?.[0]?.name ||
    "Stanforte Edge";

  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  // Active check helper
  const isItemActive = (item: NavItemDef) => {
    if (activeNav) {
      if (activeNav.toLowerCase() === item.label.toLowerCase()) return true;
      if (item.aliases?.some((a) => a.toLowerCase() === activeNav.toLowerCase())) return true;
    }
    if (currentPath === item.path) return true;
    if (item.path !== "/dashboard" && item.path !== "/finance" && currentPath.startsWith(item.path + "/")) {
      return true;
    }
    return false;
  };

  // Flattened searchable navigation list
  const allNavItems = useMemo(() => {
    const list: Array<NavItemDef & { group: string }> = [];
    ADMIN_NAV_GROUPS.forEach((group) => {
      group.items.forEach((item) => {
        list.push({ ...item, group: group.title });
      });
    });
    return list;
  }, []);

  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return allNavItems.filter((item) => {
      if (item.label.toLowerCase().includes(q)) return true;
      if (item.description?.toLowerCase().includes(q)) return true;
      if (item.group.toLowerCase().includes(q)) return true;
      if (item.aliases?.some((a) => a.toLowerCase().includes(q))) return true;
      return false;
    });
  }, [allNavItems, searchQuery]);

  // Click outside listener for search palette
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setSearchFocused(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleSignOut() {
    try {
      await signOut();
      navigate("/login");
    } catch {
      window.location.href = "/login";
    }
  }

  // Filtered Apps in App Launcher
  const filteredCatalog = useMemo(() => {
    const q = launcherSearch.trim().toLowerCase();
    return APP_LAUNCHER_CATALOG.filter((cat) => {
      if (cat.adminOnly && !isAdmin) return false;
      return true;
    }).map((cat) => {
      if (!q) return cat;
      const matchingApps = cat.apps.filter(
        (app) =>
          app.name.toLowerCase().includes(q) ||
          app.description.toLowerCase().includes(q)
      );
      return { ...cat, apps: matchingApps };
    }).filter((cat) => cat.apps.length > 0);
  }, [launcherSearch, isAdmin]);

  return (
    <div className="min-h-screen bg-[#f4f7fc] flex flex-col font-sans text-slate-900 selection:bg-[#ff6900] selection:text-white antialiased">
      {/* ------------------------------------------------------------- */}
      {/* 1. LEFT SIDEBAR (Streamlined & Uncluttered, with Compact Rail)  */}
      {/* ------------------------------------------------------------- */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 bg-[#0a1128] text-white flex flex-col justify-between transition-all duration-200 ease-in-out ${
          isCompactRail ? "w-16 p-2" : "w-64 p-4"
        } ${mobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
      >
        {/* Top: Brand Logo & Mode Badge */}
        <div className="shrink-0 border-b border-white/10 pb-3">
          <div className="flex items-center justify-between">
            <Link to="/dashboard" className="inline-block overflow-hidden">
              {isCompactRail ? (
                <div className="w-10 h-10 rounded-xl bg-[#ff6900] flex items-center justify-center font-black text-white text-lg shadow-md">
                  S
                </div>
              ) : (
                <StanforteLogo variant="dark" className="h-8" />
              )}
            </Link>

            {!isCompactRail && (
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>

          {/* Mode Indicator / Admin Console Switch Pill (Only when expanded) */}
          {!isCompactRail && isAdmin && (
            <div className="mt-3 p-1 rounded-xl bg-white/5 border border-white/10 flex items-center gap-1 text-[11px] font-bold">
              <button
                type="button"
                onClick={() => switchWorkspaceMode("employee")}
                className={`flex-1 py-1 px-2 rounded-lg transition-all text-center ${
                  workspaceMode === "employee"
                    ? "bg-[#ff6900] text-white shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                My Workspace
              </button>
              <button
                type="button"
                onClick={() => switchWorkspaceMode("admin")}
                className={`flex-1 py-1 px-2 rounded-lg transition-all text-center ${
                  workspaceMode === "admin"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Admin Console
              </button>
            </div>
          )}
        </div>

        {/* Middle: Clean Navigation Items */}
        <div className="flex-1 overflow-y-auto min-h-0 my-3 space-y-4 scrollbar-thin scrollbar-thumb-white/10 pr-0.5">
          {/* Mode 1: Clean Employee Workspace Navigation */}
          {workspaceMode === "employee" ? (
            <nav className="space-y-1">
              {!isCompactRail && (
                <div className="px-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Daily Workspace
                </div>
              )}
              {EMPLOYEE_NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = isItemActive(item);

                return (
                  <Link
                    key={item.label}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    title={isCompactRail ? item.label : undefined}
                    className={`w-full flex items-center rounded-xl transition-all group ${
                      isCompactRail
                        ? "justify-center p-2.5 my-1"
                        : "justify-between px-3 py-2 text-xs font-semibold"
                    } ${
                      isActive
                        ? "bg-[#ff6900] text-white shadow-md shadow-orange-500/25"
                        : "text-slate-300 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon
                        className={`shrink-0 transition-colors ${
                          isCompactRail ? "h-5 w-5" : "h-4 w-4"
                        } ${
                          isActive ? "text-white" : "text-slate-400 group-hover:text-white"
                        }`}
                      />
                      {!isCompactRail && <span className="truncate">{item.label}</span>}
                    </div>

                    {!isCompactRail && item.badge && (
                      <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-white/20 text-white">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>
          ) : (
            /* Mode 2: Executive Admin Console Navigation */
            <div className="space-y-4">
              {ADMIN_NAV_GROUPS.map((group) => (
                <div key={group.title} className="space-y-1">
                  {!isCompactRail && (
                    <div className="px-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      {group.title}
                    </div>
                  )}
                  <nav className="space-y-0.5">
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      const isActive = isItemActive(item);

                      return (
                        <Link
                          key={item.label}
                          to={item.path}
                          onClick={() => setMobileMenuOpen(false)}
                          title={isCompactRail ? item.label : undefined}
                          className={`w-full flex items-center rounded-xl transition-all group ${
                            isCompactRail
                              ? "justify-center p-2.5 my-1"
                              : "justify-between px-3 py-2 text-xs font-semibold"
                          } ${
                            isActive
                              ? "bg-blue-600 text-white shadow-md shadow-blue-500/25"
                              : "text-slate-300 hover:text-white hover:bg-white/5"
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <Icon
                              className={`shrink-0 transition-colors ${
                                isCompactRail ? "h-5 w-5" : "h-4 w-4"
                              } ${
                                isActive ? "text-white" : "text-slate-400 group-hover:text-white"
                              }`}
                            />
                            {!isCompactRail && <span className="truncate">{item.label}</span>}
                          </div>

                          {!isCompactRail && item.badge && (
                            <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-white text-blue-700">
                              {item.badge}
                            </span>
                          )}
                        </Link>
                      );
                    })}
                  </nav>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Bottom: Rail Mode Toggle & Quick Profile Pill */}
        <div className="shrink-0 pt-2 border-t border-white/10 space-y-2">
          {/* Rail Collapse Toggle Button */}
          <button
            type="button"
            onClick={() => toggleRail(!isCompactRail)}
            title={isCompactRail ? "Expand Sidebar" : "Collapse to Rail"}
            className={`w-full flex items-center gap-2.5 rounded-xl py-2 px-2 text-slate-400 hover:text-white hover:bg-white/5 transition-colors text-xs font-semibold ${
              isCompactRail ? "justify-center" : "justify-between"
            }`}
          >
            <div className="flex items-center gap-2.5">
              {isCompactRail ? (
                <PanelLeft className="h-4 w-4 text-slate-300" />
              ) : (
                <>
                  <PanelLeftClose className="h-4 w-4 text-slate-400" />
                  <span>Collapse Rail</span>
                </>
              )}
            </div>
          </button>

          {/* User Profile Mini Trigger */}
          <button
            type="button"
            onClick={() => setUserDrawerOpen(true)}
            className={`w-full flex items-center gap-2.5 p-1 rounded-xl hover:bg-white/5 transition-colors text-left ${
              isCompactRail ? "justify-center" : "justify-between"
            }`}
          >
            <div className="w-8 h-8 rounded-full bg-[#ff6900] text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-sm">
              {initials || "AD"}
            </div>
            {!isCompactRail && (
              <div className="min-w-0 flex-1 leading-tight">
                <div className="text-xs font-bold text-white truncate">{userName}</div>
                <div className="text-[10px] text-slate-400 capitalize truncate">{userRole}</div>
              </div>
            )}
          </button>
        </div>
      </aside>

      {/* Backdrop for mobile menu */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* ------------------------------------------------------------- */}
      {/* 2. MAIN CONTAINER & TOP NAVIGATION BAR (Matching Zoho Header)  */}
      {/* ------------------------------------------------------------- */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-200 ${
          isCompactRail ? "lg:pl-16" : "lg:pl-64"
        }`}
      >
        {/* Sticky Top Bar */}
        <header className="h-16 shrink-0 bg-white/95 backdrop-blur-sm border-b border-slate-200/80 px-4 sm:px-8 flex items-center justify-between sticky top-0 z-20">
          {/* Left: Mobile hamburger & Interactive Search */}
          <div className="flex items-center gap-3 relative" ref={searchContainerRef}>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>

            {/* Quick module search bar */}
            <div className="relative w-56 sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                placeholder="Search modules, tasks, features..."
                className="w-full pl-9 pr-4 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none transition focus:bg-white focus:border-[#ff6900] focus:ring-2 focus:ring-[#ff6900]/10"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded text-slate-400 hover:text-slate-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Quick Search Palette */}
            {searchFocused && searchQuery.trim().length > 0 && (
              <div className="absolute top-full left-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 py-2 z-50 max-h-96 overflow-y-auto">
                <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Matching Modules ({searchResults.length})
                </div>

                {searchResults.length === 0 ? (
                  <div className="px-4 py-6 text-center text-xs text-slate-500">
                    No matching modules found for &ldquo;{searchQuery}&rdquo;
                  </div>
                ) : (
                  <div className="mt-1 divide-y divide-slate-100">
                    {searchResults.map((res) => {
                      const Icon = res.icon;
                      return (
                        <Link
                          key={res.path + res.label}
                          to={res.path}
                          onClick={() => {
                            setSearchFocused(false);
                            setSearchQuery("");
                          }}
                          className="flex items-start gap-3 px-3.5 py-2.5 hover:bg-slate-50 transition-colors group"
                        >
                          <div className="p-1.5 rounded-lg bg-orange-50 text-[#ff6900] group-hover:bg-[#ff6900] group-hover:text-white transition-colors shrink-0">
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-semibold text-slate-900 group-hover:text-[#ff6900] transition-colors">
                                {res.label}
                              </span>
                              <span className="text-[10px] font-medium text-slate-400">
                                {res.group}
                              </span>
                            </div>
                            {res.description && (
                              <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                                {res.description}
                              </p>
                            )}
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Action Items: Notifications, App Launcher, User Avatar (Matching Image 1 & 2) */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Notification Bell */}
            <Link
              to="/account/notifications"
              className="relative p-2 rounded-xl hover:bg-slate-100 text-slate-600 transition-colors"
              title="Notifications"
            >
              <Bell className="h-4 w-4" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#ff6900] ring-2 ring-white" />
            </Link>

            {/* Settings Gear */}
            <Link
              to="/admin/settings"
              className="p-2 rounded-xl hover:bg-slate-100 text-slate-600 transition-colors hidden sm:inline-flex"
              title="Settings"
            >
              <Settings className="h-4 w-4" />
            </Link>

            {/* --------------------------------------------------------- */}
            {/* 9-DOTS APP LAUNCHER BUTTON (Matching Image 3)             */}
            {/* --------------------------------------------------------- */}
            <button
              type="button"
              onClick={() => setAppLauncherOpen(true)}
              className="p-2 rounded-xl hover:bg-slate-100 text-slate-700 hover:text-slate-900 transition-colors"
              title="App Launcher & Applications Directory"
            >
              <LayoutGrid className="h-5 w-5 text-slate-700" />
            </button>

            {/* --------------------------------------------------------- */}
            {/* USER PROFILE AVATAR (Matching Image 2)                    */}
            {/* --------------------------------------------------------- */}
            <button
              type="button"
              onClick={() => setUserDrawerOpen(true)}
              className="flex items-center gap-2 p-1 pl-1.5 rounded-full hover:bg-slate-100 transition border border-slate-200/80 shadow-sm"
              title="User Account & Settings"
            >
              <div className="w-8 h-8 rounded-full bg-[#0a1128] text-white font-bold text-xs flex items-center justify-center">
                {initials || "AD"}
              </div>
              <ChevronDown className="h-3.5 w-3.5 text-slate-500 mr-1" />
            </button>
          </div>
        </header>

        {/* Inner Content View */}
        <main className="p-4 sm:p-8 space-y-6 max-w-7xl mx-auto w-full flex-1 pb-16">
          {children}
        </main>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 3. 9-DOTS APP LAUNCHER SLIDE-OVER DRAWER (Image 3)            */}
      {/* ------------------------------------------------------------- */}
      {appLauncherOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity"
            onClick={() => setAppLauncherOpen(false)}
          />

          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-md bg-[#0d1633] text-white shadow-2xl flex flex-col justify-between">
              {/* Drawer Top Header & Search */}
              <div className="p-5 border-b border-white/10 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-[#ff6900] text-white flex items-center justify-center">
                      <LayoutGrid className="h-4 w-4" />
                    </div>
                    <h3 className="font-extrabold text-sm text-white">Application Launcher</h3>
                  </div>

                  <button
                    type="button"
                    onClick={() => setAppLauncherOpen(false)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Search in Apps */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={launcherSearch}
                    onChange={(e) => setLauncherSearch(e.target.value)}
                    placeholder="Search applications & tools..."
                    className="w-full pl-9 pr-3 py-2 text-xs bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-400 outline-none focus:border-[#ff6900] focus:ring-1 focus:ring-[#ff6900]"
                  />
                </div>
              </div>

              {/* Scrollable Apps Grid */}
              <div className="flex-1 overflow-y-auto p-5 space-y-6 scrollbar-thin scrollbar-thumb-white/10">
                {/* Featured App Banner (Image 3) */}
                <div className="p-4 rounded-2xl bg-gradient-to-r from-orange-600/30 to-amber-600/20 border border-orange-500/30 relative overflow-hidden">
                  <div className="relative z-10">
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-[#ff6900] text-white uppercase tracking-wider">
                      Featured Module
                    </span>
                    <h4 className="text-sm font-bold text-white mt-1.5">
                      Stanforte People & Payroll
                    </h4>
                    <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                      Automated salary calculations, statutory deductions (PAYE, NHF, Pension), and one-click bank disbursement.
                    </p>
                    <Link
                      to="/admin/payroll/authorization"
                      onClick={() => setAppLauncherOpen(false)}
                      className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-orange-400 hover:text-orange-300 transition"
                    >
                      <span>Open Payroll Authorization</span>
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                </div>

                {/* Categorized Apps List */}
                {filteredCatalog.map((cat) => (
                  <div key={cat.category} className="space-y-2.5">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      {cat.category}
                    </p>

                    <div className="grid grid-cols-2 gap-2.5">
                      {cat.apps.map((app) => {
                        const Icon = app.icon;
                        return (
                          <Link
                            key={app.name}
                            to={app.path}
                            onClick={() => setAppLauncherOpen(false)}
                            className="p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/20 transition-all group flex flex-col justify-between"
                          >
                            <div className="flex items-center justify-between gap-2 mb-2">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${app.color}`}>
                                <Icon className="h-4 w-4" />
                              </div>
                              {app.badge && (
                                <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-[#ff6900] text-white">
                                  {app.badge}
                                </span>
                              )}
                            </div>

                            <div>
                              <p className="text-xs font-bold text-white group-hover:text-orange-400 transition-colors">
                                {app.name}
                              </p>
                              <p className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">
                                {app.description}
                              </p>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {/* Bottom Footer */}
              <div className="p-4 border-t border-white/10 text-center text-xs text-slate-400">
                Organization: <span className="text-white font-bold">{orgName}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 4. USER PROFILE SLIDE-OVER DRAWER (Image 2)                   */}
      {/* ------------------------------------------------------------- */}
      {userDrawerOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity"
            onClick={() => setUserDrawerOpen(false)}
          />

          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-sm bg-[#0d1633] text-white shadow-2xl flex flex-col justify-between">
              {/* Top User Card */}
              <div className="p-6 border-b border-white/10 relative">
                <button
                  type="button"
                  onClick={() => setUserDrawerOpen(false)}
                  className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
                >
                  <X className="h-4 w-4" />
                </button>

                <div className="flex flex-col items-center text-center space-y-3 pt-2">
                  <div className="w-20 h-20 rounded-full bg-[#ff6900] text-white font-black text-2xl flex items-center justify-center ring-4 ring-white/10 shadow-xl">
                    {initials || "AD"}
                  </div>

                  <div>
                    <h3 className="text-base font-extrabold text-white">{userName}</h3>
                    <p className="text-xs text-slate-400">{user?.email || "staff@stanforteedge.com"}</p>
                    <span className="inline-block mt-2 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-white/10 text-orange-400 border border-white/10">
                      {userRole}
                    </span>
                  </div>

                  {/* Admin Console Switch Action (Image 2) */}
                  {isAdmin && (
                    <div className="w-full pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          switchWorkspaceMode(workspaceMode === "admin" ? "employee" : "admin");
                          setUserDrawerOpen(false);
                        }}
                        className={`w-full py-2 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-md ${
                          workspaceMode === "admin"
                            ? "bg-slate-800 text-slate-200 border border-slate-700"
                            : "bg-blue-600 hover:bg-blue-500 text-white"
                        }`}
                      >
                        <ShieldCheck className="h-4 w-4" />
                        <span>
                          {workspaceMode === "admin" ? "Return to My Workspace" : "Open Admin Console"}
                        </span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Drawer Body Settings & Preferences */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Account Links */}
                <div className="space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                    Account & Preferences
                  </p>
                  <Link
                    to="/account/profile"
                    onClick={() => setUserDrawerOpen(false)}
                    className="flex items-center justify-between p-2.5 rounded-xl hover:bg-white/5 text-xs font-semibold text-slate-200 transition"
                  >
                    <div className="flex items-center gap-2.5">
                      <UserIcon className="h-4 w-4 text-slate-400" />
                      <span>My Profile</span>
                    </div>
                    <ChevronRight className="h-3.5 w-3.5 text-slate-500" />
                  </Link>

                  <Link
                    to="/admin/settings"
                    onClick={() => setUserDrawerOpen(false)}
                    className="flex items-center justify-between p-2.5 rounded-xl hover:bg-white/5 text-xs font-semibold text-slate-200 transition"
                  >
                    <div className="flex items-center gap-2.5">
                      <Settings className="h-4 w-4 text-slate-400" />
                      <span>System Settings</span>
                    </div>
                    <ChevronRight className="h-3.5 w-3.5 text-slate-500" />
                  </Link>
                </div>

                {/* Left Panel Density Control (Image 2) */}
                <div className="space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Sidebar Density
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => toggleRail(false)}
                      className={`p-2.5 rounded-xl border text-xs font-bold transition flex items-center gap-2 justify-center ${
                        !isCompactRail
                          ? "bg-[#ff6900] text-white border-[#ff6900]"
                          : "bg-white/5 text-slate-300 border-white/10 hover:bg-white/10"
                      }`}
                    >
                      <PanelLeft className="h-3.5 w-3.5" />
                      <span>Expanded (240px)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleRail(true)}
                      className={`p-2.5 rounded-xl border text-xs font-bold transition flex items-center gap-2 justify-center ${
                        isCompactRail
                          ? "bg-[#ff6900] text-white border-[#ff6900]"
                          : "bg-white/5 text-slate-300 border-white/10 hover:bg-white/10"
                      }`}
                    >
                      <PanelLeftClose className="h-3.5 w-3.5" />
                      <span>Compact Rail (64px)</span>
                    </button>
                  </div>
                </div>

                {/* Appearance Mode (Image 2) */}
                <div className="space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Appearance Mode
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: "light" as const, label: "Light", icon: Sun },
                      { id: "dark" as const, label: "Dark", icon: Moon },
                      { id: "system" as const, label: "System", icon: Laptop },
                    ].map((mode) => {
                      const Icon = mode.icon;
                      const active = appearanceMode === mode.id;
                      return (
                        <button
                          key={mode.id}
                          type="button"
                          onClick={() => setAppearanceMode(mode.id)}
                          className={`p-2 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                            active
                              ? "bg-white text-slate-900 border-white font-bold"
                              : "bg-white/5 text-slate-400 border-white/10 hover:bg-white/10"
                          }`}
                        >
                          <Icon className="h-3.5 w-3.5" />
                          <span>{mode.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Bottom Sign Out Button (Image 2) */}
              <div className="p-6 border-t border-white/10">
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="w-full py-2.5 px-4 rounded-xl bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/30 text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm"
                >
                  <LogOut className="h-4 w-4" />
                  <span>SIGN OUT</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
