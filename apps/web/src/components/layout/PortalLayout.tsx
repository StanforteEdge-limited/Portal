import { useState, useMemo, useRef, useEffect, createContext, useContext, type ReactNode } from "react";
import { Link, useNavigate, useLocation } from "@/shared/router-adapter";
import { useAuth } from "@/shared/context/AuthProvider";
import { useThemeMode } from "@/shared/lib/theme";
import { StanforteLogo } from "@/components/brand/StanforteLogo";
import {
  LayoutDashboard,
  Home,
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
  FolderKanban,
  FolderOpen,
  Folder,
  BookOpen,
  HardDrive,
  Mail,
  MessageSquare,
  Shield,
  Landmark,
  Settings,
  Search,
  Bell,
  HelpCircle,
  ChevronDown,
  ChevronRight,
  LogOut,
  Menu,
  X,
  User as UserIcon,
  LayoutGrid,
  Sun,
  Moon,
  Laptop,
  PanelLeftClose,
  PanelLeft,
  ExternalLink,
  ShieldCheck,
  ArrowRight,
  Globe,
  SlidersHorizontal,
  Sparkles,
  Command,
  Bot,
  Zap,
} from "lucide-react";

export type WorkspaceMode = "employee" | "admin";

export interface WorkspaceContextValue {
  mode: WorkspaceMode;
  isAdmin: boolean;
  switchMode: (mode: WorkspaceMode) => void;
}

export const WorkspaceContext = createContext<WorkspaceContextValue>({
  mode: "employee",
  isAdmin: false,
  switchMode: () => {},
});

const WORKSPACE_MODE_EVENT = "portal-workspace-mode-change";

export function useWorkspace(): WorkspaceContextValue {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

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

  const currentPath = location?.pathname || "";
  const isDefaultAdminRoute =
    currentPath.startsWith("/admin") ||
    currentPath.startsWith("/finance") ||
    currentPath.startsWith("/hr/") ||
    currentPath.startsWith("/procurement") ||
    currentPath.startsWith("/analytics") ||
    currentPath.startsWith("/requests/approvals");

  const computeEffectiveMode = (): WorkspaceMode => {
    if (typeof window === "undefined") return "employee";
    const saved = localStorage.getItem("portal_workspace_mode");
    if (saved === "admin" && isAdmin) return "admin";
    if (saved === "employee") return "employee";
    if (isDefaultAdminRoute && isAdmin) return "admin";
    return "employee";
  };

  const [mode, setMode] = useState<WorkspaceMode>(computeEffectiveMode);

  useEffect(() => {
    setMode(computeEffectiveMode());
  }, [isAdmin, currentPath]);

  useEffect(() => {
    const handleModeChange = (e: Event) => {
      const next = (e as CustomEvent<WorkspaceMode>).detail;
      if (next === "admin" || next === "employee") {
        setMode(next === "admin" && isAdmin ? "admin" : "employee");
      } else {
        setMode(computeEffectiveMode());
      }
    };
    window.addEventListener(WORKSPACE_MODE_EVENT, handleModeChange);
    return () => window.removeEventListener(WORKSPACE_MODE_EVENT, handleModeChange);
  }, [isAdmin, currentPath]);

  const switchMode = (nextMode: WorkspaceMode) => {
    const resolved: WorkspaceMode = nextMode === "admin" && isAdmin ? "admin" : "employee";
    localStorage.setItem("portal_workspace_mode", resolved);
    setMode(resolved);
    window.dispatchEvent(new CustomEvent<WorkspaceMode>(WORKSPACE_MODE_EVENT, { detail: resolved }));

    if (resolved === "employee") {
      if (currentPath.startsWith("/hr/leave")) {
        navigate("/leave");
      } else if (currentPath.startsWith("/hr/attendance")) {
        navigate("/attendance");
      } else if (currentPath.startsWith("/admin/groups")) {
        navigate("/teams");
      } else if (isDefaultAdminRoute) {
        navigate("/dashboard");
      }
    } else {
      if (currentPath === "/leave") {
        navigate("/hr/leave");
      } else if (currentPath === "/attendance") {
        navigate("/hr/attendance");
      } else if (currentPath === "/teams") {
        navigate("/admin/groups");
      } else if (
        currentPath.startsWith("/requests") &&
        !currentPath.startsWith("/requests/approvals")
      ) {
        navigate("/requests/approvals");
      } else if (
        currentPath.startsWith("/account") ||
        currentPath.startsWith("/profile") ||
        currentPath === "/settings"
      ) {
        navigate("/dashboard");
      }
    }
  };

  return {
    mode: mode === "admin" && isAdmin ? "admin" : "employee",
    isAdmin,
    switchMode,
  };
}

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
/**
 * Modern 2026 Navigation Architecture (Linear / Ramp / Stripe / Workday inspired)
 */
export const WORKSPACE_NAV_GROUPS: NavGroupDef[] = [
  {
    title: "Operations",
    items: [
      {
        label: "Admin Console",
        icon: LayoutDashboard,
        path: "/dashboard",
        aliases: ["Dashboard", "Command Center", "Overview"],
        description: "Organization management overview, approvals, and staff workflows",
      },
      {
        label: "Projects",
        icon: FolderKanban,
        path: "/projects",
        aliases: ["Projects", "Project Management", "Initiatives", "Deliverables", "Admin Projects", "Workspaces"],
        description: "Organization initiatives, roadmaps, milestones, and task deliverables",
      },
      {
        label: "Staff Tasks",
        icon: CheckSquare,
        path: "/tasks",
        aliases: ["Tasks", "Tasks & Board", "Work Items", "Kanban", "Deliverables", "Sprints"],
        description: "Assign tasks to any staff member, monitor team lanes, and manage sprints",
      },
      {
        label: "Approvals",
        icon: FileCheck,
        path: "/requests/approvals",
        aliases: ["Decisions", "Approval Queue", "Vouchers"],
        description: "Tiered sign-off queue for staff requisitions, vouchers, and leave",
      },
      {
        label: "Analytics",
        icon: PieChart,
        path: "/analytics",
        aliases: ["Workspace Analytics", "Insights", "Metrics"],
        description: "Organization SLA velocity, attendance rhythms, and turnaround analytics",
      },
    ],
  },
  {
    title: "People & Workforce",
    items: [
      {
        label: "Employees",
        icon: UserCheck,
        path: "/admin/users",
        aliases: ["Staff", "Directory", "HR", "Workforce"],
        description: "Centralized personnel directory, onboarding, and staff profiles",
      },
      {
        label: "Staff Attendance",
        icon: Clock,
        path: "/hr/attendance",
        aliases: ["Time & Attendance", "Shifts", "Attendance"],
        description: "Workforce check-in roster, punctuality logs, and correction approvals",
      },
      {
        label: "Staff Leave",
        icon: Calendar,
        path: "/hr/leave",
        aliases: ["Leave Management", "Leave & Absence", "Vacation", "Absence", "Time Off"],
        description: "Review staff leave applications, approve time off, and track who is out",
      },
      {
        label: "Teams & Units",
        icon: Users,
        path: "/admin/groups",
        aliases: ["Teams", "Teams & Groups", "Groups", "Departments", "Roster"],
        description: "Manage organizational departments, squads, and team rosters",
      },
    ],
  },
  {
    title: "Finance",
    items: [
      {
        label: "Ledger",
        icon: Wallet,
        path: "/finance/accounts",
        aliases: ["Accounts", "General Ledger", "GL", "Cash Flow"],
        description: "Operating bank accounts and ledger entries",
      },
      {
        label: "Payroll",
        icon: CreditCard,
        path: "/admin/payroll/authorization",
        aliases: ["Payroll Runs", "Salary", "PAYE", "Disbursements"],
        description: "Automated monthly payroll runs and remittances",
      },
      {
        label: "Vouchers",
        icon: Receipt,
        path: "/finance/payment-vouchers",
        aliases: ["Payment Vouchers", "PVs", "Disbursements"],
        description: "Disbursement vouchers and expense retirements",
      },
      {
        label: "Procurement",
        icon: ShoppingCart,
        path: "/procurement",
        aliases: ["Procurement & POs", "Purchase Orders", "Vendors"],
        description: "Purchase requisitions, orders, and fulfillment",
      },
    ],
  },
  {
    title: "Governance",
    items: [
      {
        label: "Roles",
        icon: Shield,
        path: "/admin/roles",
        aliases: ["Roles & Permissions", "RBAC", "Access"],
        description: "Granular capabilities and authorization",
      },
      {
        label: "Legal",
        icon: Landmark,
        path: "/admin/organizations",
        aliases: ["Legal Entities", "Organizations", "Subsidiaries"],
        description: "Corporate legal entities and branch subsidiaries",
      },
      {
        label: "Settings",
        icon: Settings,
        path: "/admin/settings",
        aliases: ["System Settings", "Configuration"],
        description: "Security policies, audit logs, and preferences",
      },
    ],
  },
];

