import { useState, type ReactNode } from "react";
import { Link, useNavigate } from "@/shared/router-adapter";
import { useAuth } from "@/shared/context/AuthProvider";
import { StanforteLogo } from "@/components/brand/StanforteLogo";
import {
  LayoutDashboard,
  Users,
  Clock,
  CreditCard,
  Building2,
  FileCheck,
  BarChart3,
  Settings,
  Search,
  Bell,
  ChevronDown,
  LogOut,
  Menu,
  X,
  User as UserIcon,
} from "lucide-react";

export type NavItemKey =
  | "Dashboard"
  | "HR & Workforce"
  | "Attendance"
  | "Payroll"
  | "Finance & Procurement"
  | "Approvals"
  | "Reports"
  | "Settings";

interface PortalLayoutProps {
  children: ReactNode;
  activeNav?: NavItemKey | string;
}

export function PortalLayout({ children, activeNav = "HR & Workforce" }: PortalLayoutProps) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const userName = user?.first_name
    ? `${user.first_name} ${user.last_name || ""}`.trim()
    : user?.email?.split("@")[0] || "Daniel Owonikoko";

  const userRole = user?.roles?.[0]
    ? String(user.roles[0]).replace(/_/g, " ")
    : "Administrator";

  const orgName = (user as any)?.workspace_name ||
    user?.organizations?.[0]?.name ||
    "Acme Nigeria Ltd";

  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const navItems = [
    { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
    { label: "HR & Workforce", icon: Users, path: "/admin/users" },
    { label: "Attendance", icon: Clock, path: "/attendance" },
    { label: "Payroll", icon: CreditCard, path: "/finance" },
    { label: "Finance & Procurement", icon: Building2, path: "/finance" },
    { label: "Approvals", icon: FileCheck, path: "/requests/approvals" },
    { label: "Reports", icon: BarChart3, path: "/dashboard" },
    { label: "Settings", icon: Settings, path: "/admin/settings" },
  ];

  async function handleSignOut() {
    try {
      await signOut();
      navigate("/login");
    } catch {
      window.location.href = "/login";
    }
  }

  return (
    <div className="min-h-screen bg-[#f4f7fc] flex font-sans text-slate-900 selection:bg-[#ff6900] selection:text-white antialiased">
      {/* 1. Left Sidebar (Fixed on Desktop, Off-canvas on Mobile) */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-[#0a1128] text-white flex flex-col justify-between shrink-0 p-5 transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="space-y-8">
          {/* Brand Logo & Mobile Close */}
          <div className="pt-2 flex items-center justify-between">
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

          {/* Navigation Links */}
          <nav className="space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeNav === item.label;
              return (
                <Link
                  key={item.label}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? "bg-[#ff6900] text-white shadow-md shadow-orange-500/25"
                      : "text-slate-300 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User Profile Pill & Sign Out Dropdown */}
        <div className="relative pt-4 border-t border-white/10">
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
                to="/admin/settings"
                onClick={() => setUserMenuOpen(false)}
                className="flex items-center gap-2 px-3 py-2 text-slate-300 hover:text-white hover:bg-white/5"
              >
                <UserIcon className="h-3.5 w-3.5" />
                <span>Account Settings</span>
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
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Header Bar */}
        <header className="h-16 bg-white border-b border-slate-200/80 px-4 sm:px-8 flex items-center justify-between sticky top-0 z-20">
          {/* Mobile Menu Button & Search Input */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>

            <div className="relative w-52 sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search anything..."
                className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none transition focus:bg-white focus:border-[#ff6900]"
              />
            </div>
          </div>

          {/* Right Action Items: Notifications & Org Selector */}
          <div className="flex items-center gap-3 sm:gap-4">
            {/* Notification Bell */}
            <div className="relative cursor-pointer p-2 rounded-lg hover:bg-slate-100 text-slate-600">
              <Bell className="h-4 w-4" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 ring-2 ring-white" />
            </div>

            {/* Organization Selector */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-800 cursor-pointer hover:bg-slate-50 shadow-sm">
              <Building2 className="h-3.5 w-3.5 text-slate-600 shrink-0" />
              <span className="max-w-[130px] sm:max-w-[180px] truncate">{orgName}</span>
              <ChevronDown className="h-3 w-3 text-slate-400 shrink-0" />
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-4 sm:p-8 space-y-6 max-w-7xl mx-auto w-full flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}
