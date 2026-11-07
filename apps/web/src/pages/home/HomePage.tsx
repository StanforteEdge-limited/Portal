import { Link } from "@/shared/router-adapter";
import { PublicLayout } from "@/pages/public/PublicLayout";
import {
  Users,
  Clock,
  CreditCard,
  Building2,
  FileCheck,
  ArrowRight,
  Play,
  TrendingUp,
  Check,
} from "lucide-react";

export default function HomePage() {
  return (
    <PublicLayout activePath="/">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-16 lg:pt-16 lg:pb-24 px-6 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Column: Copy & Actions */}
          <div className="lg:col-span-7 space-y-8">
            <h1 className="text-4xl sm:text-5xl lg:text-[3.75rem] font-black tracking-tight text-slate-900 leading-[1.12] font-headline">
              Run Your Business <br />
              Smarter with <br />
              <span className="text-[#ff6900]">Stanforte Edge</span>
            </h1>

            <p className="text-base sm:text-lg text-slate-600 max-w-xl leading-relaxed">
              An integrated multi-tenant enterprise OS for HR, Payroll, Attendance, Finance and Approvals. Built for growing organizations.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Link
                to="/register"
                className="px-8 py-3.5 rounded-full font-bold text-sm bg-[#ff6900] hover:bg-[#ea580c] text-white shadow-lg shadow-orange-500/25 transition-all transform hover:-translate-y-0.5 flex items-center gap-2"
              >
                Start Free Trial
                <ArrowRight className="h-4 w-4" />
              </Link>
              <button
                type="button"
                className="px-7 py-3.5 rounded-full font-semibold text-sm border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 transition-all flex items-center gap-2.5 shadow-sm"
              >
                <div className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center">
                  <Play className="h-2.5 w-2.5 fill-white ml-0.5" />
                </div>
                Watch Demo
              </button>
            </div>

            {/* 5 Feature Module Pills Row */}
            <div className="pt-6">
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 max-w-2xl">
                <div className="flex flex-col items-center justify-center p-3 rounded-xl border border-slate-200 bg-white shadow-sm text-center">
                  <Users className="h-4 w-4 text-slate-700 mb-1.5" />
                  <span className="text-[11px] font-semibold text-slate-800 leading-tight">HR & Workforce</span>
                </div>
                <div className="flex flex-col items-center justify-center p-3 rounded-xl border border-slate-200 bg-white shadow-sm text-center">
                  <Clock className="h-4 w-4 text-slate-700 mb-1.5" />
                  <span className="text-[11px] font-semibold text-slate-800 leading-tight">Time & Attendance</span>
                </div>
                <div className="flex flex-col items-center justify-center p-3 rounded-xl border border-slate-200 bg-white shadow-sm text-center">
                  <CreditCard className="h-4 w-4 text-slate-700 mb-1.5" />
                  <span className="text-[11px] font-semibold text-slate-800 leading-tight">Payroll & Compliance</span>
                </div>
                <div className="flex flex-col items-center justify-center p-3 rounded-xl border border-slate-200 bg-white shadow-sm text-center">
                  <Building2 className="h-4 w-4 text-slate-700 mb-1.5" />
                  <span className="text-[11px] font-semibold text-slate-800 leading-tight">Finance & Procurement</span>
                </div>
                <div className="flex flex-col items-center justify-center p-3 rounded-xl border border-slate-200 bg-white shadow-sm text-center col-span-2 sm:col-span-1">
                  <FileCheck className="h-4 w-4 text-slate-700 mb-1.5" />
                  <span className="text-[11px] font-semibold text-slate-800 leading-tight">Approval Workflows</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Hero Visual with Woman & Floating Cards */}
          <div className="lg:col-span-5 relative flex justify-center lg:justify-end">
            {/* Orange Curved Graphic Backdrop */}
            <div className="absolute top-1/2 -translate-y-1/2 right-4 w-[340px] sm:w-[420px] h-[340px] sm:h-[420px] bg-gradient-to-tr from-[#ff6900] via-[#ff8800] to-[#ffa500] rounded-full -z-0 opacity-90 blur-0" />

            {/* Hero Photo Container */}
            <div className="relative z-10 w-[310px] sm:w-[380px] h-[400px] sm:h-[480px] rounded-3xl overflow-hidden shadow-2xl border-4 border-white bg-slate-100">
              <img
                src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=800&q=80"
                alt="Executive using Stanforte Edge"
                className="w-full h-full object-cover object-top"
              />
            </div>

            {/* Floating Metric Card 1: Total Employees */}
            <div className="absolute -top-3 left-0 sm:left-4 z-20 bg-white/95 backdrop-blur-md border border-slate-100 rounded-2xl p-3.5 shadow-xl flex items-center gap-3 animate-fade-in">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Total Employees</div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-base font-extrabold text-slate-900">1,240</span>
                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                    <TrendingUp className="h-2.5 w-2.5" /> 12%
                  </span>
                </div>
              </div>
            </div>

            {/* Floating Metric Card 2: On Time Today */}
            <div className="absolute top-1/2 -translate-y-1/2 -left-4 sm:left-0 z-20 bg-white/95 backdrop-blur-md border border-slate-100 rounded-2xl p-3.5 shadow-xl flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">On Time Today</div>
                <div className="text-base font-extrabold text-slate-900 mt-0.5">96%</div>
              </div>
            </div>

            {/* Floating Metric Card 3: Payroll Ready */}
            <div className="absolute bottom-6 left-2 sm:left-8 z-20 bg-white/95 backdrop-blur-md border border-slate-100 rounded-2xl p-3.5 shadow-xl flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Check className="h-5 w-5 stroke-[3]" />
              </div>
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Payroll Ready</div>
                <div className="text-xs font-bold text-emerald-600 mt-0.5 flex items-center gap-1">
                  &check; Done
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Social Proof / Trusted By Bar */}
        <div className="mt-20 pt-8 border-t border-slate-100">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
            <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">
              &mdash; Trusted by forward thinking organizations
            </span>
            <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-12 opacity-70 grayscale hover:grayscale-0 transition-all">
              <span className="font-extrabold text-sm sm:text-base tracking-tight text-slate-700">AccessBank</span>
              <span className="font-black text-sm sm:text-base tracking-widest text-slate-700">DANGOTE</span>
              <span className="font-black text-sm sm:text-base tracking-tighter text-red-600">UBA&#9650;</span>
              <span className="font-extrabold text-sm sm:text-base text-slate-700">Nestle</span>
              <div className="w-10 h-6 rounded-full bg-yellow-400 text-slate-950 font-black text-xs flex items-center justify-center">
                MTN
              </div>
            </div>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