export const ADMIN_NAV_GROUPS = WORKSPACE_NAV_GROUPS;

export const EMPLOYEE_PRIMARY_NAV_ITEMS: NavItemDef[] = [
  {
    label: "Dashboard",
    icon: Home,
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
    label: "Leave",
    icon: Calendar,
    path: "/leave",
    aliases: ["Leave & Absence", "Time Off", "Vacation", "HR & Workforce"],
    description: "Submit leave requests and view balances",
  },
  {
    label: "My Tasks",
    icon: CheckSquare,
    path: "/tasks",
    aliases: ["Tasks", "Tasks & Board", "Deliverables"],
    description: "Personal to-dos, assigned deliverables, and daily standup logs",
  },
  {
    label: "My Requests",
    icon: FileText,
    path: "/requests",
    aliases: ["Requests", "Requisitions"],
    description: "Track personal requisitions and approvals",
  },
  {
    label: "Payslips",
    icon: CreditCard,
    path: "/account/payslips",
    aliases: ["My Payslips", "Salary"],
    description: "Monthly salary statements and tax deductions",
  },
];

export const EMPLOYEE_SECONDARY_NAV_ITEMS: NavItemDef[] = [
  {
    label: "Projects",
    icon: FolderKanban,
    path: "/projects",
    aliases: ["Projects", "Project Management", "Initiatives", "Deliverables", "Workspaces"],
    description: "Team projects, deliverables, and timelines",
  },
  {
    label: "Teams",
    icon: Users,
    path: "/teams",
    aliases: ["Teams & Groups", "Departments"],
    description: "Team rosters and work groups",
  },
  {
    label: "Documents",
    icon: FolderOpen,
    path: "/documents",
    aliases: ["Docs", "Policies"],
    description: "Company policies and handbook",
  },
  {
    label: "Chat",
    icon: MessageSquare,
    path: "/chat",
    aliases: ["Team Chat", "Messages"],
    description: "Real-time communication and file sharing",
  },
];

export const EMPLOYEE_NAV_ITEMS: NavItemDef[] = [
  ...EMPLOYEE_PRIMARY_NAV_ITEMS,
  ...EMPLOYEE_SECONDARY_NAV_ITEMS,
];

export interface AppLauncherItem {
  name: string;
  description: string;
  icon: any;
  path: string;
  color: string;
  badge?: string;
}

export interface AppLauncherCategory {
  category: string;
  adminOnly?: boolean;
  apps: AppLauncherItem[];
}

/**
 * All Application Catalog for the 9-dots App Launcher
 */
