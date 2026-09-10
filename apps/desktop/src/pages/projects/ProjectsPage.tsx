import { useState } from "react";
import {
  Button,
  Chip,
  Icon,
  PageHeader,
  SectionCard,
  StatCard,
} from "@/shared";
import { DataTable } from "@/shared/components/ui/DataTable";
import { AppShell } from "@/shared/components/layout/AppShell";
import { formatDate } from "@stanforte/shared";
import { useAuth } from "@/shared/context/AuthProvider";
import { useCachedQuery } from "@/shared/lib/core";
import { buildAppNavigation, buildAppMobileNav } from "@/shared/navigation";
import { getWorkspaceProfile } from "@/shared/api/workspace-api";
import { resourceApi } from "@/shared/lib/core";

export default function ProjectsPage() {
  const { user } = useAuth();

  const { data: profile } = useCachedQuery(
    "user:profile",
    () => getWorkspaceProfile(),
    { ttlMs: 1000 * 60, storage: "memory" },
  );

  const [listKey, setListKey] = useState(0);

  const { data: projectsData, loading: projectsLoading, refetch: refetchProjects } = useCachedQuery(
    `user:projects:${listKey}`,
    () => resourceApi.listProjects({ active_only: true }),
    { ttlMs: 1000 * 60, storage: "memory" },
  );

  const projects = Array.isArray(projectsData) ? projectsData : [];
  const userName =
    `${user?.first_name || ""} ${user?.last_name || ""}`.trim() ||
    user?.email ||
    "User";

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
        breadcrumbs={[{ label: "Workspace" }, { label: "Projects" }]}
        title="Projects"
        description="Discover projects across the organization and open the ones relevant to your work."
      />

      <div className="space-y-6">
        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <StatCard
            label="Active Projects"
            value={String(projects.length)}
            tone="neutral"
          />
          <StatCard
            label="As Owner"
            value="0"
            tone="success"
          />
          <StatCard
            label="As Member"
            value="0"
            tone="neutral"
          />
        </div>

        {/* Projects List */}
          <SectionCard
          title="All Projects"
          description="Browse project workspaces across the organization."
        >
          {projectsLoading ? (
            <div className="rounded-2xl bg-slate-50 px-4 py-6 text-sm text-slate-500">
              Loading projects...
            </div>
          ) : (
            <div className="overflow-x-auto rounded-[22px] border border-slate-200 bg-white">
              <DataTable
                columns={[
                  {
                    header: "Project",
                    cell: (project: any) => (
                      <span className="font-semibold text-slate-900">{project.name}</span>
                    ),
                    className: "rounded-l-2xl"
                  },
                  {
                    header: "Code",
                    cell: (project: any) => (
                      <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">
                        {project.governance?.project_code || "-"}
                      </code>
                    )
                  },
                  {
                    header: "Status",
                    cell: (project: any) => {
                      const status = project.governance?.governance_status || (project.isActive ? "active" : "archived");
                      return (
                        <Chip variant={status === "active" ? "success" : status === "archived" ? "neutral" : "warning"}>
                          {status.replace("_", " ")}
                        </Chip>
                      );
                    }
                  },
                  {
                    header: "Start Date",
                    cell: (project: any) => formatDate(project.governance?.start_date) || "-"
                  },
                  {
                    header: "End Date",
                    cell: (project: any) => formatDate(project.governance?.end_date) || "-"
                  },
                  {
                    header: "Actions",
                    className: "rounded-r-2xl text-right",
                    cell: (project: any) => (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          window.location.href = `/projects/${project.id}`;
                        }}
                      >
                        <Icon name="visibility" />
                      </Button>
                    )
                  }
                ]}
                data={projects}
              />
            </div>
          )}
        </SectionCard>
      </div>
    </AppShell>
  );
}
