import React from "react";
import { Link } from "@/shared/router-adapter";
import { StanforteLogo } from "@/components/brand/StanforteLogo";
import { ChevronDown } from "lucide-react";

interface PublicLayoutProps {
  children: React.ReactNode;
  activePath?: string;
}

export function PublicLayout({ children }: PublicLayoutProps) {
  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans flex flex-col justify-between selection:bg-[#ff6900] selection:text-white">
      {/* Top Navigation Bar */}
      <header className="border-b border-slate-100 bg-white/95 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          {/* Brand Logo */}
          <Link to="/" className="flex items-center gap-2">
            <StanforteLogo variant="light" className="h-9" />
          </Link>

          {/* Nav Links */}
          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-700">
            <div className="flex items-center gap-1 cursor-pointer hover:text-slate-900 transition-colors">
              <span>Product</span>
              <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
            </div>
            <div className="flex items-center gap-1 cursor-pointer hover:text-slate-900 transition-colors">
              <span>Solutions</span>
              <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
            </div>
            <div className="flex items-center gap-1 cursor-pointer hover:text-slate-900 transition-colors">
              <span>Resources</span>
              <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
            </div>
            <Link to="/pricing" className="hover:text-slate-900 transition-colors">
              Pricing
            </Link>
          </nav>

          {/* Header Action Buttons */}
          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="px-5 py-2 text-sm font-semibold text-slate-700 hover:text-slate-900 transition-colors"
            >
              Sign In
            </Link>
            <Link
              to="/register"
              className="px-6 py-2.5 rounded-full text-sm font-semibold bg-[#ff6900] hover:bg-[#ea580c] text-white shadow-md shadow-orange-500/25 transition-all transform hover:-translate-y-0.5"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-grow">{children}</main>

      {/* Minimal Clean Footer */}
      <footer className="border-t border-slate-100 bg-slate-50 py-10 px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-3">
            <StanforteLogo variant="light" className="h-6" />
            <span>&copy; {new Date().getFullYear()} Stanforte Edge Limited. All rights reserved.</span>
          </div>
          <div className="flex items-center gap-6">
            <Link to="/security" className="hover:text-slate-900">Security</Link>
            <Link to="/pricing" className="hover:text-slate-900">Pricing</Link>
            <Link to="/features" className="hover:text-slate-900">Capabilities</Link>
            <Link to="/login" className="hover:text-slate-900">Sign In</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