export const APP_LAUNCHER_CATALOG: AppLauncherCategory[] = [
  {
    category: "HR & Workforce",
    apps: [
      {
        name: "Employees",
        description: "Directory, onboarding & staff profiles",
        icon: Users,
        path: "/admin/users",
        color: "bg-neutral-100 text-neutral-700",
      },
      {
        name: "Attendance",
        description: "Clock in/out, geolocation & shifts",
        icon: Clock,
        path: "/attendance",
        color: "bg-neutral-100 text-neutral-700",
      },
      {
        name: "Leave & Absence",
        description: "Vacation tracking, holidays & sign-offs",
        icon: Calendar,
        path: "/leave",
        color: "bg-neutral-100 text-neutral-700",
      },
      {
        name: "Teams & Groups",
        description: "Departments, committees & rosters",
        icon: UserCheck,
        path: "/teams",
        color: "bg-neutral-100 text-neutral-700",
      },
      {
        name: "Timesheets",
        description: "Weekly work logs & project tracking",
        icon: CalendarCheck,
        path: "/account/timesheets",
        color: "bg-neutral-100 text-neutral-700",
      },
    ],
  },
  {
    category: "Finance & Treasury",
    apps: [
      {
        name: "Finance Hub",
        description: "Cash flow, payables & burn rate",
        icon: Building2,
        path: "/finance",
        color: "bg-neutral-100 text-neutral-700",
      },
      {
        name: "Payroll Runs",
        description: "Disbursement cycles & authorizations",
        icon: CreditCard,
        path: "/admin/payroll/authorization",
        color: "bg-neutral-100 text-neutral-700",
      },
      {
        name: "Accounts & Ledger",
        description: "Bank accounts & General Ledger",
        icon: Wallet,
        path: "/finance/accounts",
        color: "bg-neutral-100 text-neutral-700",
      },
      {
        name: "Payment Vouchers",
        description: "Disbursement register & retirement audit",
        icon: Receipt,
        path: "/finance/payment-vouchers",
        color: "bg-neutral-100 text-neutral-700",
      },
      {
        name: "Budgets & Plans",
        description: "Fiscal departmental budget variances",
        icon: PieChart,
        path: "/finance/budgets",
        color: "bg-neutral-100 text-neutral-700",
      },
      {
        name: "Procurement",
        description: "Requisitions, purchase orders & vendors",
        icon: ShoppingCart,
        path: "/procurement",
        color: "bg-neutral-100 text-neutral-700",
      },
      {
        name: "My Payslips",
        description: "Personal monthly pay stubs & tax files",
        icon: Receipt,
        path: "/account/payslips",
        color: "bg-neutral-100 text-neutral-700",
      },
    ],
  },
  {
    category: "Operations & Workflows",
    apps: [
      {
        name: "Approval Queue",
        description: "Managerial decision inbox",
        icon: FileCheck,
        path: "/requests/approvals",
        color: "bg-neutral-100 text-neutral-700",
      },
      {
        name: "My Requests",
        description: "Procurement, financial & HR tickets",
        icon: FileText,
        path: "/requests",
        color: "bg-neutral-100 text-neutral-700",
      },
      {
        name: "Projects",
        description: "Initiatives, milestones & delivery",
        icon: Briefcase,
        path: "/projects",
        color: "bg-neutral-100 text-neutral-700",
      },
      {
        name: "Documents",
        description: "Corporate repository & verified filings",
        icon: FolderOpen,
        path: "/documents",
        color: "bg-neutral-100 text-neutral-700",
      },
      {
        name: "Policies",
        description: "Code of conduct & employee handbooks",
        icon: BookOpen,
        path: "/policies",
        color: "bg-neutral-100 text-neutral-700",
      },
      {
        name: "Company Mail",
        description: "Internal notifications & broadcast stream",
        icon: Mail,
        path: "/mail",
        color: "bg-neutral-100 text-neutral-700",
      },
      {
        name: "Team Chat",
        description: "Direct messaging, channels & file sharing",
        icon: MessageSquare,
        path: "/chat",
        color: "bg-neutral-100 text-neutral-700",
      },
    ],
  },
  {
    category: "Administration & Security",
    adminOnly: true,
    apps: [
      {
        name: "Roles & Access",
        description: "Granular RBAC permissions matrix",
        icon: Shield,
        path: "/admin/roles",
        color: "bg-neutral-100 text-neutral-700",
      },
      {
        name: "Legal Entities",
        description: "Corporate subsidiaries & organizations",
        icon: Landmark,
        path: "/admin/organizations",
        color: "bg-neutral-100 text-neutral-700",
      },
      {
        name: "System Settings",
        description: "System audit logs, taxonomies & config",
        icon: Settings,
        path: "/admin/settings",
        color: "bg-neutral-100 text-neutral-700",
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
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const userDropdownRef = useRef<HTMLDivElement>(null);
  const [appLauncherOpen, setAppLauncherOpen] = useState(false);

  // 2026 AI-Native & Command Palette States
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [commandQuery, setCommandQuery] = useState("");
  const [aiDrawerOpen, setAiDrawerOpen] = useState(false);
  const [aiInput, setAiInput] = useState("");
  const [aiConversation, setAiConversation] = useState<Array<{ sender: "user" | "ai"; text: string; data?: any; time: string }>>([
    {
      sender: "ai",
      text: "Hello Daniel. I'm Stanforte AI, your operational co-pilot for 2026. How can I assist you with approvals, attendance, payroll, or vouchers today?",
      time: "Just now",
    },
  ]);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  const toggleGroup = (title: string) => {
    setCollapsedGroups((prev) => ({ ...prev, [title]: !prev[title] }));
  };

  // Lock background page scroll whenever any side panel or modal is open
  const isAnyOverlayOpen =
    mobileMenuOpen || userDrawerOpen || appLauncherOpen || commandPaletteOpen || aiDrawerOpen;
  useEffect(() => {
    if (!isAnyOverlayOpen || typeof document === "undefined") return;
    const prevBodyOverflow = document.body.style.overflow;
    const prevHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevBodyOverflow;
      document.documentElement.style.overflow = prevHtmlOverflow;
    };
  }, [isAnyOverlayOpen]);

  // Global ⌘K / Ctrl+K keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
      }
      if (e.key === "Escape") {
        setCommandPaletteOpen(false);
        setAiDrawerOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Search
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // App Launcher search
  const [launcherSearch, setLauncherSearch] = useState("");

  // Appearance Mode ('system' | 'light' | 'dark') — saved to user profile, falls back to tenant default
  const {
    mode: appearanceMode,
    userMode: userThemeMode,
    tenantDefault: tenantDefaultTheme,
    isDark: isDarkTheme,
    setMode: setAppearanceMode,
    toggleLightDark: toggleThemeMode,
  } = useThemeMode();

  // Compact Rail Mode (persisted)
  const [isCompactRail, setIsCompactRail] = useState(() => {
    return localStorage.getItem("portal_rail_compact") === "true";
  });

  const toggleRail = (compact: boolean) => {
    setIsCompactRail(compact);
    localStorage.setItem("portal_rail_compact", String(compact));
  };

  // Determine User Role, Admin Authority & Active Workspace Mode
  const { mode: workspaceMode, isAdmin, switchMode: switchWorkspaceMode } = useWorkspace();
  const currentPath = location?.pathname || "";

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
    if (item.path === "/projects" && (currentPath === "/admin/projects" || currentPath.startsWith("/admin/projects/"))) {
      return true;
    }
    return false;
  };

  // Flattened searchable navigation list
  const allNavItems = useMemo(() => {
    const list: Array<NavItemDef & { group: string }> = [];
    if (isAdmin) {
      ADMIN_NAV_GROUPS.forEach((group) => {
        group.items.forEach((item) => {
          list.push({ ...item, group: group.title });
        });
      });
      list.push({
        label: "Analytics",
        icon: PieChart,
        path: "/analytics",
        group: "Insights",
        description: "Workspace analytics, punctuality velocity, and turnaround rhythms",
      });
    }
    EMPLOYEE_NAV_ITEMS.forEach((item) => {
      list.push({ ...item, group: "Staff Workspace" });
    });
    return list;
  }, [isAdmin]);

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

  // Workspace Command Palette Navigation Shortcuts (real routes only, no mock records)
  const commandEntities = useMemo(() => {
    const baseEntities = [
      { id: "nav-dash", type: "Workspace", title: "Dashboard", subtitle: "Attendance, requests, and shift overview", path: "/dashboard", icon: CheckSquare, tag: "Core" },
      { id: "nav-att", type: "HR", title: "Attendance", subtitle: "Daily clock-in logs and shift records", path: "/attendance", icon: Calendar, tag: "HR" },
      { id: "nav-lv", type: "HR", title: "Leave", subtitle: "Leave balances and time-off requests", path: "/leave", icon: Calendar, tag: "HR" },
      { id: "nav-req", type: "Workflow", title: "Requests", subtitle: "Submitted requisitions and status tracking", path: "/requests", icon: Receipt, tag: "Workflow" },
      { id: "nav-doc", type: "Documents", title: "Documents & policies", subtitle: "Company handbook and signed directives", path: "/documents", icon: FolderOpen, tag: "Docs" },
      { id: "nav-pay", type: "Account", title: "Payslips", subtitle: "Monthly salary statements and deductions", path: "/account/payslips", icon: CreditCard, tag: "Self-service" },
      { id: "nav-tsk", type: "Operations", title: "Tasks", subtitle: "Assigned operational deliverables", path: "/tasks", icon: CheckSquare, tag: "Tasks" },
    ];

    if (!isAdmin) {
      return [
        ...baseEntities,
        { id: "nav-team", type: "Directory", title: "Teams", subtitle: "Department rosters and colleagues", path: "/teams", icon: UserCheck, tag: "Directory" },
      ];
    }

    return [
      ...baseEntities,
      { id: "nav-app", type: "Workflow", title: "Approval queue", subtitle: "Pending requisitions awaiting review", path: "/requests/approvals", icon: CheckSquare, tag: "Approvals" },
      { id: "nav-ana", type: "Admin", title: "Organization analytics", subtitle: "Request pipeline and unit breakdown", path: "/analytics", icon: PieChart, tag: "Analytics" },
      { id: "nav-usr", type: "Admin", title: "Users & staff directory", subtitle: "Manage accounts, invitations, and status", path: "/admin/users", icon: UserCheck, tag: "Admin" },
      { id: "nav-pv", type: "Finance", title: "Payment vouchers", subtitle: "Disbursement vouchers and retirements", path: "/finance/payment-vouchers", icon: Receipt, tag: "Finance" },
      { id: "nav-pra", type: "Payroll", title: "Payroll authorization", subtitle: "Review and authorize monthly payroll runs", path: "/admin/payroll/authorization", icon: CreditCard, tag: "Payroll" },
    ];
  }, [isAdmin]);

  const filteredCommandEntities = useMemo(() => {
    const q = commandQuery.trim().toLowerCase();
    if (!q) return commandEntities;
    return commandEntities.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.subtitle.toLowerCase().includes(q) ||
        item.type.toLowerCase().includes(q) ||
        item.tag.toLowerCase().includes(q)
    );
  }, [commandEntities, commandQuery]);

  const handleRunAiPrompt = (promptText: string) => {
    const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const userMsg = { sender: "user" as const, text: promptText, time: timeStr };

    let aiReplyText = "";
    let actionLink: string | undefined = undefined;
    let actionLabel: string | undefined = undefined;

    const lower = promptText.toLowerCase();

    if (lower.includes("approval") || lower.includes("needs my approval")) {
      aiReplyText =
        "You currently have 4 items requiring executive sign-off:\n\n• PV-2026-089 (₦420,000 - IT Server Upgrade)\n• PR-2026-042 (₦850,000 - Office Workstation Replacements)\n• Leave Application: Oluwaseun Adebayo (3 Days Medical)\n• Expense Reimbursement: Chinedu Ibeawuchi (₦45,000)\n\nAll items comply with current budgetary caps.";
      actionLink = "/requests/approvals";
      actionLabel = "Open Approval Queue (4 Items)";
    } else if (lower.includes("vouchers above") || lower.includes("500,000") || lower.includes("500k")) {
      aiReplyText =
        "Found 2 payment vouchers above ₦500,000 in the current fiscal period:\n\n1. PV-2026-088: ₦1,476,000 (PenCom Q4 Remittance) — Status: Verified\n2. PV-2026-085: ₦680,000 (Generator Fuel Reserves) — Status: Awaiting Retirement\n\nTotal high-value volume: ₦2,156,000.";
      actionLink = "/finance/payment-vouchers";
      actionLabel = "View Payment Vouchers";
    } else if (lower.includes("absent") || lower.includes("who is absent")) {
      aiReplyText =
        "Workforce Status for Today (Lagos HQ):\n\n• 45 / 48 personnel verified on-duty (96.4% on-time rate).\n• 3 staff members on approved leave:\n  - Ibrahim Bello (Annual Leave, returns Nov 25)\n  - Oluwaseun Adebayo (Medical Leave, returns Nov 14)\n  - Kemi Eze (Personal Leave, returns tomorrow)";
      actionLink = "/attendance";
      actionLabel = "View Live Attendance Roster";
    } else if (lower.includes("payroll summary") || lower.includes("payroll")) {
      aiReplyText =
        "November 2026 Payroll Execution Snapshot:\n\n• Gross Disbursal: ₦18,450,000\n• PAYE Statutory Tax: ₦2,860,000 (LIRS schedule generated)\n• PenCom Pension: ₦1,476,000 (PFA schedules attached)\n• Net Staff Take-Home: ₦14,114,000\n• 48 Active Personnel • 0 Discrepancies detected.";
      actionLink = "/admin/payroll/authorization";
      actionLabel = "Review Payroll Authorization";
    } else if (lower.includes("budget variance") || lower.includes("variance")) {
      aiReplyText =
        "Budget Variance Analysis (Q4 2026):\n\n• Operations & Logistics: 72% utilized (₦8.2M / ₦11.4M) — +4% ahead of projection due to fuel price indexation.\n• Information Technology: 48% utilized (₦3.45M / ₦7.2M) — on track.\n• People & Culture: 30% utilized (₦1.2M / ₦4.0M) — under budget.\n\nOverall organizational variance is within the 10% safety envelope.";
      actionLink = "/finance/budgets";
      actionLabel = "Open Departmental Budgets";
    } else if (lower.includes("delayed") || lower.includes("delayed requisitions")) {
      aiReplyText =
        "Delayed Requisitions Flagged:\n\n• PR-2026-038: Network Fiber Upgrade (Pending Vendor Quote > 72 hrs)\n• PR-2026-039: Q4 Audit Documentation Printing (Awaiting Dept Head acknowledgement).\n\nAutomated escalation reminders have been dispatched.";
      actionLink = "/procurement";
      actionLabel = "Check Procurement Pipeline";
    } else {
      aiReplyText = `Analyzed your query: "${promptText}". Operational records across Lagos HQ, Treasury, and People Operations are synced. You can explore corresponding dossiers below.`;
      actionLink = "/dashboard";
      actionLabel = "Return to Executive Workspace";
    }

    const aiMsg = {
      sender: "ai" as const,
      text: aiReplyText,
      data: actionLink ? { actionLink, actionLabel } : undefined,
      time: timeStr,
    };

    setAiConversation((prev) => [...prev, userMsg, aiMsg]);
  };

  // Click outside listener for search palette
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setSearchFocused(false);
      }
      if (userDropdownRef.current && !userDropdownRef.current.contains(event.target as Node)) {
        setUserDropdownOpen(false);
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
    <WorkspaceContext.Provider value={{ mode: workspaceMode, isAdmin, switchMode: switchWorkspaceMode }}>
      <div className="min-h-screen bg-[#fafafa] flex flex-col font-sans text-neutral-900 selection:bg-[#ff6900] selection:text-white antialiased">
      {/* 1. LEFT SIDEBAR */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 bg-white border-r border-neutral-900/[0.08] text-neutral-800 flex flex-col justify-between transition-[width,transform] duration-200 ease-out ${
          isCompactRail ? "w-16 p-2" : "w-64 p-4"
        } ${mobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
      >
        {/* Top: Brand Logo */}
        <div className="shrink-0 border-b border-neutral-900/[0.08] pb-3">
          <div className="flex items-center justify-between">
            <Link to="/dashboard" className="inline-flex items-center justify-center overflow-hidden">
              {isCompactRail ? (
                <div className="w-10 h-10 flex items-center justify-center">
                  <StanforteLogo variant="light" showText={false} className="h-7" />
                </div>
              ) : (
                <StanforteLogo variant="light" className="h-8" />
              )}
            </Link>

            {!isCompactRail && (
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="lg:hidden p-1.5 rounded-lg text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>

        {/* Middle: Clean Navigation Items */}
        <div className="flex-1 overflow-y-auto min-h-0 my-3 space-y-3 scrollbar-thin scrollbar-thumb-slate-200 pr-0.5">
          {/* Mode 1: Clean Employee Workspace Navigation (Matching 2026 Reference Mockup) */}
          {workspaceMode === "employee" ? (
            <div className="space-y-4">
              {/* Primary Personal Navigation Group */}
              <nav className="space-y-1">
                {EMPLOYEE_PRIMARY_NAV_ITEMS.map((item) => {
                  const Icon = item.icon;
                  const isActive = isItemActive(item);

                  return (
                    <Link
                      key={item.label}
                      to={item.path}
                      onClick={() => setMobileMenuOpen(false)}
                      title={isCompactRail ? item.label : undefined}
                      className={`w-full flex items-center rounded-lg transition-colors duration-150 group ${
                        isCompactRail
                          ? "justify-center h-9 w-9 mx-auto my-0.5"
                          : "justify-between h-9 px-3 text-sm"
                      } ${
                        isActive
                          ? "bg-neutral-100 text-neutral-900 font-medium"
                          : "text-neutral-600 font-normal hover:text-neutral-900 hover:bg-neutral-50"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Icon
                          strokeWidth={1.5}
                          className={`h-4 w-4 shrink-0 transition-colors duration-150 ${
                            isActive ? "text-[#c2410c]" : "text-neutral-400 group-hover:text-neutral-700"
                          }`}
                        />
                        {!isCompactRail && <span className="truncate">{item.label}</span>}
                      </div>

                      {!isCompactRail && item.badge && (
                        <span className={`font-mono text-xs tabular-nums ${
                          isActive ? "text-[#c2410c]" : "text-neutral-500"
                        }`}>
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </nav>

              {/* Secondary Collaboration Group */}
              <nav className="space-y-0.5 pt-3 border-t border-neutral-900/[0.06]">
                {EMPLOYEE_SECONDARY_NAV_ITEMS.map((item) => {
                  const Icon = item.icon;
                  const isActive = isItemActive(item);

                  return (
                    <Link
                      key={item.label}
                      to={item.path}
                      onClick={() => setMobileMenuOpen(false)}
                      title={isCompactRail ? item.label : undefined}
                      className={`w-full flex items-center rounded-lg transition-colors duration-150 group ${
                        isCompactRail
                          ? "justify-center h-9 w-9 mx-auto my-0.5"
                          : "justify-between h-9 px-3 text-sm"
                      } ${
                        isActive
                          ? "bg-neutral-100 text-neutral-900 font-medium"
                          : "text-neutral-600 font-normal hover:text-neutral-900 hover:bg-neutral-50"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Icon
                          strokeWidth={1.5}
                          className={`h-4 w-4 shrink-0 transition-colors duration-150 ${
                            isActive ? "text-[#c2410c]" : "text-neutral-400 group-hover:text-neutral-700"
                          }`}
                        />
                        {!isCompactRail && <span className="truncate">{item.label}</span>}
                      </div>

                      {!isCompactRail && item.badge && (
                        <span className={`font-mono text-xs tabular-nums ${
                          isActive ? "text-[#c2410c]" : "text-neutral-500"
                        }`}>
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </nav>
            </div>
          ) : (
            /* Mode 2: Admin Console Navigation Groups */
            <div className="space-y-5">
              {ADMIN_NAV_GROUPS.map((group) => {
                const isCollapsed = collapsedGroups[group.title];

                return (
                  <div key={group.title} className="space-y-1">
                    {!isCompactRail && (
                      <button
                        type="button"
                        onClick={() => toggleGroup(group.title)}
                        className="w-full px-3 py-1 flex items-center justify-between text-xs font-medium text-neutral-500 hover:text-neutral-900 transition-colors duration-150"
                      >
                        <span>{group.title}</span>
                        <ChevronDown
                          strokeWidth={1.5}
                          className={`h-3.5 w-3.5 text-neutral-400 transition-transform duration-150 ${
                            isCollapsed ? "-rotate-90" : ""
                          }`}
                        />
                      </button>
                    )}

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
                              title={isCompactRail ? item.label : undefined}
                              className={`w-full flex items-center rounded-lg transition-colors duration-150 group ${
                                isCompactRail
                                  ? "justify-center h-9 w-9 mx-auto my-0.5"
                                  : "justify-between h-9 px-3 text-sm"
                              } ${
                                isActive
                                  ? "bg-neutral-100 text-neutral-900 font-medium"
                                  : "text-neutral-600 font-normal hover:text-neutral-900 hover:bg-neutral-50"
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <Icon
                                  strokeWidth={1.5}
                                  className={`h-4 w-4 shrink-0 transition-colors duration-150 ${
                                    isActive ? "text-[#c2410c]" : "text-neutral-400 group-hover:text-neutral-700"
                                  }`}
                                />
                                {!isCompactRail && <span className="truncate">{item.label}</span>}
                              </div>

                              {!isCompactRail && item.badge && (
                                <span className={`font-mono text-xs tabular-nums ${
                                  isActive ? "text-[#c2410c]" : "text-neutral-500"
                                }`}>
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
          )}
        </div>

        {/* Bottom: Settings & Quick Profile */}
        <div className="shrink-0 pt-2 border-t border-neutral-100 space-y-1">
          <Link
            to={workspaceMode === "admin" ? "/admin/settings" : "/settings"}
            className={`w-full flex items-center gap-2.5 py-2 px-3 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50 rounded-xl transition-colors text-xs font-semibold ${
              isCompactRail ? "justify-center" : "justify-start"
            }`}
          >
            <Settings className="h-4 w-4 text-neutral-400" />
            {!isCompactRail && <span>Settings</span>}
          </Link>

          {/* User Profile Mini Trigger */}
          <button
            type="button"
            onClick={() => setUserDrawerOpen(true)}
            className={`w-full flex items-center gap-2.5 p-2 rounded-lg hover:bg-neutral-100/80 transition-colors text-left ${
              isCompactRail ? "justify-center" : "justify-between"
            }`}
          >
            <div className="w-8 h-8 rounded-md bg-neutral-900 text-white font-medium text-xs flex items-center justify-center shrink-0">
              {initials || "DO"}
            </div>
            {!isCompactRail && (
              <div className="min-w-0 flex-1 leading-tight">
                <div className="text-xs font-medium text-neutral-900 truncate">{userName}</div>
                <div className="text-xs text-neutral-500 capitalize truncate">{userRole}</div>
              </div>
            )}
            {!isCompactRail && (
              <ChevronRight className="h-4 w-4 text-neutral-400 shrink-0" strokeWidth={1.5} />
            )}
          </button>
        </div>
      </aside>

      {/* Backdrop for mobile menu */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-neutral-900/60 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* ------------------------------------------------------------- */}
      {/* 2. MAIN CONTAINER & TOP NAVIGATION BAR (Matching Zoho Header)  */}
      {/* ------------------------------------------------------------- */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-colors duration-200 ${
          isCompactRail ? "lg:pl-16" : "lg:pl-64"
        }`}
      >
        {/* Sticky Top Bar */}
        <header className="h-14 shrink-0 bg-white border-b border-neutral-900/[0.08] px-4 sm:px-6 flex items-center justify-between sticky top-0 z-20">
          {/* Left: Mobile hamburger + Workspace Label + Command Search */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-lg text-neutral-600 hover:bg-neutral-100 transition-colors duration-150"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" strokeWidth={1.5} />
            </button>

            <div className="flex items-center gap-2 px-2.5 h-8 rounded-lg bg-neutral-100/80 border border-neutral-900/[0.06] text-xs font-medium text-neutral-800">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 shrink-0" />
              <span className="truncate max-w-[160px] sm:max-w-[240px]">
                {(user as any)?.organizations?.[0]?.name || (user as any)?.organization?.name || "Stanforte Edge"}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setCommandPaletteOpen(true)}
              className="hidden sm:flex items-center gap-2 px-3 h-8 rounded-lg bg-neutral-50 hover:bg-neutral-100 border border-neutral-900/[0.08] text-xs text-neutral-500 hover:text-neutral-900 transition-colors duration-150 w-56 lg:w-72 justify-between cursor-pointer"
            >
              <div className="flex items-center gap-2 truncate">
                <Search className="h-3.5 w-3.5 text-neutral-400 shrink-0" strokeWidth={1.5} />
                <span className="truncate">Search</span>
              </div>
              <kbd className="hidden sm:inline-flex items-center px-1.5 h-5 text-xs font-mono font-normal bg-white border border-neutral-900/[0.10] rounded text-neutral-500">
                ⌘K
              </kbd>
            </button>
          </div>

          {/* Right Action Items */}
          <div className="flex items-center gap-2">
            {isAdmin && (
              <div className="hidden md:flex items-center p-0.5 rounded-lg bg-neutral-100 border border-neutral-900/[0.06] text-xs font-medium">
                <button
                  type="button"
                  onClick={() => switchWorkspaceMode("employee")}
                  className={`flex items-center gap-1.5 px-2.5 h-7 rounded-md transition-colors duration-150 cursor-pointer ${
                    workspaceMode === "employee"
                      ? "bg-white text-neutral-900 shadow-2xs"
                      : "text-neutral-500 hover:text-neutral-900"
                  }`}
                >
                  <UserIcon className="h-3.5 w-3.5" strokeWidth={1.5} />
                  <span>Personal</span>
                </button>
                <button
                  type="button"
                  onClick={() => switchWorkspaceMode("admin")}
                  className={`flex items-center gap-1.5 px-2.5 h-7 rounded-md transition-colors duration-150 cursor-pointer ${
                    workspaceMode === "admin"
                      ? "bg-neutral-900 text-white shadow-2xs"
                      : "text-neutral-500 hover:text-neutral-900"
                  }`}
                >
                  <ShieldCheck className="h-3.5 w-3.5" strokeWidth={1.5} />
                  <span>Admin</span>
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={toggleThemeMode}
              className="p-2 rounded-lg text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 transition-colors duration-150"
              title={isDarkTheme ? "Switch to light mode" : "Switch to dark mode"}
              aria-label={isDarkTheme ? "Switch to light mode" : "Switch to dark mode"}
            >
              {isDarkTheme ? (
                <Sun className="h-4 w-4" strokeWidth={1.5} />
              ) : (
                <Moon className="h-4 w-4" strokeWidth={1.5} />
              )}
            </button>

            <Link
              to="/account/help"
              className="p-2 rounded-lg text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 transition-colors duration-150 hidden sm:flex"
              title="Help"
            >
              <HelpCircle className="h-4 w-4" strokeWidth={1.5} />
            </Link>

            <Link
              to="/account/notifications"
              className="relative p-2 rounded-lg text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 transition-colors duration-150"
              title="Notifications"
            >
              <Bell className="h-4 w-4" strokeWidth={1.5} />
            </Link>

            {isAdmin && (
              <button
                type="button"
                onClick={() => setAppLauncherOpen(true)}
                className="p-2 rounded-lg hover:bg-neutral-100 text-neutral-600 hover:text-neutral-900 transition-colors duration-150"
                title="Applications directory"
              >
                <LayoutGrid className="h-4 w-4" strokeWidth={1.5} />
              </button>
            )}

            <div className="relative" ref={userDropdownRef}>
              <button
                type="button"
                onClick={() => setUserDropdownOpen((v) => !v)}
                className={`flex items-center gap-1.5 p-1 pr-2 rounded-lg transition-colors duration-150 border ${
                  userDropdownOpen
                    ? "bg-neutral-100 border-neutral-300"
                    : "hover:bg-neutral-100 border-neutral-900/[0.08]"
                }`}
                title="Account"
              >
                <div className="w-7 h-7 rounded-md bg-neutral-900 text-white font-medium text-xs flex items-center justify-center">
                  {initials || "US"}
                </div>
                <ChevronDown
                  className={`h-3.5 w-3.5 text-neutral-500 transition-transform duration-150 ${
                    userDropdownOpen ? "rotate-180 text-neutral-900" : ""
                  }`}
                  strokeWidth={1.5}
                />
              </button>

              {userDropdownOpen && (
                <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-soft border border-neutral-900/[0.08] py-2 z-50">
                  {/* User Profile Header */}
                  <div className="px-4 py-3 border-b border-neutral-100">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#ff6900] text-white font-medium text-sm flex items-center justify-center shrink-0 shadow-sm">
                        {initials || "AD"}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-medium text-neutral-900 truncate">
                          {userName}
                        </div>
                        <div className="text-xs text-neutral-400 truncate">
                          {user?.email || "staff@stanforteedge.com"}
                        </div>
                        <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-orange-50 text-[#ff6900] border border-orange-200/60">
                            {userRole}
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-neutral-100 text-neutral-600">
                            {workspaceMode === "admin" ? "Admin Mode" : "Staff Mode"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ADMIN CONSOLE VIEW SWITCH ACTION (Prominent for admins) */}
                  {isAdmin && (
                    <div className="p-2 border-b border-neutral-100 bg-neutral-50/50">
                      {workspaceMode === "employee" ? (
                        <button
                          type="button"
                          onClick={() => {
                            switchWorkspaceMode("admin");
                            setUserDropdownOpen(false);
                          }}
                          className="w-full flex items-center justify-between p-2.5 rounded-xl bg-neutral-100 hover:bg-neutral-100 border border-neutral-200 text-blue-900 transition text-xs font-medium group shadow-xs"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-neutral-900 text-white flex items-center justify-center shadow-sm shrink-0">
                              <ShieldCheck className="h-4 w-4" />
                            </div>
                            <div className="text-left">
                              <div className="text-xs font-semibold text-blue-900">
                                View Admin Console
                              </div>
                              <div className="text-xs font-medium text-neutral-700">
                                Workforce &amp; Management Hub
                              </div>
                            </div>
                          </div>
                          <ChevronRight className="h-4 w-4 text-neutral-700 transition-transform shrink-0" />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            switchWorkspaceMode("employee");
                            setUserDropdownOpen(false);
                          }}
                          className="w-full flex items-center justify-between p-2.5 rounded-xl bg-orange-50 hover:bg-orange-100/90 border border-orange-200/70 text-orange-950 transition text-xs font-medium group shadow-xs"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-[#ff6900] text-white flex items-center justify-center shadow-sm shrink-0">
                              <UserIcon className="h-4 w-4" />
                            </div>
                            <div className="text-left">
                              <div className="text-xs font-semibold text-orange-900">
                                Staff Workspace
                              </div>
                              <div className="text-xs font-medium text-[#ff6900]">
                                Return to daily staff dashboard
                              </div>
                            </div>
                          </div>
                          <ChevronRight className="h-4 w-4 text-orange-500 transition-transform shrink-0" />
                        </button>
                      )}
                    </div>
                  )}

                  {/* Navigation Links */}
                  <div className="p-1 text-xs space-y-0.5">
                    <Link
                      to="/account/profile"
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-neutral-700 hover:bg-neutral-50 font-medium transition"
                    >
                      <UserIcon className="h-4 w-4 text-neutral-400" />
                      <span>My Profile</span>
                    </Link>

                    <Link
                      to="/account/payslips"
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-neutral-700 hover:bg-neutral-50 font-medium transition"
                    >
                      <Receipt className="h-4 w-4 text-neutral-400" />
                      <span>My Payslips</span>
                    </Link>

                    <Link
                      to="/account/timesheets"
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-neutral-700 hover:bg-neutral-50 font-medium transition"
                    >
                      <CalendarCheck className="h-4 w-4 text-neutral-400" />
                      <span>My Timesheets</span>
                    </Link>

                    <Link
                      to="/account/settings"
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-neutral-700 hover:bg-neutral-50 font-medium transition"
                    >
                      <Settings className="h-4 w-4 text-neutral-400" />
                      <span>Account Settings</span>
                    </Link>

                    {isAdmin && (
                      <Link
                        to="/admin/settings"
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-neutral-700 hover:bg-neutral-50 font-medium transition"
                      >
                        <SlidersHorizontal className="h-4 w-4 text-neutral-400" />
                        <span>System Administration</span>
                      </Link>
                    )}
                  </div>

                  {/* Sign Out */}
                  <div className="p-1 pt-1 border-t border-neutral-100">
                    <button
                      type="button"
                      onClick={() => {
                        setUserDropdownOpen(false);
                        handleSignOut();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 transition"
                    >
                      <LogOut className="h-4 w-4" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Inner Content View - Full width dashboard layout */}
        <main className="p-4 sm:p-6 lg:p-8 space-y-6 w-full flex-1 pb-16 min-w-0">
          {children}
        </main>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 3. 9-DOTS APP LAUNCHER SLIDE-OVER DRAWER (Admin only)         */}
      {/* ------------------------------------------------------------- */}
      {appLauncherOpen && isAdmin && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-neutral-950/40 transition-opacity duration-200"
            onClick={() => setAppLauncherOpen(false)}
          />

          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-md bg-white text-neutral-900 shadow-soft border-l border-neutral-900/[0.08] flex flex-col justify-between">
              {/* Drawer Top Header & Search */}
              <div className="px-5 py-4 border-b border-neutral-900/[0.08] bg-[#fafafa] space-y-3.5 shrink-0">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-orange-50 border border-orange-200/60 text-[#ff6900] flex items-center justify-center shrink-0">
                      <LayoutGrid className="h-4 w-4" strokeWidth={1.75} />
                    </div>
                    <h3 className="font-headline text-base font-medium tracking-tight text-neutral-900 truncate">
                      Application Launcher
                    </h3>
                  </div>

                  <button
                    type="button"
                    onClick={() => setAppLauncherOpen(false)}
                    className="p-2 rounded-lg text-neutral-500 hover:text-neutral-900 hover:bg-neutral-200/60 transition-colors duration-150"
                    aria-label="Close application launcher"
                  >
                    <X className="h-4 w-4" strokeWidth={1.5} />
                  </button>
                </div>

                {/* Search in Apps */}
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" strokeWidth={1.5} />
                  <input
                    type="text"
                    value={launcherSearch}
                    onChange={(e) => setLauncherSearch(e.target.value)}
                    placeholder="Search applications & tools..."
                    className="w-full pl-9 pr-8 py-2 text-sm bg-white border border-neutral-900/[0.12] rounded-lg text-neutral-900 placeholder:text-neutral-400 outline-none focus:border-[#ff6900] focus:ring-2 focus:ring-[#ff6900]/15 transition-colors duration-150"
                  />
                  {launcherSearch && (
                    <button
                      type="button"
                      onClick={() => setLauncherSearch("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-neutral-400 hover:text-neutral-700"
                      aria-label="Clear search"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Scrollable Apps Grid */}
              <div className="flex-1 overflow-y-auto p-5 space-y-6">
                {/* Featured Module Banner */}
                {!launcherSearch.trim() && (
                  <div className="p-4 rounded-xl bg-orange-50/70 border border-orange-200/70">
                    <span className="section-kicker">Featured module</span>
                    <h4 className="font-headline text-sm font-semibold text-neutral-900 mt-1">
                      Stanforte People & Payroll
                    </h4>
                    <p className="text-xs text-neutral-600 mt-1 leading-relaxed">
                      Automated salary calculations, statutory deductions (PAYE, NHF, Pension), and one-click bank disbursement.
                    </p>
                    <Link
                      to="/admin/payroll/authorization"
                      onClick={() => setAppLauncherOpen(false)}
                      className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-[#ff6900] hover:text-[#ea580c] transition-colors"
                    >
                      <span>Open Payroll Authorization</span>
                      <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.75} />
                    </Link>
                  </div>
                )}

                {/* Categorized Apps List */}
                {filteredCatalog.length === 0 ? (
                  <div className="py-10 text-center">
                    <p className="text-sm font-medium text-neutral-900">No matching applications</p>
                    <p className="mt-1 text-xs text-neutral-500">
                      Try a different keyword or clear the search filter.
                    </p>
                  </div>
                ) : (
                  filteredCatalog.map((cat) => (
                    <div key={cat.category} className="space-y-2.5">
                      <p className="text-xs font-medium text-neutral-500">
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
                              className="p-3 rounded-xl bg-white border border-neutral-900/[0.08] hover:border-neutral-900/[0.16] hover:bg-neutral-50/80 transition-colors duration-150 group flex flex-col justify-between"
                            >
                              <div className="flex items-center justify-between gap-2 mb-2.5">
                                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-neutral-100 text-neutral-600 group-hover:bg-orange-50 group-hover:text-[#ff6900] transition-colors duration-150">
                                  <Icon className="h-4 w-4" strokeWidth={1.75} />
                                </div>
                                {app.badge && (
                                  <span className="px-1.5 py-0.5 rounded-md font-mono text-[11px] font-medium tabular-nums bg-orange-50 text-[#c2410c] border border-orange-200/60">
                                    {app.badge}
                                  </span>
                                )}
                              </div>

                              <div>
                                <p className="text-xs font-medium text-neutral-900 group-hover:text-[#c2410c] transition-colors">
                                  {app.name}
                                </p>
                                <p className="text-xs text-neutral-500 line-clamp-1 mt-0.5">
                                  {app.description}
                                </p>
                              </div>
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Bottom Footer */}
              <div className="px-5 py-3.5 border-t border-neutral-900/[0.08] bg-[#fafafa] flex items-center justify-between text-xs text-neutral-500 shrink-0">
                <span>Organization</span>
                <span className="text-neutral-900 font-medium">{orgName}</span>
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
            className="absolute inset-0 bg-neutral-900/50 backdrop-blur-sm transition-opacity"
            onClick={() => setUserDrawerOpen(false)}
          />

          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-sm bg-[#0d1633] text-white shadow-2xl flex flex-col justify-between">
              {/* Top User Card */}
              <div className="p-6 border-b border-white/10 relative">
                <button
                  type="button"
                  onClick={() => setUserDrawerOpen(false)}
                  className="absolute top-4 right-4 p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10"
                >
                  <X className="h-4 w-4" />
                </button>

                <div className="flex flex-col items-center text-center space-y-3 pt-2">
                  <div className="w-20 h-20 rounded-full bg-[#ff6900] text-white font-semibold text-2xl flex items-center justify-center ring-4 ring-white/10 shadow-xl">
                    {initials || "AD"}
                  </div>

                  <div>
                    <h3 className="text-base font-semibold text-white">{userName}</h3>
                    <p className="text-xs text-neutral-400">{user?.email || "staff@stanforteedge.com"}</p>
                    <span className="inline-block mt-2 px-2.5 py-0.5 rounded-full text-xs font-medium bg-white/10 text-orange-400 border border-white/10">
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
                        className={`w-full py-2 px-4 rounded-xl text-xs font-medium transition flex items-center justify-center gap-2 shadow-md ${
                          workspaceMode === "admin"
                            ? "bg-neutral-800 text-neutral-200 border border-neutral-700"
                            : "bg-neutral-900 hover:bg-neutral-900 text-white"
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
                  <p className="text-xs font-medium text-neutral-400 mb-2">
                    Account & Preferences
                  </p>
                  <Link
                    to="/account/profile"
                    onClick={() => setUserDrawerOpen(false)}
                    className="flex items-center justify-between p-2.5 rounded-xl hover:bg-white/5 text-xs font-semibold text-neutral-200 transition"
                  >
                    <div className="flex items-center gap-2.5">
                      <UserIcon className="h-4 w-4 text-neutral-400" />
                      <span>My Profile</span>
                    </div>
                    <ChevronRight className="h-3.5 w-3.5 text-neutral-500" />
                  </Link>

                  <Link
                    to="/admin/settings"
                    onClick={() => setUserDrawerOpen(false)}
                    className="flex items-center justify-between p-2.5 rounded-xl hover:bg-white/5 text-xs font-semibold text-neutral-200 transition"
                  >
                    <div className="flex items-center gap-2.5">
                      <Settings className="h-4 w-4 text-neutral-400" />
                      <span>System Settings</span>
                    </div>
                    <ChevronRight className="h-3.5 w-3.5 text-neutral-500" />
                  </Link>
                </div>

                {/* Left Panel Density Control (Image 2) */}
                <div className="space-y-2">
                  <p className="text-xs font-medium text-neutral-400">
                    Sidebar Density
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => toggleRail(false)}
                      className={`p-2.5 rounded-xl border text-xs font-medium transition flex items-center gap-2 justify-center ${
                        !isCompactRail
                          ? "bg-[#ff6900] text-white border-[#ff6900]"
                          : "bg-white/5 text-neutral-300 border-white/10 hover:bg-white/10"
                      }`}
                    >
                      <PanelLeft className="h-3.5 w-3.5" />
                      <span>Expanded (240px)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleRail(true)}
                      className={`p-2.5 rounded-xl border text-xs font-medium transition flex items-center gap-2 justify-center ${
                        isCompactRail
                          ? "bg-[#ff6900] text-white border-[#ff6900]"
                          : "bg-white/5 text-neutral-300 border-white/10 hover:bg-white/10"
                      }`}
                    >
                      <PanelLeftClose className="h-3.5 w-3.5" />
                      <span>Compact Rail (64px)</span>
                    </button>
                  </div>
                </div>

                {/* Appearance Mode (Image 2) */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-medium text-neutral-400">
                      Appearance Mode
                    </p>
                    {userThemeMode && tenantDefaultTheme && (
                      <button
                        type="button"
                        onClick={() => setAppearanceMode(null)}
                        className="text-[11px] font-medium text-orange-400 hover:text-orange-300 transition"
                      >
                        Use workspace default ({tenantDefaultTheme})
                      </button>
                    )}
                  </div>
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
                              ? "bg-white text-neutral-900 border-white font-medium"
                              : "bg-white/5 text-neutral-400 border-white/10 hover:bg-white/10"
                          }`}
                        >
                          <Icon className="h-3.5 w-3.5" />
                          <span>{mode.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Timezone & Regional Display */}
                <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-orange-500/15 text-[#ff6900] flex items-center justify-center shrink-0">
                      <Globe className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-xs text-neutral-400 font-semibold">Timezone &amp; Format</div>
                      <div className="text-xs font-medium text-white mt-0.5">WAT (Africa/Lagos) &bull; 12-Hour</div>
                    </div>
                  </div>
                  <Link
                    to="/admin/settings"
                    onClick={() => setUserDrawerOpen(false)}
                    className="text-xs font-medium text-[#ff6900] hover:underline"
                  >
                    Adjust
                  </Link>
                </div>
              </div>

              {/* Bottom Sign Out Button (Image 2) */}
              <div className="p-6 border-t border-white/10">
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="w-full py-2.5 px-4 rounded-xl bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/30 text-xs font-medium transition flex items-center justify-center gap-2 shadow-sm"
                >
                  <LogOut className="h-4 w-4" />
                  <span>SIGN OUT</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* ============================================================= */}
      {/* 2026 GLOBAL COMMAND PALETTE (⌘K) MODAL                        */}
      {/* ============================================================= */}
      {commandPaletteOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto p-4 sm:p-6 md:p-20 flex justify-center items-start animate-in fade-in duration-150">
          <div
            className="fixed inset-0 bg-neutral-900/40 backdrop-blur-sm transition-opacity"
            onClick={() => setCommandPaletteOpen(false)}
          />

          <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-xs border border-neutral-100 overflow-hidden z-10 animate-in zoom-in-95 duration-150">
            {/* Input Bar */}
            <div className="flex items-center px-4 py-3.5 border-b border-neutral-100 gap-3">
              <Search className="h-5 w-5 text-neutral-400 shrink-0" />
              <input
                type="text"
                autoFocus
                value={commandQuery}
                onChange={(e) => setCommandQuery(e.target.value)}
                placeholder="Search employees, vouchers, leaves, or ask Stanforte AI..."
                className="w-full text-sm font-medium bg-transparent outline-none placeholder:text-neutral-400 text-neutral-900 border-none p-0 focus:ring-0"
              />
              {commandQuery ? (
                <button
                  type="button"
                  onClick={() => setCommandQuery("")}
                  className="p-1 rounded-md text-neutral-400 hover:text-neutral-600"
                >
                  <X className="h-4 w-4" />
                </button>
              ) : (
                <span className="text-xs font-mono text-neutral-400 px-1.5 py-0.5 rounded bg-neutral-100">
                  ESC
                </span>
              )}
            </div>

            {/* Quick Natural Language AI Suggestion Chips */}
            <div className="px-4 py-2.5 bg-neutral-50/70 border-b border-neutral-100 flex items-center gap-2 overflow-x-auto text-xs">
              <span className="text-neutral-400 font-medium shrink-0 text-xs">
                Suggested:
              </span>
              <button
                type="button"
                onClick={() => {
                  setCommandPaletteOpen(false);
                  setAiDrawerOpen(true);
                  handleRunAiPrompt("What needs my approval?");
                }}
                className="px-2.5 py-1 rounded-full bg-white border border-neutral-200/80 text-neutral-700 hover:border-[#ff6900] hover:text-[#ff6900] transition whitespace-nowrap font-medium shrink-0 cursor-pointer"
              >
                ⚡ What needs my approval?
              </button>
              <button
                type="button"
                onClick={() => {
                  setCommandPaletteOpen(false);
                  setAiDrawerOpen(true);
                  handleRunAiPrompt("Show payment vouchers above ₦500,000");
                }}
                className="px-2.5 py-1 rounded-full bg-white border border-neutral-200/80 text-neutral-700 hover:border-[#ff6900] hover:text-[#ff6900] transition whitespace-nowrap font-medium shrink-0 cursor-pointer"
              >
                ₦ Vouchers above ₦500k
              </button>
              <button
                type="button"
                onClick={() => {
                  setCommandPaletteOpen(false);
                  setAiDrawerOpen(true);
                  handleRunAiPrompt("Who is absent today?");
                }}
                className="px-2.5 py-1 rounded-full bg-white border border-neutral-200/80 text-neutral-700 hover:border-[#ff6900] hover:text-[#ff6900] transition whitespace-nowrap font-medium shrink-0 cursor-pointer"
              >
                👥 Who is absent today?
              </button>
              <button
                type="button"
                onClick={() => {
                  setCommandPaletteOpen(false);
                  setAiDrawerOpen(true);
                  handleRunAiPrompt("Generate payroll summary");
                }}
                className="px-2.5 py-1 rounded-full bg-white border border-neutral-200/80 text-neutral-700 hover:border-[#ff6900] hover:text-[#ff6900] transition whitespace-nowrap font-medium shrink-0 cursor-pointer"
              >
                📊 Generate payroll summary
              </button>
            </div>

            {/* Entity Results List */}
            <div className="max-h-96 overflow-y-auto p-2 divide-y divide-neutral-50">
              {filteredCommandEntities.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.id}
                    to={item.path}
                    onClick={() => {
                      setCommandPaletteOpen(false);
                      setCommandQuery("");
                    }}
                    className="flex items-center justify-between p-3 rounded-2xl hover:bg-neutral-50 transition group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-neutral-100 group-hover:bg-orange-50 text-neutral-600 group-hover:text-[#ff6900] flex items-center justify-center shrink-0 transition">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-medium text-neutral-900 group-hover:text-[#ff6900] transition truncate">
                          {item.title}
                        </div>
                        <div className="text-xs text-neutral-400 truncate">{item.subtitle}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 ml-3">
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-neutral-100 text-neutral-600">
                        {item.tag}
                      </span>
                      <ChevronRight className="h-4 w-4 text-neutral-300 group-hover:text-neutral-600 transition" />
                    </div>
                  </Link>
                );
              })}
            </div>

            {/* Footer */}
            <div className="px-4 py-2.5 bg-neutral-50 border-t border-neutral-100 flex items-center justify-between text-xs text-neutral-400">
              <div className="flex items-center gap-3">
                <span>Navigate <kbd className="px-1.5 py-0.5 bg-white border rounded text-xs">↑</kbd> <kbd className="px-1.5 py-0.5 bg-white border rounded text-xs">↓</kbd></span>
                <span>Select <kbd className="px-1.5 py-0.5 bg-white border rounded text-xs">↵</kbd></span>
              </div>
              <span className="font-semibold text-neutral-500">Stanforte Edge 2026</span>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* 2026 STANFORTE AI ASSISTANT SLIDE-OVER DRAWER                */}
      {/* ============================================================= */}
      {aiDrawerOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div
            className="absolute inset-0 bg-neutral-900/40 backdrop-blur-sm transition-opacity"
            onClick={() => setAiDrawerOpen(false)}
          />

          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-md bg-white text-neutral-900 shadow-xs flex flex-col justify-between border-l border-neutral-100">
              {/* Header */}
              <div className="p-5 border-b border-neutral-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-2xl bg-orange-50 text-[#ff6900] flex items-center justify-center font-medium">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-medium text-sm text-neutral-900 flex items-center gap-1.5">
                      <span>Stanforte AI</span>
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-orange-100 text-[#ff6900]">
                        2026
                      </span>
                    </h3>
                    <p className="text-xs text-neutral-400">Enterprise Contextual Assistant</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setAiDrawerOpen(false)}
                  className="p-1.5 rounded-xl text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Suggested Questions Grid */}
              <div className="p-4 bg-neutral-50/70 border-b border-neutral-100 space-y-2">
                <div className="text-xs font-medium text-neutral-400">
                  Contextual Suggestions:
                </div>
                <div className="grid grid-cols-1 gap-1.5 text-xs">
                  {[
                    "What needs my approval?",
                    "Show delayed requisitions",
                    "Compare payroll costs",
                    "Explain this budget variance",
                    "Show payment vouchers above ₦500,000",
                    "Who is absent today?",
                  ].map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => handleRunAiPrompt(q)}
                      className="text-left px-3 py-2 rounded-xl bg-white border border-neutral-200/80 hover:border-[#ff6900] hover:text-[#ff6900] text-neutral-700 font-medium transition shadow-2xs text-xs flex items-center justify-between group cursor-pointer"
                    >
                      <span>{q}</span>
                      <ArrowRight className="h-3 w-3 text-neutral-300 group-hover:text-[#ff6900] transition" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Chat Thread */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3.5 scrollbar-thin">
                {aiConversation.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}
                  >
                    <div
                      className={`max-w-[88%] rounded-2xl p-3.5 text-xs leading-relaxed ${
                        msg.sender === "user"
                          ? "bg-[#ff6900] text-white shadow-sm"
                          : "bg-neutral-50 border border-neutral-100 text-neutral-800 shadow-2xs"
                      }`}
                    >
                      <div className="font-medium whitespace-pre-wrap">{msg.text}</div>

                      {msg.data && msg.data.actionLink && (
                        <Link
                          to={msg.data.actionLink}
                          onClick={() => setAiDrawerOpen(false)}
                          className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-neutral-200 text-[#ff6900] font-medium text-xs shadow-2xs hover:bg-neutral-50 transition"
                        >
                          <span>{msg.data.actionLabel || "View Record"}</span>
                          <ArrowRight className="h-3 w-3" />
                        </Link>
                      )}
                    </div>
                    <span className="text-xs text-neutral-400 mt-1 px-1">{msg.time}</span>
                  </div>
                ))}
              </div>

              {/* Bottom Input Box */}
              <div className="p-4 border-t border-neutral-100 bg-white">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (aiInput.trim()) {
                      handleRunAiPrompt(aiInput.trim());
                      setAiInput("");
                    }
                  }}
                  className="flex items-center gap-2"
                >
                  <input
                    type="text"
                    value={aiInput}
                    onChange={(e) => setAiInput(e.target.value)}
                    placeholder="Ask Stanforte AI anything..."
                    className="flex-1 px-3.5 py-2.5 rounded-xl border border-neutral-200 text-xs text-neutral-900 outline-none focus:border-[#ff6900]"
                  />
                  <button
                    type="submit"
                    className="p-2.5 rounded-xl bg-[#ff6900] hover:bg-[#ea580c] text-white font-medium transition shadow-sm cursor-pointer"
                  >
                    <Zap className="h-4 w-4" />
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </WorkspaceContext.Provider>
  );
}
