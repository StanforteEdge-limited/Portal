import { useState } from "react";
import { AppShell, Button, Icon, PageHeader, SectionCard } from "@/shared";
import { DataTable } from "@/shared/components/ui/DataTable";
import { buildAppNavigation, buildAppMobileNav } from "@/shared/navigation";
import { useAuth } from "@/shared/context/AuthProvider";
import { useCachedQuery, documentApi } from "@/shared/lib/core";
import { getWorkspaceProfile } from "@/shared/api/workspace-api";
import { useNavigate } from "react-router-dom";

export default function PoliciesListPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: profile } = useCachedQuery(
    "hr:profile",
    () => getWorkspaceProfile(),
    { ttlMs: 1000 * 60, storage: "memory" }
  );

  const { data, loading } = useCachedQuery(
    "documents:policies:required",
    () => documentApi.list({ category: "policy" })
  );

  const list = Array.isArray(data?.result) ? data.result : Array.isArray(data) ? data : [];

  const userName = `${user?.first_name || ""} ${user?.last_name || ""}`.trim() || user?.email || "Staff Member";
  const userRole = profile?.employee_profile?.job_title || "Staff Member";

  const totalRequired = list.filter((doc: any) => doc.require_acknowledgement).length;
  const totalSigned = list.filter((doc: any) => doc.require_acknowledgement && doc.acknowledgements?.length > 0).length;

  return (
    <AppShell
      navigation={buildAppNavigation()}
      activeLabel="hr-settings"
      user={{ name: userName, role: userRole }}
      mobileNav={buildAppMobileNav("Dashboard")}
    >
      <PageHeader
        breadcrumbs={[{ label: "My Profile" }, { label: "Policies & Sign-offs" }]}
        title="Policies & Handbooks"
        description="Review and acknowledge required company policies, organizational guidelines, and code of conduct."
      />

      <div className="grid gap-6">
        <div className="bg-gradient-to-r from-primary to-indigo-600 rounded-3xl p-6 text-white flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-lg shadow-primary/10">
          <div>
            <h3 className="text-lg font-bold">Your Policy Compliance Checklist</h3>
            <p className="text-xs text-white/80 mt-1">Make sure to read and acknowledge all required policies to remain compliant.</p>
          </div>
          <div className="flex items-center gap-4 bg-white/10 px-5 py-3 rounded-2xl backdrop-blur-md border border-white/15">
            <div className="text-right">
              <span className="block text-2xl font-bold">{totalSigned} / {totalRequired}</span>
              <span className="block text-[0.65rem] uppercase tracking-wider text-white/70">Policies Acknowledged</span>
            </div>
            <Icon name="check_circle" className="text-3xl text-success" />
          </div>
        </div>

        <SectionCard title="Required Policies">
          {loading && list.length === 0 ? (
            <div className="text-sm text-slate-500 py-6">Loading required policies...</div>
          ) : list.length === 0 ? (
            <div className="text-sm text-slate-500 py-8 text-center bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
              No required policies defined for your scope.
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-100 rounded-lg">
              <DataTable
                columns={[
                  {
                    header: "Policy Name",
                    cell: (doc: any) => <span className="font-semibold text-slate-900">{doc.title}</span>
                  },
                  {
                    header: "Version",
                    cell: (doc: any) => `v${doc.version || "1.0"}`
                  },
                  {
                    header: "Status",
                    cell: (doc: any) => {
                      const ack = Array.isArray(doc.acknowledgements) ? doc.acknowledgements[0] : null;
                      const isSigned = !!ack;
                      return isSigned ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-success/10 text-success">
                          <Icon name="check" className="text-xs" /> Acknowledged
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
                          <Icon name="warning" className="text-xs" /> Pending Signature
                        </span>
                      );
                    }
                  },
                  {
                    header: "Last Updated",
                    cell: (doc: any) => doc.effective_date ? new Date(doc.effective_date).toLocaleDateString() : "-"
                  },
                  {
                    header: "Actions",
                    className: "text-right",
                    cell: (doc: any) => {
                      const ack = Array.isArray(doc.acknowledgements) ? doc.acknowledgements[0] : null;
                      const isSigned = !!ack;
                      return (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => navigate(`/documents/${doc.id}`)}
                        >
                          {isSigned ? "View" : "Sign Off"}
                        </Button>
                      );
                    }
                  }
                ]}
                data={list}
                loading={loading}
              />
            </div>
          )}
        </SectionCard>
      </div>
    </AppShell>
  );
}
