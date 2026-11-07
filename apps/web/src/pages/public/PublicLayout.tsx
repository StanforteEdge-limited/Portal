import React from "react";
import { Link } from "@/shared/router-adapter";
import brandLogo from "../../../../shared/assets/brand/stanforte-logo.png";

interface PublicLayoutProps {
  children: React.ReactNode;
  activePath?: string;
}

export function PublicLayout({ children, activePath = "/" }: PublicLayoutProps) {
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans selection:bg-blue-600 selection:text-white flex flex-col justify-between">
      {/* Background ambient lighting */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[1100px] h-[550px] bg-gradient-to-tr from-blue-600/20 via-indigo-500/20 to-teal-400/10 blur-[140px] rounded-full" />
        <div className="absolute top-1/2 -right-40 w-[600px] h-[600px] bg-indigo-600/10 blur-[140px] rounded-full" />
        <div className="absolute -bottom-40 -left-40 w-[600px] h-[600px] bg-blue-600/10 blur-[140px] rounded-full" />
      </div>

      {/* Header Navigation */}
      <header className="relative z-50 border-b border-slate-800/80 bg-slate-900/80 backdrop-blur-xl sticky top-0">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <img src={brandLogo} alt="Stanforte Edge" className="h-9 w-auto object-contain brightness-110" />
            <span className="hidden sm:inline-block font-bold tracking-tight text-xl text-white font-headline">
              Stanforte<span className="text-blue-400">Edge</span>{" "}
              <span className="text-xs uppercase tracking-widest px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 ml-1">
                SaaS 2.0
              </span>
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium">
            <Link
              to="/"
              className={`transition-colors ${activePath === "/" ? "text-white font-semibold" : "text-slate-400 hover:text-white"}`}
            >
              Overview
            </Link>
            <Link
              to="/features"
              className={`transition-colors ${activePath === "/features" ? "text-white font-semibold" : "text-slate-400 hover:text-white"}`}
            >
              Modules & Features
            </Link>
            <Link
              to="/pricing"
              className={`transition-colors ${activePath === "/pricing" ? "text-white font-semibold" : "text-slate-400 hover:text-white"}`}
            >
              Plans & Pricing
            </Link>
            <Link
              to="/security"
              className={`transition-colors ${activePath === "/security" ? "text-white font-semibold" : "text-slate-400 hover:text-white"}`}
            >
              Enterprise Security
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="px-4 py-2 text-sm font-semibold text-slate-300 hover:text-white transition-colors"
            >
              Sign In
            </Link>
            <Link
              to="/register"
              className="px-5 py-2.5 text-sm font-semibold rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-500/25 transition-all transform hover:-translate-y-0.5"
            >
              Create Free Workspace
            </Link>
          </div>
        </div>
      </header>

      {/* Main Page Content */}
      <main className="relative z-10 flex-grow">{children}</main>

      {/* Global Pre-Footer Call to Action */}
      <section className="relative z-10 border-t border-slate-800 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950 py-16 px-6 text-center">
        <div className="max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold uppercase tracking-wider mb-6">
            Multi-Tenant Enterprise Cloud
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
            Ready to Unify Your Workforce Operations?
          </h2>
          <p className="mt-4 text-base sm:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Provision your dedicated workspace in under 60 seconds. Free for up to 15 employees, with automated payroll runs, attendance tracking, and finance ledgers ready on day one.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link
              to="/register"
              className="px-8 py-4 rounded-xl font-bold text-base bg-blue-600 hover:bg-blue-500 text-white shadow-xl shadow-blue-600/30 transition-all transform hover:-translate-y-0.5 flex items-center gap-2"
            >
              Create Free Workspace
              <span className="material-symbols-outlined text-lg">arrow_forward</span>
            </Link>
            <Link
              to="/pricing"
              className="px-8 py-4 rounded-xl font-semibold text-base border border-slate-700 bg-slate-800/60 hover:bg-slate-800 text-slate-200 transition-all flex items-center gap-2"
            >
              View Plan Details
            </Link>
          </div>
        </div>
      </section>

      {/* Global Footer */}
      <footer className="relative z-10 border-t border-slate-800 bg-slate-950 py-12 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
            <div className="col-span-2">
              <Link to="/" className="flex items-center gap-3">
                <img src={brandLogo} alt="Stanforte Edge" className="h-7 w-auto brightness-110" />
                <span className="font-bold text-white tracking-tight text-lg">
                  Stanforte<span className="text-blue-400">Edge</span>
                </span>
              </Link>
              <p className="mt-4 text-xs text-slate-400 max-w-sm leading-relaxed">
                The all-in-one multi-tenant enterprise operating system for People Operations, Automated Payroll, Finance Ledgers, Procurement, and Multi-Step Approval Workflows.
              </p>
              <div className="mt-6 flex items-center gap-4 text-xs text-slate-400">
                <div className="flex items-center gap-1.5 text-emerald-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Fastify 5 Backend Online
                </div>
                <span>•</span>
                <span>Postgres 16 Multi-Tenant</span>
              </div>
            </div>

            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-slate-200 mb-4">Product</div>
              <ul className="space-y-2 text-xs text-slate-400">
                <li><Link to="/features" className="hover:text-white transition-colors">All 14 Modules</Link></li>
                <li><Link to="/features#hr" className="hover:text-white transition-colors">HR & Attendance</Link></li>
                <li><Link to="/features#payroll" className="hover:text-white transition-colors">Automated Payroll</Link></li>
                <li><Link to="/features#finance" className="hover:text-white transition-colors">General Ledger</Link></li>
                <li><Link to="/features#workflows" className="hover:text-white transition-colors">Approval Workflows</Link></li>
                <li><Link to="/features#procurement" className="hover:text-white transition-colors">B2B Vendor Portal</Link></li>
              </ul>
            </div>

            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-slate-200 mb-4">Solutions</div>
              <ul className="space-y-2 text-xs text-slate-400">
                <li><Link to="/pricing" className="hover:text-white transition-colors">Plans & Pricing</Link></li>
                <li><Link to="/security" className="hover:text-white transition-colors">Tenant Data Isolation</Link></li>
                <li><Link to="/security" className="hover:text-white transition-colors">Bank-Grade RBAC</Link></li>
                <li><Link to="/vendor-portal/login" className="hover:text-white transition-colors">Vendor Portal Login</Link></li>
              </ul>
            </div>

            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-slate-200 mb-4">Get Started</div>
              <ul className="space-y-2 text-xs text-slate-400">
                <li><Link to="/login" className="hover:text-white transition-colors">Sign In to Workspace</Link></li>
                <li><Link to="/register" className="hover:text-white transition-colors">Create Free Workspace</Link></li>
                <li><Link to="/forgot-password" className="hover:text-white transition-colors">Account Recovery</Link></li>
                <li>
                  <a
                    href="http://localhost:3000/v1/health/readyz"
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-emerald-400 transition-colors flex items-center gap-1"
                  >
                    API Health Status <span className="material-symbols-outlined text-xs">open_in_new</span>
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-slate-900 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
            <div>&copy; {new Date().getFullYear()} Stanforte Edge Limited. All rights reserved.</div>
            <div className="flex items-center gap-6">
              <Link to="/security" className="hover:text-slate-400 transition-colors">Security & Privacy</Link>
              <Link to="/pricing" className="hover:text-slate-400 transition-colors">Terms of Service</Link>
              <a href="mailto:support@stanforteedge.com" className="hover:text-slate-400 transition-colors">Contact Support</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

