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
  LogOut,
  Menu,
  X,
  User as UserIcon,
} from "lucide-react";

export interface NavItemDef {
  label: string;
  icon: any;
  path: string;
  badge?: string;
  aliases?: string[];
  description?: string;
}

export interface NavGroupDef {
  title: string;
  items: NavItemDef[];
}

export const PORTAL_NAV_GROUPS: NavGroupDef[] = [
  {
    title: "Main",
    items: [
      {
        label: "Dashboard",
        icon: LayoutDashboard,
        path: "/dashboard",
        aliases: ["Home", "Overview"],
        description: "Organization executive KPI metrics & activity stream",
      },
    ],
  },
  {
    title: "HR & Workforce",
    items: [
      {
        label: "Employees",
        icon: Users,
        path: "/admin/users",
        aliases: ["HR & Workforce", "Users", "Directory", "Staff"],
        description: "Employee directory, profiles, onboarding and roles",
      },
      {
        label: "Attendance",
        icon: Clock,
        path: "/attendance",
        aliases: ["Time & Attendance", "Clock In", "Shifts"],
        description: "Clock in/out, geolocation, hours tracked and anomalies",
      },
      {
        label: "Leave & Absence",
        icon: Calendar,
        path: "/leave",
        aliases: ["Leave", "Time Off", "Vacation", "Sick Leave"],
        description: "Annual leave balance, requests and team calendar",
      },
      {
        label: "Teams & Groups",
        icon: UserCheck,
        path: "/teams",
        aliases: ["Teams", "Groups", "Departments", "Divisions"],
        description: "Organizational units, project groups and member rosters",
      },
      {
        label: "Timesheets",
        icon: CalendarCheck,
        path: "/account/timesheets",
        aliases: ["Timesheet", "Work Logs"],
        description: "Weekly timesheet submission and project allocation",
      },
    ],
  },
  {
    title: "Finance & Payroll",
    items: [
      {
        label: "Finance Hub",
        icon: Building2,
        path: "/finance",
        aliases: ["Finance", "Finance & Procurement", "Cash Flow"],
        description: "Treasury overview, payables, receivables and burn rate",
      },
      {
        label: "Payroll Runs",
        icon: CreditCard,
        path: "/admin/payroll/authorization",
        aliases: ["Payroll", "Payroll Authorization", "Disbursements"],
        description: "Monthly payroll cycles, authorization queues and deductions",
      },
      {
        label: "Accounts & Ledger",
        icon: Wallet,
        path: "/finance/accounts",
        aliases: ["Accounts", "Ledger", "Chart of Accounts", "GL"],
        description: "Bank accounts, journal entries and general ledger balances",
      },
      {
        label: "Budgets & Plans",
        icon: PieChart,
        path: "/finance/budgets",
        aliases: ["Budgets", "Fiscal Year"],
        description: "Departmental allocations, capital budgets and variances",
      },
      {
        label: "Procurement",
        icon: ShoppingCart,
        path: "/procurement",
        aliases: ["Procurement", "Purchasing", "Purchase Orders"],
        description: "Requisitions, supplier POs and vendor fulfillment",
      },
      {
        label: "My Payslips",
        icon: Receipt,
        path: "/account/payslips",
        aliases: ["Payslips", "Salary"],
        description: "Personal monthly pay stubs and tax deduction summaries",
      },
    ],
  },
  {
    title: "Workflows & Operations",
    items: [
      {
        label: "Approvals",
        icon: FileCheck,
        path: "/requests/approvals",
        badge: "23",
        aliases: ["Approval Queue", "Pending Approvals"],
        description: "Managerial decision queue for finance, leave and procurement",
      },
      {
        label: "My Requests",
        icon: FileText,
        path: "/requests",
        aliases: ["Requests", "Requisitions"],
        description: "Track personal submissions, audit trail and resolution times",
      },
      {
        label: "Projects",
        icon: Briefcase,
        path: "/projects",
        aliases: ["Project Management", "Initiatives"],
        description: "Cross-functional project tracking, milestones and budgets",
      },
      {
        label: "Tasks & Standup",
        icon: CheckSquare,
        path: "/tasks",
        aliases: ["Tasks", "Daily Log", "Standup"],
        description: "Action items, daily standup check-ins and progress notes",
      },
    ],
  },
  {
    title: "Company & Media",
    items: [
      {
        label: "Documents",
        icon: FolderOpen,
        path: "/documents",
        aliases: ["Docs", "Company Documents"],
        description: "Corporate repository, templates and verified filings",
      },
      {
        label: "Policies",
        icon: BookOpen,
        path: "/policies",
        aliases: ["Policy Handbook", "Compliance", "Guidelines"],
        description: "Standard operating procedures, code of conduct and handbooks",
      },
      {
        label: "File Storage",
        icon: HardDrive,
        path: "/files",
        aliases: ["Files", "Storage", "Attachments"],
        description: "Encrypted enterprise cloud file repository",
      },
      {
        label: "Company Mail",
        icon: Mail,
        path: "/mail",
        aliases: ["Mail", "Inbox", "Messages"],
        description: "Internal communication feed and workspace dispatches",
      },
    ],
  },
  {
    title: "Administration",
    items: [
      {
        label: "Roles & Access",
        icon: Shield,
        path: "/admin/roles",
        aliases: ["Roles", "Permissions", "RBAC", "Access Control"],
        description: "Granular capabilities, permissions matrix and role grants",
      },
      {
        label: "Legal Entities",
        icon: Landmark,
        path: "/admin/organizations",
        aliases: ["Organizations", "Subsidiaries", "Entities"],
        description: "Multi-tenant corporate legal entities and parent orgs",
      },
      {
        label: "System Settings",
        icon: Settings,
        path: "/admin/settings",
        aliases: ["Settings", "Admin Settings", "Configuration"],
        description: "Workspace profile, taxonomies, request types and audit log",
      },
    ],
  },
];

