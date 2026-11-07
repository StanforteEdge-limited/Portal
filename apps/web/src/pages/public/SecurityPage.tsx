import { PublicLayout } from "./PublicLayout";
import { Link } from "@/shared/router-adapter";

export default function SecurityPage() {
  return (
    <PublicLayout activePath="/security">
      {/* Header */}
      <section className="pt-20 pb-12 px-6 text-center max-w-4xl mx-auto">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-6">
          Enterprise Trust & Compliance
        </div>
        <h1 className="text-4xl sm:text-6xl font-extrabold text-white tracking-tight leading-tight">
          Bank-Grade Security for Your Enterprise Cloud
        </h1>
        <p className="mt-6 text-lg text-slate-400 max-w-2xl mx-auto">
          We protect mission-critical workforce and financial data with row-level tenant boundaries, cryptographically signed cookies, and comprehensive audit trails.
        </p>
      </section>

      {/* Security Pillars */}
      <section className="px-6 max-w-7xl mx-auto pb-20">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
          <div className="p-8 sm:p-10 rounded-3xl bg-slate-800/40 border border-slate-800">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center mb-6">
              <span className="material-symbols-outlined text-2xl">shield</span>
            </div>
            <h3 className="text-xl font-bold text-white mb-3">Row-Level Tenant Isolation</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Every single table in our PostgreSQL 16 database enforces non-nullable <code className="text-blue-300 font-mono">tenant_id</code> foreign key constraints. The backend context middleware permanently binds every query to the caller's active tenant, making cross-tenant data leaks impossible.
            </p>
          </div>

          <div className="p-8 sm:p-10 rounded-3xl bg-slate-800/40 border border-slate-800">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-6">
              <span className="material-symbols-outlined text-2xl">key</span>
            </div>
            <h3 className="text-xl font-bold text-white mb-3">HttpOnly Cookie Authentication</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Session tokens are never accessible to client-side JavaScript, eliminating Cross-Site Scripting (XSS) token theft risks. Refresh tokens rotate cryptographically on every renewal, accompanied by CSRF protection and strict SameSite cookie policies.
            </p>
          </div>

          <div className="p-8 sm:p-10 rounded-3xl bg-slate-800/40 border border-slate-800">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mb-6">
              <span className="material-symbols-outlined text-2xl">history</span>
            </div>
            <h3 className="text-xl font-bold text-white mb-3">Immutable Audit Trails</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Every payroll authorization, financial ledger entry, role change, and document deletion is logged in an immutable audit ledger with the executing user's ID, timestamp, and IP address.
            </p>
          </div>

          <div className="p-8 sm:p-10 rounded-3xl bg-slate-800/40 border border-slate-800">
            <div className="w-12 h-12 rounded-2xl bg-teal-500/10 text-teal-400 flex items-center justify-center mb-6">
              <span className="material-symbols-outlined text-2xl">lock_person</span>
            </div>
            <h3 className="text-xl font-bold text-white mb-3">Granular Role-Based Access (RBAC)</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Administrators define fine-grained roles with granular capability bits for each domain: reading staff records, authoring pay runs, clearing vouchers, or approving purchase orders.
            </p>
          </div>
        </div>

        {/* Verification Callout */}
        <div className="p-8 sm:p-10 rounded-3xl bg-gradient-to-r from-blue-900/30 via-slate-800/50 to-slate-900 border border-blue-500/30 flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h4 className="text-2xl font-bold text-white">Live Backend Verification</h4>
            <p className="text-sm text-slate-400 mt-1 max-w-xl">
              Our Fastify 5 API is backed by 199 automated unit, integration, and end-to-end tests ensuring data integrity across every deployment.
            </p>
          </div>
          <Link
            to="/register"
            className="px-6 py-3.5 rounded-xl font-bold text-xs bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30 transition-all whitespace-nowrap"
          >
            Launch Secure Workspace
          </Link>
        </div>
      </section>
    </PublicLayout>
  );
}

