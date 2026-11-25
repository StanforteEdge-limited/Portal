import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { PortalLayout } from "@/components/layout/PortalLayout";
import { PageHeader } from "@/shared";
import { useAuth } from "@/shared/context/AuthProvider";
import { httpRequest } from "@/shared/lib/core";
import { AdminOrganizationSlideOver } from "./AdminOrganizationSlideOver";
import {
  Building2,
  Plus,
  Pencil,
  Trash2,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Globe2,
  Briefcase,
  Share2,
} from "lucide-react";

export default function AdminOrganizationsPage() {
  const { user } = useAuth();
  const [orgs, setOrgs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [editingOrg, setEditingOrg] = useState<any | null>(null);
  const [toastMsg, setToastMsg] = useState<{ text: string; tone: "success" | "error" } | null>(null);

  function notify(text: string, tone: "success" | "error" = "success") {
    setToastMsg({ text, tone });
    setTimeout(() => setToastMsg(null), 4000);
  }

  const fetchOrgs = async () => {
    setLoading(true);
    try {
      const res = await httpRequest<any>("/organizations");
      const list = res?.data?.items ?? [];
      setOrgs(list);
    } catch {
      notify("Failed to load organizations.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchOrgs();
  }, []);

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete "${name}"?`)) return;
    try {
      await httpRequest(`/organizations/${id}`, { method: "DELETE" });
      notify("Organization deleted successfully.");
      void fetchOrgs();
    } catch {
      notify("Failed to delete organization.", "error");
    }
  };

  const activeCount = orgs.filter((o) => o.isActive !== false).length;

  return (
    <PortalLayout activeNav="Legal">
      <div className="space-y-6 max-w-[1440px] mx-auto pb-12">
        <PageHeader
          title="Legal entities and subsidiaries"
          description="Manage parent organizations, joint ventures, and operating branches across your enterprise"
          actions={
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-[#ff6900] hover:bg-[#ea580c] text-white text-sm font-medium transition-colors duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6900]/30"
            >
              <Plus className="h-4 w-4" strokeWidth={1.5} />
              <span>Register entity</span>
            </button>
          }
        />

        {/* Toast */}
        {toastMsg && (
          <div
            className={`px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-2.5 border ${
              toastMsg.tone === "success"
                ? "bg-emerald-50 text-emerald-800 border-emerald-600/15"
                : "bg-rose-50 text-rose-800 border-rose-600/15"
            }`}
          >
            {toastMsg.tone === "success" ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" strokeWidth={1.5} />
            ) : (
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" strokeWidth={1.5} />
            )}
            <span>{toastMsg.text}</span>
          </div>
        )}

        {/* 4 Compact Numbers-Only KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
          <article className="p-3.5 sm:p-5 rounded-xl sm:rounded-2xl bg-white border border-neutral-900/[0.08] shadow-xs flex flex-col justify-between gap-1 sm:space-y-2">
            <p className="text-[11px] sm:text-xs text-neutral-500 truncate">Total entities</p>
            <p className="text-xl sm:text-[28px] leading-tight sm:leading-none font-medium text-neutral-900 font-headline tabular-nums">
              {orgs.length.toLocaleString()}
            </p>
            <p className="text-[10px] sm:text-xs text-neutral-400 truncate hidden sm:block">Registered structures</p>
          </article>

          <article className="p-3.5 sm:p-5 rounded-xl sm:rounded-2xl bg-white border border-neutral-900/[0.08] shadow-xs flex flex-col justify-between gap-1 sm:space-y-2">
            <p className="text-[11px] sm:text-xs text-neutral-500 truncate">Active companies</p>
            <p className="text-xl sm:text-[28px] leading-tight sm:leading-none font-medium text-neutral-900 font-headline tabular-nums">
              {activeCount.toLocaleString()}
            </p>
            <p className="text-[10px] sm:text-xs text-neutral-400 truncate hidden sm:block">Operating subsidiaries</p>
          </article>

          <article className="p-3.5 sm:p-5 rounded-xl sm:rounded-2xl bg-white border border-neutral-900/[0.08] shadow-xs flex flex-col justify-between gap-1 sm:space-y-2">
            <p className="text-[11px] sm:text-xs text-neutral-500 truncate">Inactive entities</p>
            <p className="text-xl sm:text-[28px] leading-tight sm:leading-none font-medium text-neutral-900 font-headline tabular-nums">
              {Math.max(0, orgs.length - activeCount).toLocaleString()}
            </p>
            <p className="text-[10px] sm:text-xs text-neutral-400 truncate hidden sm:block">Dormant or archived</p>
          </article>

          <article className="p-3.5 sm:p-5 rounded-xl sm:rounded-2xl bg-white border border-neutral-900/[0.08] shadow-xs flex flex-col justify-between gap-1 sm:space-y-2">
            <p className="text-[11px] sm:text-xs text-neutral-500 truncate">Tenant isolation</p>
            <p className="text-xl sm:text-[28px] leading-tight sm:leading-none font-medium text-neutral-900 font-headline">
              Enabled
            </p>
            <p className="text-[10px] sm:text-xs text-neutral-400 truncate hidden sm:block">Scoped boundaries</p>
          </article>
        </div>

        {/* Organizations Table */}
        <div className="bg-white rounded-2xl border border-neutral-900/[0.08] shadow-xs overflow-hidden">
          <div className="px-5 py-4 border-b border-neutral-900/[0.08] flex items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-medium text-neutral-900 font-headline">Entity directory</h2>
              <p className="text-xs text-neutral-500 mt-0.5">
                Registered branches and legal corporations under this workspace
              </p>
            </div>
            <span className="text-xs font-mono text-neutral-500 tabular-nums shrink-0">
              {orgs.length} entities
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-neutral-50/80 border-b border-neutral-900/[0.08]">
                  <th className="py-3 px-5 text-xs font-medium text-neutral-500">Organization</th>
                  <th className="py-3 px-5 text-xs font-medium text-neutral-500">Entity code</th>
                  <th className="py-3 px-5 text-xs font-medium text-neutral-500">Structure type</th>
                  <th className="py-3 px-5 text-xs font-medium text-neutral-500">Status</th>
                  <th className="py-3 px-5 text-right text-xs font-medium text-neutral-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-900/[0.06] text-sm text-neutral-700">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-sm text-neutral-500">
                      Loading organizations
                    </td>
                  </tr>
                ) : orgs.length > 0 ? (
                  orgs.map((org) => (
                    <tr key={org.id} className="hover:bg-neutral-50 focus-within:bg-neutral-50/80 transition-colors duration-150">
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-neutral-100 border border-neutral-900/[0.06] text-neutral-700 font-medium text-xs flex items-center justify-center shrink-0">
                            {org.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <span className="font-medium text-neutral-900 block truncate">{org.name}</span>
                            {org.description && (
                              <span className="text-xs text-neutral-500 block truncate">{org.description}</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-5">
                        <code className="text-xs bg-neutral-100 border border-neutral-900/[0.06] px-2 py-0.5 rounded-md font-mono text-neutral-700">
                          {org.code || "—"}
                        </code>
                      </td>
                      <td className="py-3.5 px-5 capitalize text-sm text-neutral-600">
                        {String(org.organizationType ?? "venture").replace(/_/g, " ")}
                      </td>
                      <td className="py-3.5 px-5">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md font-medium text-xs border ${
                            org.isActive !== false
                              ? "bg-emerald-50 text-emerald-700 border-emerald-600/15"
                              : "bg-rose-50 text-rose-700 border-rose-600/15"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              org.isActive !== false ? "bg-emerald-600" : "bg-rose-600"
                            }`}
                          />
                          {org.isActive !== false ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="py-3.5 px-5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => setEditingOrg(org)}
                            className="h-8 w-8 inline-flex items-center justify-center rounded-lg hover:bg-neutral-100 text-neutral-500 hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6900]/30 transition-colors duration-150"
                            title="Edit entity"
                          >
                            <Pencil className="h-4 w-4" strokeWidth={1.5} />
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleDelete(org.id, org.name)}
                            className="h-8 w-8 inline-flex items-center justify-center rounded-lg hover:bg-rose-50 text-neutral-400 hover:text-rose-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6900]/30 transition-colors duration-150"
                            title="Delete entity"
                          >
                            <Trash2 className="h-4 w-4" strokeWidth={1.5} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-14 text-center">
                      <Building2 className="h-6 w-6 text-neutral-400 mx-auto mb-2" strokeWidth={1.5} />
                      <p className="font-medium text-neutral-900 text-sm">No organizations registered</p>
                      <p className="text-xs text-neutral-500 mt-1">
                        Add corporate entities to begin multi-organization administration
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showCreate && (
        <AdminOrganizationSlideOver
          onClose={() => setShowCreate(false)}
          onSaved={() => {
            setShowCreate(false);
            void fetchOrgs();
          }}
        />
      )}

      {editingOrg && (
        <AdminOrganizationSlideOver
          org={editingOrg}
          onClose={() => setEditingOrg(null)}
          onSaved={() => {
            setEditingOrg(null);
            void fetchOrgs();
          }}
        />
      )}
    </PortalLayout>
  );
}