export type NavItemKey =
  | "Dashboard"
  | "HR & Workforce"
  | "Attendance"
  | "Leave & Absence"
  | "Payroll"
  | "Finance & Procurement"
  | "Approvals"
  | "Requests"
  | "Reports"
  | "Settings"
  | string;

interface PortalLayoutProps {
  children: ReactNode;
  activeNav?: NavItemKey;
}

export function PortalLayout({ children, activeNav }: PortalLayoutProps) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Collapsible category state (all open by default)
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  const toggleGroup = (title: string) => {
    setCollapsedGroups((prev) => ({
      ...prev,
      [title]: !prev[title],
    }));
  };

  const userName = user?.first_name
    ? `${user.first_name} ${user.last_name || ""}`.trim()
    : user?.email?.split("@")[0] || "Daniel Owonikoko";

  const userRole = user?.roles?.[0]
    ? String(user.roles[0]).replace(/_/g, " ")
    : "Administrator";

  const orgName =
    (user as any)?.workspace_name ||
    user?.organizations?.[0]?.name ||
    "Acme Nigeria Ltd";

  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const currentPath = location?.pathname || "";

  // Intelligent active item detection
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

  // Flattened items for global search
  const allNavItems = useMemo(() => {
    const list: Array<NavItemDef & { group: string }> = [];
    for (const group of PORTAL_NAV_GROUPS) {
      for (const item of group.items) {
        list.push({ ...item, group: group.title });
      }
    }
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

  // Click outside search container to close dropdown
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

  return (
    <div className="h-screen w-screen overflow-hidden bg-[#f4f7fc] flex font-sans text-slate-900 selection:bg-[#ff6900] selection:text-white antialiased">
      {/* 1. Left Sidebar (Fixed on Desktop & Mobile Viewport) */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 h-full bg-[#0a1128] text-white flex flex-col justify-between shrink-0 p-4 transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Top Logo Header */}
        <div className="pt-2 pb-4 flex items-center justify-between shrink-0 border-b border-white/10">
          <Link to="/dashboard" className="inline-block">
            <StanforteLogo variant="dark" className="h-8" />
          </Link>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Navigation Groups */}
        <div className="flex-1 overflow-y-auto min-h-0 my-3 pr-1 space-y-5 scrollbar-thin scrollbar-thumb-white/10 hover:scrollbar-thumb-white/20">
          {PORTAL_NAV_GROUPS.map((group) => {
            const isGroupActive = group.items.some(isItemActive);
            const isCollapsed = !isGroupActive && !!collapsedGroups[group.title];

            return (
              <div key={group.title} className="space-y-1">
                {/* Group Header Button */}
                <button
                  type="button"
                  onClick={() => toggleGroup(group.title)}
                  className="w-full flex items-center justify-between px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 hover:text-slate-200 transition-colors"
                >
                  <span>{group.title}</span>
                  <ChevronDown
                    className={`h-3 w-3 text-slate-400 transition-transform duration-150 ${
                      isCollapsed ? "-rotate-90 text-slate-500" : "rotate-0"
                    }`}
                  />
                </button>

                {/* Group Items */}
                {!isCollapsed && (
                  <nav className="space-y-0.5">
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      const isActive = isItemActive(item);

                      return (
                        <Link
                          key={item.label}
                          to={item.path}
                          onClick={() => setMobileMenuOpen(false)}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all group ${
                            isActive
                              ? "bg-[#ff6900] text-white shadow-md shadow-orange-500/25"
                              : "text-slate-300 hover:text-white hover:bg-white/5"
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <Icon
                              className={`h-4 w-4 shrink-0 transition-colors ${
                                isActive ? "text-white" : "text-slate-400 group-hover:text-white"
                              }`}
                            />
                            <span className="truncate">{item.label}</span>
                          </div>

                          {item.badge && (
                            <span
                              className={`px-1.5 py-0.5 text-[10px] font-bold rounded-full shrink-0 ${
                                isActive
                                  ? "bg-white text-[#ff6900]"
                                  : "bg-[#ff6900]/20 text-[#ff8a3d] border border-[#ff6900]/30"
                              }`}
                            >
                              {item.badge}
                            </span>
                          )}
                        </Link>
                      );
                    })}
                  </nav>
                )}
              </div>
            );
          })}
        </div>

        {/* User Profile Pill & Sign Out Dropdown */}
        <div className="relative pt-3 shrink-0 border-t border-white/10">
          <button
            type="button"
            onClick={() => setUserMenuOpen((prev) => !prev)}
            className="w-full flex items-center justify-between p-1.5 rounded-xl hover:bg-white/5 transition-colors text-left"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-orange-500/20 text-[#ff6900] font-bold text-xs flex items-center justify-center border border-orange-500/30 shrink-0">
                {initials || "AD"}
              </div>
              <div className="leading-tight truncate">
                <div className="text-xs font-bold text-white truncate">{userName}</div>
                <div className="text-[10px] text-slate-400 capitalize truncate">{userRole}</div>
              </div>
            </div>
            <ChevronDown
              className={`h-3.5 w-3.5 text-slate-400 shrink-0 transition-transform ${
                userMenuOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {/* User Popover Menu */}
          {userMenuOpen && (
            <div className="absolute bottom-full left-0 right-0 mb-2 bg-[#0d1633] border border-white/10 rounded-xl shadow-2xl py-1.5 z-50 text-xs">
              <div className="px-3 py-2 border-b border-white/5">
                <p className="font-semibold text-white truncate">{userName}</p>
                <p className="text-[10px] text-slate-400 truncate">{user?.email}</p>
              </div>
              <Link
                to="/account/profile"
                onClick={() => setUserMenuOpen(false)}
                className="flex items-center gap-2 px-3 py-2 text-slate-300 hover:text-white hover:bg-white/5"
              >
                <UserIcon className="h-3.5 w-3.5" />
                <span>My Profile</span>
              </Link>
              <Link
                to="/admin/settings"
                onClick={() => setUserMenuOpen(false)}
                className="flex items-center gap-2 px-3 py-2 text-slate-300 hover:text-white hover:bg-white/5"
              >
                <Settings className="h-3.5 w-3.5" />
                <span>System Settings</span>
              </Link>
              <button
                type="button"
                onClick={handleSignOut}
                className="w-full flex items-center gap-2 px-3 py-2 text-rose-400 hover:text-rose-300 hover:bg-white/5 text-left"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Backdrop for mobile sidebar */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* 2. Main Content Column */}
      <div className="flex-1 h-full flex flex-col min-w-0 overflow-hidden">
        {/* Top Header Bar (Pinned) */}
        <header className="h-16 shrink-0 bg-white border-b border-slate-200/80 px-4 sm:px-8 flex items-center justify-between z-20">
          {/* Mobile Menu Button & Global Interactive Search */}
          <div className="flex items-center gap-3 relative" ref={searchContainerRef}>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>

            <div className="relative w-56 sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                placeholder="Search modules, features, tools..."
                className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none transition focus:bg-white focus:border-[#ff6900] focus:ring-2 focus:ring-[#ff6900]/10"
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

            {/* Quick Search Dropdown Palette */}
            {searchFocused && searchQuery.trim().length > 0 && (
              <div className="absolute top-full left-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-2xl border border-slate-200 py-2 z-50 max-h-96 overflow-y-auto">
                <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Matching Features ({searchResults.length})
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

          {/* Right Action Items: Notifications & Org Selector */}
          <div className="flex items-center gap-3 sm:gap-4">
            {/* Notification Bell */}
            <Link
              to="/account/notifications"
              className="relative cursor-pointer p-2 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors"
              title="Notifications"
            >
              <Bell className="h-4 w-4" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#ff6900] ring-2 ring-white" />
            </Link>

            {/* Organization Selector */}
            <Link
              to="/admin/organizations"
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-800 cursor-pointer hover:bg-slate-50 shadow-sm transition-colors"
              title="Switch or view organizations"
            >
              <Building2 className="h-3.5 w-3.5 text-slate-600 shrink-0" />
              <span className="max-w-[130px] sm:max-w-[180px] truncate">{orgName}</span>
              <ChevronDown className="h-3 w-3 text-slate-400 shrink-0" />
            </Link>
          </div>
        </header>

        {/* Page Content (Scrolls independently while Sidebar & Header stay pinned) */}
        <main className="flex-1 overflow-y-auto min-h-0 p-4 sm:p-8">
          <div className="max-w-7xl mx-auto w-full space-y-6 pb-12">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
