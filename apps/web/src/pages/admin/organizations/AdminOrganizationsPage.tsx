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
    <PortalLayout activeNav="Settings">
      <div className="space-y-6">
        {/* Modern Unified Page Header (No Breadcrumbs) */}
        <PageHeader
          title="Legal Entities & Subsidiaries"
          description="Manage parent organizations, joint ventures, and operating branches across your enterprise."
          icon={Building2}
          iconColor="bg-orange-50 text-[#ff6900]"
          actions={
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#ff6900] hover:bg-[#e05d00] text-white text-xs font-bold shadow-sm shadow-orange-500/20 transition active:scale-95"
            >
              <Plus className="h-4 w-4" />
              <span>Register Entity</span>
            </button>
          }
        />

        {/* Toast */}
        {toastMsg && (
          <div
            className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
              toastMsg.tone === "success"
                ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                : "bg-rose-50 text-rose-800 border border-rose-200"
            }`}
          >
            {toastMsg.tone === "success" ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
            )}
            <span>{toastMsg.text}</span>
          </div>
        )}

        {/* 4 Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <div className="text-[11px] font-semibold text-slate-500">Total Entities</div>
              <div className="text-xl font-black text-slate-900 mt-0.5">{orgs.length || 1}</div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <div className="text-[11px] font-semibold text-slate-500">Active Companies</div>
              <div className="text-xl font-black text-emerald-600 mt-0.5">{activeCount || 1}</div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Globe2 className="h-5 w-5" />
            </div>
            <div>
              <div className="text-[11px] font-semibold text-slate-500">Operating Currency</div>
              <div className="text-lg font-black text-slate-900 mt-0.5">NGN (₦) / USD ($)</div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Share2 className="h-5 w-5" />
              </div>
              <div>
                <div className="text-[11px] font-semibold text-slate-500">Multi-Tenant Isolation</div>
                <div className="text-sm font-black text-slate-900 mt-0.5">Enabled</div>
              </div>
            </div>
            <span className="text-[11px] font-bold text-amber-600 bg-amber-50 px-2.5 py-0.5 rounded-full">
              Isolated
            </span>
          </div>
        </div>

        {/* Organizations Table */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Entity Directory</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                All registered branches and legal corporations under this subscription.
              </p>
            </div>
            <span className="text-xs font-semibold text-slate-500">
              {orgs.length} entities
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/75 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-100">
                <tr>
                  <th className="py-3.5 px-5">Organization Name</th>
                  <th className="py-3.5 px-4">Entity Code</th>
                  <th className="py-3.5 px-4">Structure Type</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      Loading organizations...
                    </td>
                  </tr>
                ) : orgs.length > 0 ? (
                  orgs.map((org) => (
                    <tr key={org.id} className="hover:bg-slate-50/60 transition">
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 font-bold flex items-center justify-center shrink-0">
                            {org.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 block">{org.name}</span>
                            {org.description && (
                              <span className="text-[11px] text-slate-400">{org.description}</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-semibold text-slate-600">
                        {org.code || "—"}
                      </td>
                      <td className="py-3.5 px-4 capitalize font-medium text-slate-700">
                        {String(org.organizationType ?? "venture").replace(/_/g, " ")}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-semibold text-[11px] ${
                            org.isActive !== false
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                              : "bg-rose-50 text-rose-700 border border-rose-100"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              org.isActive !== false ? "bg-emerald-500" : "bg-rose-500"
                            }`}
                          />
                          {org.isActive !== false ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="py-3.5 px-5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setEditingOrg(org)}
                            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 transition"
                            title="Edit Entity"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleDelete(org.id, org.name)}
                            className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition"
                            title="Delete Entity"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-10 text-center">
                      <div className="w-12 h-12 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center mx-auto mb-2">
                        <Building2 className="h-6 w-6" />
                      </div>
                      <p className="font-semibold text-slate-700 text-sm">No organizations registered</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Add corporate entities to begin multi-organization administration.
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
