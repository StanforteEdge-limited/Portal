import React from "react";
import { Link } from "@/shared/router-adapter";
import brandLogo from "../../../../shared/assets/brand/stanforte-logo.png";

interface PublicLayoutProps {
  children: React.ReactNode;
  activePath?: string;
}

export function PublicLayout({ children, activePath = "/" }: PublicLayoutProps) {
  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-slate-900 selection:text-white flex flex-col justify-between">
      {/* Top Notification / Trust Bar */}
      <div className="bg-slate-50 border-b border-slate-200 px-4 py-2 text-center text-xs font-medium text-slate-600">
        <span>Stanforte Edge Enterprise Platform &bull; Multi-branch workforce management, payroll & compliance.</span>
        <Link to="/features" className="ml-2 font-semibold text-blue-700 hover:underline">
          Explore all capabilities &rarr;
        </Link>
      </div>

      {/* Main Header Navigation */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-18 flex items-center justify-between py-3.5">
          {/* Brand */}
          <Link to="/" className="flex items-center gap-3">
            <img src={brandLogo} alt="Stanforte Edge" className="h-8 w-auto object-contain" />
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium">
            <Link
              to="/"
              className={`transition-colors py-1 ${
                activePath === "/"
                  ? "text-slate-900 font-semibold border-b-2 border-slate-900"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Overview
            </Link>
            <Link
              to="/features"
              className={`transition-colors py-1 ${
                activePath === "/features"
                  ? "text-slate-900 font-semibold border-b-2 border-slate-900"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Modules & Capabilities
            </Link>
            <Link
              to="/pricing"
              className={`transition-colors py-1 ${
                activePath === "/pricing"
                  ? "text-slate-900 font-semibold border-b-2 border-slate-900"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Pricing
            </Link>
            <Link
              to="/security"
              className={`transition-colors py-1 ${
                activePath === "/security"
                  ? "text-slate-900 font-semibold border-b-2 border-slate-900"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Security & Compliance
            </Link>
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="px-4 py-2 text-sm font-semibold text-slate-700 hover:text-slate-900 transition-colors"
            >
              Sign In
            </Link>
            <Link
              to="/register"
              className="px-4 py-2 text-sm font-semibold rounded-md bg-slate-900 hover:bg-slate-800 text-white transition-colors"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-grow">{children}</main>

      {/* Global Pre-Footer Call to Action */}
      <section className="border-t border-slate-200 bg-slate-50 py-16 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-slate-900 font-headline">
            Start managing your organization with confidence
          </h2>
          <p className="mt-4 text-base text-slate-600 max-w-2xl mx-auto">
            Join hundreds of teams streamlining staff administration, monthly salary disbursements, and multi-tier purchase approvals on Stanforte Edge.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link
              to="/register"
              className="px-6 py-3 rounded-md font-semibold text-sm bg-slate-900 hover:bg-slate-800 text-white transition-colors"
            >
              Create Organization Account
            </Link>
            <Link
              to="/pricing"
              className="px-6 py-3 rounded-md font-semibold text-sm border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 transition-colors"
            >
              View Plans & Pricing
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-12 px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-5 gap-8 text-sm">
          {/* Column 1: Brand & Details */}
          <div className="col-span-2 space-y-4">
            <img src={brandLogo} alt="Stanforte Edge" className="h-7 w-auto object-contain" />
            <p className="text-xs text-slate-500 max-w-sm leading-relaxed">
              Stanforte Edge delivers unified workforce management, automated statutory payroll, and operational governance for enterprise teams.
            </p>
            <div className="text-xs text-slate-400">
              &copy; {new Date().getFullYear()} Stanforte Edge Limited. All rights reserved.
            </div>
          </div>

          {/* Column 2: Platform Modules */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-900 mb-3">Platform</h4>
            <ul className="space-y-2 text-xs text-slate-600">
              <li><Link to="/features" className="hover:text-slate-900">Employee Directory</Link></li>
              <li><Link to="/features" className="hover:text-slate-900">Attendance & Shifts</Link></li>
              <li><Link to="/features" className="hover:text-slate-900">Automated Payroll</Link></li>
              <li><Link to="/features" className="hover:text-slate-900">Leave Management</Link></li>
              <li><Link to="/features" className="hover:text-slate-900">Approval Workflows</Link></li>
              <li><Link to="/features" className="hover:text-slate-900">Expense Ledgers</Link></li>
            </ul>
          </div>

          {/* Column 3: Trust & Governance */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-900 mb-3">Trust & Security</h4>
            <ul className="space-y-2 text-xs text-slate-600">
              <li><Link to="/security" className="hover:text-slate-900">Data Isolation</Link></li>
              <li><Link to="/security" className="hover:text-slate-900">Statutory Tax Compliance</Link></li>
              <li><Link to="/security" className="hover:text-slate-900">Role-Based Access</Link></li>
              <li><Link to="/security" className="hover:text-slate-900">Audit Logs</Link></li>
              <li><Link to="/pricing" className="hover:text-slate-900">Service Level Agreement</Link></li>
            </ul>
          </div>

          {/* Column 4: Access */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-900 mb-3">Access</h4>
            <ul className="space-y-2 text-xs text-slate-600">
              <li><Link to="/login" className="hover:text-slate-900">Sign In</Link></li>
              <li><Link to="/register" className="hover:text-slate-900">Register Organization</Link></li>
              <li><Link to="/pricing" className="hover:text-slate-900">Plans & Headcount</Link></li>
              <li><a href="mailto:support@stanforteedge.com" className="hover:text-slate-900">Help & Support</a></li>
            </ul>
          </div>
        </div>
      </footer>
    </div>
  );
}
