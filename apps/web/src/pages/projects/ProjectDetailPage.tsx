import { useMemo, useState } from "react";
import { Button, PageHeader, SectionCard, StatCard } from "@/shared";
import { formatDate } from "@stanforte/shared";
import { AppShell } from "@/shared/components/layout/AppShell";
import { useAuth } from "@/shared/context/AuthProvider";
import { useCachedQuery } from "@/shared/lib/core";
import { buildAppNavigation, buildAppMobileNav } from "@/shared/navigation";
import { getWorkspaceProfile } from "@/shared/api/workspace-api";
import { resourceApi } from "@/shared/lib/core";
import { useParams } from "react-router";
import BudgetWorkspace from "@/features/budgets/BudgetWorkspace";

const tabBtn = (active: boolean): React.CSSProperties => ({
  padding: "8px 16px",
  fontSize: "13px",
  fontWeight: 600,
  border: "none",
  background: "none",
  cursor: "pointer",
  borderBottom: active ? "2px solid #2563eb" : "2px solid transparent",
  color: active ? "#2563eb" : "#64748b",
});

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { data: profile } = useCachedQuery(
    "user:profile",
    () => getWorkspaceProfile(),
    { ttlMs: 1000 * 60, storage: "memory" },
  );

  const { data: project, loading } = useCachedQuery(
    `project:detail:${id}`,
    () => id ? resourceApi.getProject(id) : Promise.resolve(null),
    { ttlMs: 1000 * 60 * 5, storage: "memory" },
  );

  const userName =
    `${user?.first_name || ""} ${user?.last_name || ""}`.trim() ||
    user?.email ||
    "User";
  const [activeTab, setActiveTab] = useState("overview");

  const profileProjectIds = useMemo(
    () => new Set((profile?.projects ?? []).map((item: any) => String(item.id))),
    [profile],
  );
  const canSeeInternalProjectTabs = useMemo(
    () => Boolean(
      (project as any)?.isMember ||
      (project as any)?.isLead ||
      (project as any)?.can_manage ||
      (project as any)?.can_view_internal ||
      (project && profileProjectIds.has(String(project.id))),
    ),
    [profileProjectIds, project],
  );

  if (loading) {
    return (
        <AppShell
          navigation={buildAppNavigation()}
          activeLabel="workspace-projects"
          user={{ name: userName, role: profile?.employee_profile?.job_title || "Staff" }}
          mobileNav={buildAppMobileNav("Workspace")}
        >
        <div className="flex items-center justify-center h-64">
          <p className="text-slate-500">Loading project...</p>
        </div>
      </AppShell>
    );
  }

  if (!project) {
    return (
        <AppShell
          navigation={buildAppNavigation()}
          activeLabel="workspace-projects"
          user={{ name: userName, role: profile?.employee_profile?.job_title || "Staff" }}
          mobileNav={buildAppMobileNav("Workspace")}
        >
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <p className="text-slate-500">Project not found.</p>
          <Button variant="secondary" onClick={() => window.location.href = "/projects"}>
            Back to Projects
          </Button>
        </div>
      </AppShell>
    );
  }

  const status = project.governance?.governance_status || (project.isActive ? "active" : "archived");
  const tabs = [
    "overview",
    "activities",
    ...(canSeeInternalProjectTabs ? ["tasks", "members", "requests", "budgets", "funds", "partners", "donors"] : []),
  ];

  return (
    <AppShell
      navigation={buildAppNavigation()}
      activeLabel="workspace-projects"
      user={{
        name: userName,
        role: profile?.employee_profile?.job_title || "Staff",
      }}
      mobileNav={buildAppMobileNav("Workspace")}
    >
      <PageHeader
        breadcrumbs={[
          { label: "Workspace" },
          { label: "Projects", path: "/projects" },
          { label: project.name },
        ]}
        title={project.name}
        description={project.governance?.project_code || `Project ID: ${project.id}`}
      />

      <div className="space-y-6">
        <div style={{ display: "flex", gap: "4px", borderBottom: "1px solid #e2e8f0", marginBottom: "16px", flexWrap: "wrap" }}>
          {tabs.map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={tabBtn(activeTab === tab)}>
              {tab === "funds" ? "Funds / Spend" : tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Status & Quick Info */}
        {activeTab === "overview" ? <div className="grid gap-4 md:grid-cols-4">
          <StatCard label="Status" value={status.replace("_", " ")} tone={status === "active" ? "success" : "neutral"} />
          <StatCard label="Start Date" value={formatDate(project.governance?.start_date) || "TBD"} tone="neutral" />
          <StatCard label="End Date" value={formatDate(project.governance?.end_date) || "TBD"} tone="neutral" />
          <StatCard label="Owner" value={project.governance?.owner_user_id ? "Assigned" : "Unassigned"} tone="neutral" />
        </div> : null}

        {/* Description */}
        {activeTab === "overview" && project.description && (
          <SectionCard title="Description">
            <p className="text-slate-600">{project.description}</p>
          </SectionCard>
        )}

        {activeTab === "activities" ? <SectionCard
          title="Activities"
          description="Project updates and recent visible activity."
        >
          <div className="text-slate-500 text-sm py-4 text-center">
            No recent activity recorded.
          </div>
        </SectionCard> : null}

        {activeTab === "tasks" ? <SectionCard title="Tasks" description="Project tasks and delivery execution.">
          <div className="text-slate-500 text-sm py-4 text-center">Project tasks workspace coming soon.</div>
        </SectionCard> : null}

        {activeTab === "members" ? <SectionCard title="Members" description="Project team and responsibilities.">
          <div className="text-slate-500 text-sm py-4 text-center">Project members will appear here once configured.</div>
        </SectionCard> : null}

        {activeTab === "requests" ? <SectionCard title="Requests" description="Requests connected to this project.">
          <div className="text-slate-500 text-sm py-4 text-center">Project-related requests will appear here.</div>
        </SectionCard> : null}

        {activeTab === "budgets" ? <SectionCard title="Budgets" description="Project-scoped budgets, revisions, and submissions.">
          <BudgetWorkspace context={{ scopeType: "project", scopeId: id, mode: "owner" }} layout="embedded" />
        </SectionCard> : null}

        {activeTab === "funds" ? <SectionCard title="Funds / Spend" description="Funds, allocations, and spend visibility for this project.">
          <div className="text-slate-500 text-sm py-4 text-center">Project fund and spend view coming soon.</div>
        </SectionCard> : null}

        {activeTab === "partners" ? <SectionCard title="Partners" description="Organizations and implementation partners linked to this project.">
          <div className="text-slate-500 text-sm py-4 text-center">Project partners will appear here.</div>
        </SectionCard> : null}

        {activeTab === "donors" ? <SectionCard title="Donors" description="Donors and funding stakeholders linked to this project.">
          <div className="text-slate-500 text-sm py-4 text-center">Project donors will appear here.</div>
        </SectionCard> : null}
      </div>
    </AppShell>
  );
}
