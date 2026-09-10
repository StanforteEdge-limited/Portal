import { useState } from "react";
import { useParams } from "react-router-dom";
import { AppShell, PageHeader, SectionCard } from "@/shared";
import { useAuth } from "@/shared/context/AuthProvider";
import { useCachedQuery } from "@/shared/lib/core";
import { buildAppNavigation, buildAppMobileNav } from "@/shared/navigation";
import { getWorkspaceProfile } from "@/shared/api/workspace-api";
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

export default function TeamDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const userName =
    `${user?.first_name || ""} ${user?.last_name || ""}`.trim() ||
    user?.email ||
    "Staff";

  const [activeTab, setActiveTab] = useState("overview");
  const [budgetCreateAttempt, setBudgetCreateAttempt] = useState(0);

  const { data: profile } = useCachedQuery(
    "user:profile",
    () => getWorkspaceProfile(),
    { ttlMs: 60_000, storage: "memory" },
  );

  const allTeams = profile?.teams ?? profile?.groups ?? [];
  const team: Record<string, unknown> | undefined = allTeams.find((t: any) => t.id === id);
  const groupName = String(team?.name ?? "Group");
  const groupType = String(team?.type ?? "other").toLowerCase();
  const role = String(team?.role ?? "member").toLowerCase();
  const orgId = String(team?.organization_id ?? "");
  const canSeeAllRequests = ["lead", "moderator", "manager", "admin"].includes(role);
  const canWorkBudgets = groupType === "department" && canSeeAllRequests;
  const availableTabs = [
    "overview",
    "tasks",
    "members",
    "requests",
    ...(canWorkBudgets ? ["budgets"] : []),
    "projects",
  ];

  return (
    <AppShell
      navigation={buildAppNavigation()}
      activeLabel="workspace-groups"
      user={{ name: userName, role: profile?.employee_profile?.job_title || "Staff" }}
      mobileNav={buildAppMobileNav("Workspace")}
    >
      <PageHeader
        breadcrumbs={[
          { label: "Workspace" },
          { label: "Groups", path: "/teams" },
          { label: groupName },
        ]}
        title={groupName}
        description={team?.type ? `Type: ${team.type}` : "Group details"}
      />

      <div style={{ display: "flex", gap: "4px", borderBottom: "1px solid #e2e8f0", marginBottom: "16px" }}>
        {availableTabs.map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={tabBtn(activeTab === tab)}>
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {activeTab === "overview" && (
        <SectionCard title="Overview" description="Team information and quick stats.">
          <div style={{ padding: "12px 0", color: "#64748b", fontSize: "14px" }}>
            <p><strong>Name:</strong> {groupName}</p>
            <p><strong>Type:</strong> {String(team?.type ?? "Unspecified")}</p>
            <p><strong>Role:</strong> {String(team?.role ?? "Member")}</p>
            {team?.is_primary ? <p><strong>Primary Group</strong></p> : null}
          </div>
        </SectionCard>
      )}

      {activeTab === "tasks" && (
        <SectionCard title="Tasks" description="Shared tasks for this group will appear here.">
          <div style={{ textAlign: "center", padding: "24px", color: "#94a3b8", fontSize: "14px" }}>
            Group tasks workspace coming soon.
          </div>
        </SectionCard>
      )}

      {activeTab === "members" && (
        <SectionCard title="Members" description="Group members will appear here.">
          <div style={{ textAlign: "center", padding: "24px", color: "#94a3b8", fontSize: "14px" }}>
            Group member list coming soon.
          </div>
        </SectionCard>
      )}

      {activeTab === "requests" && (
        <SectionCard
          title="Requests"
          description={canSeeAllRequests ? "All requests for this group will appear here." : "Your requests for this group will appear here."}
          action={canSeeAllRequests ? (
            <a
              href={`/requests/new?team_id=${id}${orgId ? `&organization_id=${orgId}` : ''}`}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-900/10"
            >
              Create Request
            </a>
          ) : undefined}
        >
          <div style={{ textAlign: "center", padding: "24px", color: "#94a3b8", fontSize: "14px" }}>
            {canSeeAllRequests ? "Create a group-scoped request for this team." : "Your group-scoped requests will appear here."}
          </div>
        </SectionCard>
      )}

      {activeTab === "budgets" && (
        <SectionCard title="Budgets" description="Group-scoped budgets, revisions, and submissions.">
          <div style={{ marginBottom: "12px", textAlign: "right" }}>
            <button
              onClick={() => setBudgetCreateAttempt((c) => c + 1)}
              style={{
                padding: "6px 14px",
                fontSize: "13px",
                fontWeight: 600,
                borderRadius: "999px",
                border: "1px solid #cbd5e1",
                background: "#fff",
                color: "#334155",
                cursor: "pointer",
              }}
            >
              Create Budget
            </button>
          </div>
          <BudgetWorkspace context={{ scopeType: "team", scopeId: id, mode: "owner" }} layout="embedded" createAttempt={budgetCreateAttempt} showInlineCreateButton={false} />
        </SectionCard>
      )}

      {activeTab === "projects" && (
        <SectionCard
          title="Projects"
          description="Projects related to this group will appear here."
          action={canSeeAllRequests ? (
            <a
              href={`/admin/projects?create=1${orgId ? `&organization_id=${orgId}` : ''}`}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-900/10"
            >
              Create Project
            </a>
          ) : undefined}
        >
          <div style={{ textAlign: "center", padding: "24px", color: "#94a3b8", fontSize: "14px" }}>
            {canSeeAllRequests ? "Create a project tied to this group." : "Linked projects will appear here."}
          </div>
        </SectionCard>
      )}
    </AppShell>
  );
}
