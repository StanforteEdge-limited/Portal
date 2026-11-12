import { useState, useMemo, useRef, useEffect, createContext, useContext, type ReactNode } from "react";
import { Link, useNavigate, useLocation } from "@/shared/router-adapter";
import { useAuth } from "@/shared/context/AuthProvider";
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

export function useWorkspace() {
  return useContext(WorkspaceContext);
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
        label: "Tasks",
        icon: CheckSquare,
        path: "/tasks",
        aliases: ["Work Items", "Kanban", "Deliverables", "Sprints"],
        description: "Organization deliverables, Kanban sprint board, and backlog",
      },
      {
        label: "Approvals",
        icon: FileCheck,
        path: "/requests/approvals",
        badge: "23",
        aliases: ["Decisions", "Approval Queue", "Vouchers"],
        description: "Tiered sign-off queue for requisitions and leave",
      },
      {
        label: "Teams",
        icon: Users,
        path: "/teams",
        aliases: ["Groups", "Departments", "Roster"],
        description: "Team rosters and departmental structure",
      },
    ],
  },
  {
    title: "People",
    items: [
      {
        label: "Employees",
        icon: UserCheck,
        path: "/admin/users",
        aliases: ["Staff", "Directory", "HR", "Workforce"],
        description: "Centralized personnel directory and profiles",
      },
      {
        label: "Attendance",
        icon: Clock,
        path: "/attendance",
        aliases: ["Time & Attendance", "Shifts", "Clock In"],
        description: "Geofenced check-in logs and shift rhythms",
      },
      {
        label: "Leave",
        icon: Calendar,
        path: "/leave",
        aliases: ["Leave Management", "Vacation", "Absence", "Time Off"],
        description: "Leave balances, applications, and coverage",
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

export const EMPLOYEE_NAV_ITEMS: NavItemDef[] = [
  {
    label: "Home",
    icon: Home,
    path: "/dashboard",
    aliases: ["Dashboard", "Overview"],
    description: "Daily KPIs, tasks, and quick actions",
  },
  {
    label: "Tasks",
    icon: CheckSquare,
    path: "/tasks",
    aliases: ["Work Items", "Deliverables"],
    description: "Personal tasks and team assignments",
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
    aliases: ["Leave & Absence", "Time Off", "Vacation"],
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
    label: "Payslips",
    icon: CreditCard,
    path: "/account/payslips",
    aliases: ["My Payslips", "Salary"],
    description: "Monthly salary statements and tax deductions",
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
        name: "Payment Vouchers",
        description: "Disbursement register & retirement audit",
        icon: Receipt,
        path: "/finance/payment-vouchers",
        color: "bg-blue-50 text-blue-600",
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
      {
        name: "Team Chat",
        description: "Direct messaging, channels & file sharing",
        icon: MessageSquare,
        path: "/chat",
        color: "bg-orange-50 text-orange-600",
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
    navigate("/dashboard");
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

  // 2026 Linear-style Search Entities (Employees, Documents, Vouchers, Leaves, Tasks, Departments, Payroll)
  const commandEntities = useMemo(() => [
    { id: "emp-1", type: "Employee", title: "Oluwaseun Adeleke", subtitle: "Chief Financial Officer • Finance", path: "/admin/users", icon: UserCheck, tag: "CFO" },
    { id: "emp-2", type: "Employee", title: "Fatima Olarinwaju", subtitle: "Head of People • HR & Culture", path: "/admin/users", icon: UserCheck, tag: "HR Lead" },
    { id: "emp-3", type: "Employee", title: "Chinedu Ibeawuchi", subtitle: "Logistics Manager • Supply Chain", path: "/admin/users", icon: UserCheck, tag: "Supply Chain" },
    { id: "emp-4", type: "Employee", title: "Amina Yusuf", subtitle: "Senior Systems Engineer • Tech", path: "/admin/users", icon: UserCheck, tag: "Tech" },
    { id: "pv-1", type: "Voucher", title: "PV-2026-089: Core Switch Rack Upgrade", subtitle: "₦420,000 • Pending CFO Review • IT Dept", path: "/finance/payment-vouchers", icon: Receipt, tag: "₦420,000" },
    { id: "pv-2", type: "Voucher", title: "PV-2026-088: PenCom Q4 Pension Remittance", subtitle: "₦1,476,000 • Verified & Ready • Treasury", path: "/finance/payment-vouchers", icon: Receipt, tag: "₦1,476,000" },
    { id: "pv-3", type: "Voucher", title: "PV-2026-085: Campus Diesel Generator Refill", subtitle: "₦680,000 • Awaiting Retirement • Facilities", path: "/finance/payment-vouchers", icon: Receipt, tag: "₦680,000" },
    { id: "doc-1", type: "Document", title: "Stanforte 2026 Employee Handbook & Code of Conduct", subtitle: "HR Policy • Updated Nov 2026", path: "/documents", icon: FolderOpen, tag: "Policy" },
    { id: "doc-2", type: "Document", title: "Financial Delegation of Authority Matrix (DoA)", subtitle: "Governance SOP • Tiered Approval Thresholds", path: "/documents", icon: FolderOpen, tag: "Governance" },
    { id: "lv-1", type: "Leave", title: "Annual Leave: Ibrahim Bello", subtitle: "Nov 20 – Nov 24, 2026 • Approved", path: "/leave", icon: Calendar, tag: "Annual" },
    { id: "lv-2", type: "Leave", title: "Medical Leave: Oluwaseun Adebayo", subtitle: "Nov 11 – Nov 13, 2026 • In Review", path: "/leave", icon: Calendar, tag: "Medical" },
    { id: "tsk-1", type: "Task", title: "Lagos HQ Biometric Terminal #2 Firmware Sync", subtitle: "Infrastructure • High Priority • Due Today", path: "/tasks", icon: CheckSquare, tag: "Urgent" },
    { id: "tsk-2", type: "Task", title: "Finalize November Commercial Bank Batch File", subtitle: "Finance & Payroll • In Progress", path: "/tasks", icon: CheckSquare, tag: "Finance" },
    { id: "pay-1", type: "Payroll", title: "November 2026 Monthly Payroll Run", subtitle: "₦18,450,000 Gross • 48 Staff • Ready for Sign-off", path: "/admin/payroll/authorization", icon: CreditCard, tag: "Nov 2026" },
  ], []);

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
      <div className="min-h-screen bg-[#f8fafc] flex flex-col font-sans text-slate-900 selection:bg-[#ff6900] selection:text-white antialiased">
      {/* ------------------------------------------------------------- */}
      {/* 1. LEFT SIDEBAR (Streamlined & Uncluttered, with Compact Rail)  */}
      {/* ------------------------------------------------------------- */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 bg-white border-r border-slate-100 text-slate-800 flex flex-col justify-between transition-all duration-200 ease-in-out ${
          isCompactRail ? "w-16 p-2" : "w-64 p-4"
        } ${mobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
      >
        {/* Top: Brand Logo & Mode Badge */}
        <div className="shrink-0 border-b border-slate-100 pb-3">
          <div className="flex items-center justify-between">
            <Link to="/dashboard" className="inline-block overflow-hidden">
              {isCompactRail ? (
                <div className="w-10 h-10 rounded-xl bg-[#ff6900] flex items-center justify-center font-black text-white text-lg shadow-md">
                  S
                </div>
              ) : (
                <StanforteLogo variant="light" className="h-8" />
              )}
            </Link>

            {!isCompactRail && (
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>

        {/* Middle: Clean Navigation Items */}
        <div className="flex-1 overflow-y-auto min-h-0 my-3 space-y-3 scrollbar-thin scrollbar-thumb-slate-200 pr-0.5">
          {/* Direct Home Link */}
          <Link
            to="/dashboard"
            onClick={() => setMobileMenuOpen(false)}
            title={isCompactRail ? "Home" : undefined}
            className={`w-full flex items-center rounded-xl transition-all group ${
              isCompactRail
                ? "justify-center p-2.5 my-1"
                : "justify-between px-3 py-2 text-xs font-semibold"
            } ${
              isItemActive({ label: "Home", icon: Home, path: "/dashboard", aliases: ["Dashboard"] })
                ? "bg-[#ff6900] text-white shadow-sm shadow-orange-500/20 font-bold"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <Home
                className={`shrink-0 transition-colors ${
                  isCompactRail ? "h-5 w-5" : "h-4 w-4"
                } ${
                  isItemActive({ label: "Home", icon: Home, path: "/dashboard", aliases: ["Dashboard"] })
                    ? "text-white"
                    : "text-slate-400 group-hover:text-slate-700"
                }`}
              />
              {!isCompactRail && <span className="truncate">Home</span>}
            </div>
          </Link>

          {/* Mode 1: Clean Employee Workspace Navigation */}
          {workspaceMode === "employee" ? (
            <nav className="space-y-0.5">
              {EMPLOYEE_NAV_ITEMS.filter((i) => i.label !== "Home").map((item) => {
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
                        ? "bg-[#ff6900] text-white shadow-sm shadow-orange-500/20 font-bold"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon
                        className={`shrink-0 transition-colors ${
                          isCompactRail ? "h-5 w-5" : "h-4 w-4"
                        } ${
                          isActive ? "text-white" : "text-slate-400 group-hover:text-slate-700"
                        }`}
                      />
                      {!isCompactRail && <span className="truncate">{item.label}</span>}
                    </div>

                    {!isCompactRail && item.badge && (
                      <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded-full ${
                        isActive ? "bg-white text-[#ff6900]" : "bg-orange-100 text-[#ff6900]"
                      }`}>
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>
          ) : (
            /* Mode 2: Executive 2026 Workspace Navigation Groups */
            <div className="space-y-3">
              {ADMIN_NAV_GROUPS.map((group) => {
                const isCollapsed = collapsedGroups[group.title];

                return (
                  <div key={group.title} className="space-y-0.5">
                    {!isCompactRail && (
                      <button
                        type="button"
                        onClick={() => toggleGroup(group.title)}
                        className="w-full px-2.5 py-1 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400 hover:text-slate-700 transition"
                      >
                        <span>{group.title}</span>
                        <ChevronDown
                          className={`h-3 w-3 text-slate-400 transition-transform duration-200 ${
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
                              className={`w-full flex items-center rounded-xl transition-all group ${
                                isCompactRail
                                  ? "justify-center p-2.5 my-1"
                                  : "justify-between px-3 py-2 text-xs font-semibold"
                              } ${
                                isActive
                                  ? "bg-[#ff6900] text-white shadow-sm shadow-orange-500/20 font-bold"
                                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <Icon
                                  className={`shrink-0 transition-colors ${
                                    isCompactRail ? "h-5 w-5" : "h-4 w-4"
                                  } ${
                                    isActive ? "text-white" : "text-slate-400 group-hover:text-slate-700"
                                  }`}
                                />
                                {!isCompactRail && <span className="truncate">{item.label}</span>}
                              </div>

                              {!isCompactRail && item.badge && (
                                <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded-full ${
                                  isActive ? "bg-white text-[#ff6900]" : "bg-orange-50 text-[#ff6900] border border-orange-200/60"
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

          {/* Direct Core Modules: Analytics, AI Assistant, Chat */}
          <div className="pt-2 border-t border-slate-100 space-y-0.5">
            {/* Analytics */}
            <Link
              to="/finance/reports"
              onClick={() => setMobileMenuOpen(false)}
              className={`w-full flex items-center rounded-xl transition-all group ${
                isCompactRail
                  ? "justify-center p-2.5 my-1"
                  : "justify-between px-3 py-2 text-xs font-semibold"
              } ${
                currentPath.startsWith("/finance/reports")
                  ? "bg-[#ff6900] text-white shadow-sm shadow-orange-500/20 font-bold"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <PieChart className="h-4 w-4 text-slate-400 group-hover:text-slate-700 shrink-0" />
                {!isCompactRail && <span className="truncate">Analytics</span>}
              </div>
            </Link>

            {/* AI Assistant */}
            <button
              type="button"
              onClick={() => setAiDrawerOpen(true)}
              className={`w-full flex items-center rounded-xl transition-all group ${
                isCompactRail
                  ? "justify-center p-2.5 my-1"
                  : "justify-between px-3 py-2 text-xs font-semibold"
              } text-[#ff6900] hover:bg-orange-50/80`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Sparkles className="h-4 w-4 text-[#ff6900] shrink-0" />
                {!isCompactRail && <span className="font-bold truncate">Stanforte AI</span>}
              </div>
              {!isCompactRail && (
                <span className="px-1.5 py-0.5 text-[9px] font-black rounded-md bg-orange-100 text-[#ff6900]">
                  ⌘K
                </span>
              )}
            </button>

            {/* Team Chat */}
            <Link
              to="/chat"
              onClick={() => setMobileMenuOpen(false)}
              className={`w-full flex items-center rounded-xl transition-all group ${
                isCompactRail
                  ? "justify-center p-2.5 my-1"
                  : "justify-between px-3 py-2 text-xs font-semibold"
              } ${
                currentPath.startsWith("/chat")
                  ? "bg-[#ff6900] text-white shadow-sm shadow-orange-500/20 font-bold"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <MessageSquare className="h-4 w-4 text-slate-400 group-hover:text-slate-700 shrink-0" />
                {!isCompactRail && <span className="truncate">Team Chat</span>}
              </div>
            </Link>
          </div>
        </div>

        {/* Bottom: Settings & Quick Profile */}
        <div className="shrink-0 pt-2 border-t border-slate-100 space-y-1">
          <Link
            to="/admin/settings"
            className={`w-full flex items-center gap-2.5 py-2 px-3 text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition-colors text-xs font-semibold ${
              isCompactRail ? "justify-center" : "justify-start"
            }`}
          >
            <Settings className="h-4 w-4 text-slate-400" />
            {!isCompactRail && <span>Settings</span>}
          </Link>

          {/* User Profile Mini Trigger */}
          <button
            type="button"
            onClick={() => setUserDrawerOpen(true)}
            className={`w-full flex items-center gap-2.5 p-2 rounded-xl hover:bg-slate-50 transition-colors text-left ${
              isCompactRail ? "justify-center" : "justify-between"
            }`}
          >
            <div className="w-9 h-9 rounded-full bg-[#ff6900] text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
              {initials || "DO"}
            </div>
            {!isCompactRail && (
              <div className="min-w-0 flex-1 leading-tight">
                <div className="text-xs font-bold text-slate-900 truncate">{userName}</div>
                <div className="text-[10px] text-slate-400 capitalize truncate">{userRole}</div>
              </div>
            )}
            {!isCompactRail && (
              <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />
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
        {/* Sticky Top Bar (2026 Linear/Ramp Standard) */}
        <header className="h-16 shrink-0 bg-white/95 backdrop-blur-sm border-b border-slate-100 px-4 sm:px-8 flex items-center justify-between sticky top-0 z-20">
          {/* Left: Mobile hamburger + Workspace Switcher + ⌘K Command Palette Trigger */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>

            {/* Workspace Switcher Pill */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200/70 text-xs font-bold text-slate-800 shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="truncate max-w-[140px] sm:max-w-none">Stanforte Group • Lagos HQ</span>
            </div>

            {/* Linear-Style ⌘K Command Search Bar Trigger */}
            <button
              type="button"
              onClick={() => setCommandPaletteOpen(true)}
              className="hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-50/80 hover:bg-slate-100/80 border border-slate-200/80 text-xs text-slate-500 hover:text-slate-800 transition w-64 lg:w-80 justify-between shadow-2xs group cursor-pointer"
            >
              <div className="flex items-center gap-2 truncate">
                <Search className="h-3.5 w-3.5 text-slate-400 group-hover:text-slate-600 shrink-0" />
                <span className="truncate">Search records or ask AI...</span>
              </div>
              <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono font-semibold bg-white border border-slate-200 rounded-md text-slate-500 shadow-xs">
                ⌘K
              </kbd>
            </button>
          </div>

          {/* Right Action Items: AI Assistant Pill, Notifications, User Profile */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* AI Assistant Button (High-visibility 2026 design) */}
            <button
              type="button"
              onClick={() => setAiDrawerOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-orange-50 hover:bg-orange-100 text-[#ff6900] border border-orange-200/70 text-xs font-bold transition shadow-2xs group cursor-pointer"
            >
              <Sparkles className="h-3.5 w-3.5 text-[#ff6900] group-hover:rotate-12 transition-transform" />
              <span>Ask AI</span>
            </button>

            {/* Help Center */}
            <Link
              to="/help"
              className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors hidden sm:flex"
              title="Help & Documentation"
            >
              <HelpCircle className="h-4 w-4" />
            </Link>

            {/* Notification Bell */}
            <Link
              to="/account/notifications"
              className="relative p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
              title="Notifications"
            >
              <Bell className="h-4 w-4" />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-[#ff6900]" />
            </Link>

            {/* --------------------------------------------------------- */}
            {/* 9-DOTS APP LAUNCHER BUTTON (Admin Console only)           */}
            {/* --------------------------------------------------------- */}
            {isAdmin && (
              <button
                type="button"
                onClick={() => setAppLauncherOpen(true)}
                className="p-2 rounded-xl hover:bg-slate-100 text-slate-700 hover:text-slate-900 transition-colors"
                title="App Launcher & Applications Directory"
              >
                <LayoutGrid className="h-5 w-5 text-slate-700" />
              </button>
            )}

            {/* --------------------------------------------------------- */}
            {/* USER PROFILE DROPDOWN (Right Corner)                       */}
            {/* --------------------------------------------------------- */}
            <div className="relative" ref={userDropdownRef}>
              <button
                type="button"
                onClick={() => setUserDropdownOpen((v) => !v)}
                className={`flex items-center gap-2 p-1 pl-1.5 rounded-full transition border shadow-sm ${
                  userDropdownOpen
                    ? "bg-slate-100 border-slate-300 ring-2 ring-orange-500/20"
                    : "hover:bg-slate-100 border-slate-200/80"
                }`}
                title="User Account & Settings"
              >
                <div className="w-8 h-8 rounded-full bg-[#ff6900] text-white font-bold text-xs flex items-center justify-center shadow-inner">
                  {initials || "AD"}
                </div>
                <ChevronDown
                  className={`h-3.5 w-3.5 text-slate-500 mr-1 transition-transform duration-200 ${
                    userDropdownOpen ? "rotate-180 text-slate-800" : ""
                  }`}
                />
              </button>

              {/* Top-Right Dropdown Menu */}
              {userDropdownOpen && (
                <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-2026 border border-slate-100 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  {/* User Profile Header */}
                  <div className="px-4 py-3 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#ff6900] text-white font-bold text-sm flex items-center justify-center shrink-0 shadow-sm">
                        {initials || "AD"}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-slate-900 truncate">
                          {userName}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate">
                          {user?.email || "staff@stanforteedge.com"}
                        </div>
                        <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-orange-50 text-[#ff6900] border border-orange-200/60">
                            {userRole}
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600">
                            {workspaceMode === "admin" ? "Admin Mode" : "Staff Mode"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ADMIN CONSOLE VIEW SWITCH ACTION (Prominent for admins) */}
                  {isAdmin && (
                    <div className="p-2 border-b border-slate-100 bg-slate-50/50">
                      {workspaceMode === "employee" ? (
                        <button
                          type="button"
                          onClick={() => {
                            switchWorkspaceMode("admin");
                            setUserDropdownOpen(false);
                          }}
                          className="w-full flex items-center justify-between p-2.5 rounded-xl bg-blue-50 hover:bg-blue-100/90 border border-blue-200/70 text-blue-900 transition text-xs font-bold group shadow-xs"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-sm shrink-0">
                              <ShieldCheck className="h-4 w-4" />
                            </div>
                            <div className="text-left">
                              <div className="text-xs font-black text-blue-900">
                                View Admin Console
                              </div>
                              <div className="text-[10px] font-medium text-blue-700">
                                Workforce &amp; Management Hub
                              </div>
                            </div>
                          </div>
                          <ChevronRight className="h-4 w-4 text-blue-500 group-hover:translate-x-0.5 transition-transform shrink-0" />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            switchWorkspaceMode("employee");
                            setUserDropdownOpen(false);
                          }}
                          className="w-full flex items-center justify-between p-2.5 rounded-xl bg-orange-50 hover:bg-orange-100/90 border border-orange-200/70 text-orange-950 transition text-xs font-bold group shadow-xs"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-[#ff6900] text-white flex items-center justify-center shadow-sm shrink-0">
                              <UserIcon className="h-4 w-4" />
                            </div>
                            <div className="text-left">
                              <div className="text-xs font-black text-orange-900">
                                Staff Workspace
                              </div>
                              <div className="text-[10px] font-medium text-[#ff6900]">
                                Return to daily staff dashboard
                              </div>
                            </div>
                          </div>
                          <ChevronRight className="h-4 w-4 text-orange-500 group-hover:translate-x-0.5 transition-transform shrink-0" />
                        </button>
                      )}
                    </div>
                  )}

                  {/* Navigation Links */}
                  <div className="p-1 text-xs space-y-0.5">
                    <Link
                      to="/account/profile"
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-700 hover:bg-slate-50 font-medium transition"
                    >
                      <UserIcon className="h-4 w-4 text-slate-400" />
                      <span>My Profile</span>
                    </Link>

                    <Link
                      to="/account/payslips"
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-700 hover:bg-slate-50 font-medium transition"
                    >
                      <Receipt className="h-4 w-4 text-slate-400" />
                      <span>My Payslips</span>
                    </Link>

                    <Link
                      to="/account/timesheets"
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-700 hover:bg-slate-50 font-medium transition"
                    >
                      <CalendarCheck className="h-4 w-4 text-slate-400" />
                      <span>My Timesheets</span>
                    </Link>

                    <Link
                      to="/account/settings"
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-700 hover:bg-slate-50 font-medium transition"
                    >
                      <Settings className="h-4 w-4 text-slate-400" />
                      <span>Account Settings</span>
                    </Link>

                    {isAdmin && (
                      <Link
                        to="/admin/settings"
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-700 hover:bg-slate-50 font-medium transition"
                      >
                        <SlidersHorizontal className="h-4 w-4 text-slate-400" />
                        <span>System Administration</span>
                      </Link>
                    )}
                  </div>

                  {/* Sign Out */}
                  <div className="p-1 pt-1 border-t border-slate-100">
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

                {/* Timezone & Regional Display */}
                <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-orange-500/15 text-[#ff6900] flex items-center justify-center shrink-0">
                      <Globe className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase font-semibold">Timezone &amp; Format</div>
                      <div className="text-xs font-bold text-white mt-0.5">WAT (Africa/Lagos) &bull; 12-Hour</div>
                    </div>
                  </div>
                  <Link
                    to="/admin/settings"
                    onClick={() => setUserDrawerOpen(false)}
                    className="text-[11px] font-bold text-[#ff6900] hover:underline"
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
      {/* ============================================================= */}
      {/* 2026 GLOBAL COMMAND PALETTE (⌘K) MODAL                        */}
      {/* ============================================================= */}
      {commandPaletteOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto p-4 sm:p-6 md:p-20 flex justify-center items-start animate-in fade-in duration-150">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
            onClick={() => setCommandPaletteOpen(false)}
          />

          <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2026 border border-slate-100 overflow-hidden z-10 animate-in zoom-in-95 duration-150">
            {/* Input Bar */}
            <div className="flex items-center px-4 py-3.5 border-b border-slate-100 gap-3">
              <Search className="h-5 w-5 text-slate-400 shrink-0" />
              <input
                type="text"
                autoFocus
                value={commandQuery}
                onChange={(e) => setCommandQuery(e.target.value)}
                placeholder="Search employees, vouchers, leaves, or ask Stanforte AI..."
                className="w-full text-sm font-medium bg-transparent outline-none placeholder:text-slate-400 text-slate-900 border-none p-0 focus:ring-0"
              />
              {commandQuery ? (
                <button
                  type="button"
                  onClick={() => setCommandQuery("")}
                  className="p-1 rounded-md text-slate-400 hover:text-slate-600"
                >
                  <X className="h-4 w-4" />
                </button>
              ) : (
                <span className="text-[10px] font-mono text-slate-400 px-1.5 py-0.5 rounded bg-slate-100">
                  ESC
                </span>
              )}
            </div>

            {/* Quick Natural Language AI Suggestion Chips */}
            <div className="px-4 py-2.5 bg-slate-50/70 border-b border-slate-100 flex items-center gap-2 overflow-x-auto text-[11px]">
              <span className="text-slate-400 font-bold uppercase tracking-wider shrink-0 text-[10px]">
                Suggested:
              </span>
              <button
                type="button"
                onClick={() => {
                  setCommandPaletteOpen(false);
                  setAiDrawerOpen(true);
                  handleRunAiPrompt("What needs my approval?");
                }}
                className="px-2.5 py-1 rounded-full bg-white border border-slate-200/80 text-slate-700 hover:border-[#ff6900] hover:text-[#ff6900] transition whitespace-nowrap font-medium shrink-0 cursor-pointer"
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
                className="px-2.5 py-1 rounded-full bg-white border border-slate-200/80 text-slate-700 hover:border-[#ff6900] hover:text-[#ff6900] transition whitespace-nowrap font-medium shrink-0 cursor-pointer"
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
                className="px-2.5 py-1 rounded-full bg-white border border-slate-200/80 text-slate-700 hover:border-[#ff6900] hover:text-[#ff6900] transition whitespace-nowrap font-medium shrink-0 cursor-pointer"
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
                className="px-2.5 py-1 rounded-full bg-white border border-slate-200/80 text-slate-700 hover:border-[#ff6900] hover:text-[#ff6900] transition whitespace-nowrap font-medium shrink-0 cursor-pointer"
              >
                📊 Generate payroll summary
              </button>
            </div>

            {/* Entity Results List */}
            <div className="max-h-96 overflow-y-auto p-2 divide-y divide-slate-50">
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
                    className="flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 transition group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-slate-100 group-hover:bg-orange-50 text-slate-600 group-hover:text-[#ff6900] flex items-center justify-center shrink-0 transition">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-900 group-hover:text-[#ff6900] transition truncate">
                          {item.title}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate">{item.subtitle}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 ml-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                        {item.tag}
                      </span>
                      <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-slate-600 group-hover:translate-x-0.5 transition" />
                    </div>
                  </Link>
                );
              })}
            </div>

            {/* Footer */}
            <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
              <div className="flex items-center gap-3">
                <span>Navigate <kbd className="px-1.5 py-0.5 bg-white border rounded text-[10px]">↑</kbd> <kbd className="px-1.5 py-0.5 bg-white border rounded text-[10px]">↓</kbd></span>
                <span>Select <kbd className="px-1.5 py-0.5 bg-white border rounded text-[10px]">↵</kbd></span>
              </div>
              <span className="font-semibold text-slate-500">Stanforte Edge 2026</span>
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
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
            onClick={() => setAiDrawerOpen(false)}
          />

          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-md bg-white text-slate-900 shadow-2026 flex flex-col justify-between border-l border-slate-100">
              {/* Header */}
              <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-2xl bg-orange-50 text-[#ff6900] flex items-center justify-center font-bold">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                      <span>Stanforte AI</span>
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-orange-100 text-[#ff6900]">
                        2026
                      </span>
                    </h3>
                    <p className="text-[11px] text-slate-400">Enterprise Contextual Assistant</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setAiDrawerOpen(false)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Suggested Questions Grid */}
              <div className="p-4 bg-slate-50/70 border-b border-slate-100 space-y-2">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
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
                      className="text-left px-3 py-2 rounded-xl bg-white border border-slate-200/80 hover:border-[#ff6900] hover:text-[#ff6900] text-slate-700 font-medium transition shadow-2xs text-[11px] flex items-center justify-between group cursor-pointer"
                    >
                      <span>{q}</span>
                      <ArrowRight className="h-3 w-3 text-slate-300 group-hover:text-[#ff6900] group-hover:translate-x-0.5 transition" />
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
                          : "bg-slate-50 border border-slate-100 text-slate-800 shadow-2xs"
                      }`}
                    >
                      <div className="font-medium whitespace-pre-wrap">{msg.text}</div>

                      {msg.data && msg.data.actionLink && (
                        <Link
                          to={msg.data.actionLink}
                          onClick={() => setAiDrawerOpen(false)}
                          className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-[#ff6900] font-bold text-[11px] shadow-2xs hover:bg-slate-50 transition"
                        >
                          <span>{msg.data.actionLabel || "View Record"}</span>
                          <ArrowRight className="h-3 w-3" />
                        </Link>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400 mt-1 px-1">{msg.time}</span>
                  </div>
                ))}
              </div>

              {/* Bottom Input Box */}
              <div className="p-4 border-t border-slate-100 bg-white">
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
                    className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 outline-none focus:border-[#ff6900]"
                  />
                  <button
                    type="submit"
                    className="p-2.5 rounded-xl bg-[#ff6900] hover:bg-[#ea580c] text-white font-bold transition shadow-sm cursor-pointer"
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
