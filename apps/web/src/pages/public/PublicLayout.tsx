import React from "react";
import { Link } from "@/shared/router-adapter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowRight } from "lucide-react";
import brandLogo from "../../../../shared/assets/brand/stanforte-logo.png";

interface PublicLayoutProps {
  children: React.ReactNode;
  activePath?: string;
}

export function PublicLayout({ children, activePath = "/" }: PublicLayoutProps) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col justify-between">
      {/* Top Notification / Trust Bar */}
      <div className="bg-white border-b border-slate-200 px-4 py-2 text-center text-xs font-medium text-slate-600 flex items-center justify-center gap-2">
        <Badge variant="secondary" className="text-[11px] font-medium py-0 px-2">
          New
        </Badge>
        <span>Multi-branch workforce operations, automated payroll & compliance platform.</span>
        <Link to="/features" className="font-semibold text-slate-900 hover:underline inline-flex items-center gap-0.5 ml-1">
          Explore features <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {/* Main Header Navigation */}
      <header className="border-b border-slate-200 bg-white/95 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Brand */}
          <Link to="/" className="flex items-center gap-3">
            <img src={brandLogo} alt="Stanforte Edge" className="h-7 w-auto object-contain" />
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1 text-sm font-medium">
            <Button
              asChild
              variant={activePath === "/" ? "secondary" : "ghost"}
              size="sm"
            >
              <Link to="/">Overview</Link>
            </Button>
            <Button
              asChild
              variant={activePath === "/features" ? "secondary" : "ghost"}
              size="sm"
            >
              <Link to="/features">Capabilities</Link>
            </Button>
            <Button
              asChild
              variant={activePath === "/pricing" ? "secondary" : "ghost"}
              size="sm"
            >
              <Link to="/pricing">Pricing</Link>
            </Button>
            <Button
              asChild
              variant={activePath === "/security" ? "secondary" : "ghost"}
              size="sm"
            >
              <Link to="/security">Security</Link>
            </Button>
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link to="/login">Sign In</Link>
            </Button>
            <Button asChild variant="default" size="sm">
              <Link to="/register">Get Started</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Page Content */}
      <main className="flex-grow">{children}</main>

      {/* Global Pre-Footer Call to Action */}
      <section className="border-t border-slate-200 bg-white py-16 px-6">
        <div className="max-w-4xl mx-auto text-center space-y-4">
          <Badge variant="outline" className="px-3 py-1">
            Enterprise Ready
          </Badge>
          <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-slate-900 font-headline">
            Start managing your workforce with confidence
          </h2>
          <p className="text-sm sm:text-base text-slate-600 max-w-2xl mx-auto">
            Join hundreds of multi-branch companies running staff records, monthly salary disbursements, and multi-tier approvals on Stanforte Edge.
          </p>
          <div className="pt-4 flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg">
              <Link to="/register" className="flex items-center gap-2">
                Create Organization Account <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link to="/pricing">View Plans & Pricing</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-slate-50 py-12 px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-5 gap-8 text-sm">
          {/* Column 1: Brand & Details */}
          <div className="col-span-2 space-y-3">
            <img src={brandLogo} alt="Stanforte Edge" className="h-7 w-auto object-contain" />
            <p className="text-xs text-slate-500 max-w-sm leading-relaxed">
              Stanforte Edge delivers unified workforce management, automated statutory payroll, and institutional governance for enterprise operations.
            </p>
            <div className="text-xs text-slate-400 pt-2">
              &copy; {new Date().getFullYear()} Stanforte Edge Limited. All rights reserved.
            </div>
          </div>

          {/* Column 2: Platform Modules */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-900 mb-3">Platform</h4>
            <ul className="space-y-2 text-xs text-slate-600">
              <li><Link to="/features" className="hover:text-slate-900">Staff Directory</Link></li>
              <li><Link to="/features" className="hover:text-slate-900">Attendance & Shifts</Link></li>
              <li><Link to="/features" className="hover:text-slate-900">Automated Payroll</Link></li>
              <li><Link to="/features" className="hover:text-slate-900">Leave Management</Link></li>
              <li><Link to="/features" className="hover:text-slate-900">Approval Workflows</Link></li>
            </ul>
          </div>

          {/* Column 3: Trust & Governance */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-900 mb-3">Governance</h4>
            <ul className="space-y-2 text-xs text-slate-600">
              <li><Link to="/security" className="hover:text-slate-900">Data Isolation</Link></li>
              <li><Link to="/security" className="hover:text-slate-900">Statutory Tax Compliance</Link></li>
              <li><Link to="/security" className="hover:text-slate-900">Role-Based Access</Link></li>
              <li><Link to="/security" className="hover:text-slate-900">Audit Logs</Link></li>
            </ul>
          </div>

          {/* Column 4: Access */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-900 mb-3">Account</h4>
            <ul className="space-y-2 text-xs text-slate-600">
              <li><Link to="/login" className="hover:text-slate-900">Sign In</Link></li>
              <li><Link to="/register" className="hover:text-slate-900">Register Organization</Link></li>
              <li><Link to="/pricing" className="hover:text-slate-900">Plans & Headcount</Link></li>
              <li><a href="mailto:support@stanforteedge.com" className="hover:text-slate-900">Support</a></li>
            </ul>
          </div>
        </div>
      </footer>
    </div>
  );
}
