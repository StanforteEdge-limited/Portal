import { useState } from "react";
import {
  Button,
  Chip,
  Icon,
  SelectField,
  PageHeader,
  SectionCard,
  StatCard,
  DataTable,
} from "@/shared";
import { AppShell } from "@/shared/components/layout/AppShell";
import { useAuth } from "@/shared/context/AuthProvider";
import { useCachedQuery } from "@/shared/lib/core";
import { buildAppNavigation, buildAppMobileNav } from "@/shared/navigation";
import { getWorkspaceProfile } from "@/shared/api/workspace-api";
import { resourceApi } from "@/shared/lib/core";
import type { TeamOption } from "@stanforte/shared";
import AdminGroupSlideOver from "./AdminGroupSlideOver";
import AdminGroupTypeSlideOver from "./AdminGroupTypeSlideOver";

type ActiveTab = "groups" | "types";

const DEFAULT_TYPES = [
  {
    id: "team",
    name: "Team",
    slug: "team",
    description: "Standard working team",
  },
  {
    id: "department",
    name: "Department",
    slug: "department",
    description: "Organizational department",
  },
];

export default function AdminGroupsPage() {
  const { user } = useAuth();

  const { data: profile } = useCachedQuery(
    "admin:profile",
    () => getWorkspaceProfile(),
    { ttlMs: 1000 * 60, storage: "memory" },
  );

  const [activeTab, setActiveTab] = useState<ActiveTab>("groups");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [listKey, setListKey] = useState(0);
  const [showCreate, setShowCreate] = useState(false);
  const [editingGroup, setEditingGroup] = useState<TeamOption | null>(null);

  const [groupTypes, setGroupTypes] = useState(DEFAULT_TYPES);
  const [editingType, setEditingType] = useState<{
    id: string;
    name: string;
    slug: string;
    description: string;
  } | null>(null);

  const {
    data: groupsData,
    loading: groupsLoading,
    refetch: refetchGroups,
  } = useCachedQuery(
    `admin:groups:${listKey}:${search}:${typeFilter}:${statusFilter}`,
    () => resourceApi.listGroups(),
    { ttlMs: 0, storage: "memory" },
  );

  const teams: TeamOption[] = Array.isArray((groupsData as any)?.data?.items) 
    ? (groupsData as any).data.items 
    : Array.isArray(groupsData) ? groupsData : [];
  const activeGroups = teams.filter((g) => g.isActive).length;
  const inactiveGroups = teams.length - activeGroups;

  const userName =
    `${user?.first_name || ""} ${user?.last_name || ""}`.trim() ||
    user?.email ||
    "Admin";

  const filteredGroups = teams.filter((g) => {
    if (typeFilter !== "all" && g.groupType !== typeFilter) return false;
    if (statusFilter === "active" && !g.isActive) return false;
    if (statusFilter === "inactive" && g.isActive) return false;
    if (search) {
      const s = search.toLowerCase();
      if (!g.name.toLowerCase().includes(s)) return false;
    }
    return true;
  });

  return (
    <AppShell
      navigation={buildAppNavigation()}
      activeLabel="admin-groups"
      user={{
        name: userName,
        role: profile?.employee_profile?.job_title || "Admin",
      }}
      mobileNav={buildAppMobileNav("Dashboard")}
    >
      <PageHeader
        breadcrumbs={[
          { label: "Administration", path: "/admin/users" },
          { label: "Groups" },
        ]}
        title="Groups"
        description="Manage typed groups, their organization coverage, and member responsibilities."
      />

      <div className="space-y-6">
        {/* Tabs */}
        <nav className="flex items-center gap-3 border-b border-slate-200 pb-3 text-sm font-semibold text-slate-500">
          {[
            { key: "groups" as ActiveTab, label: "Groups" },
            { key: "types" as ActiveTab, label: "Types" },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={[
                "rounded-full px-4 py-2 transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-900/10",
                activeTab === tab.key
                  ? "bg-brand-900 text-white"
                  : "bg-slate-100 text-slate-600 hover:text-slate-900",
              ].join(" ")}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        {activeTab === "groups" && (
          <>
            {/* Stats */}
            <div className="grid gap-4 md:grid-cols-3">
              <StatCard
                label="Total Groups"
                value={String(teams.length)}
                tone="neutral"
              />
              <StatCard
                label="Active"
                value={String(activeGroups)}
                tone="success"
              />
              <StatCard
                label="Inactive"
                value={String(inactiveGroups)}
                tone="neutral"
              />
            </div>

            {/* Filters */}
            <section className="section-card p-4 sm:p-5">
              <div className="flex flex-wrap items-start gap-3">
                <SelectField
                  label="Type"
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="min-w-[130px] flex-1 lg:flex-none"
                >
                  <option value="all">All Types</option>
                  {groupTypes.map((t) => (
                    <option key={t.id} value={t.slug}>
                      {t.name}
                    </option>
                  ))}
                </SelectField>
                <SelectField
                  label="Status"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="min-w-[130px] flex-1 lg:flex-none"
                >
                  <option value="all">All Statuses</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </SelectField>
                <label className="grid gap-1.5 text-sm">
                  <span className="font-semibold text-slate-700">Search</span>
                  <input
                    type="search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search groups..."
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-[0.6rem] text-sm font-semibold text-slate-700 focus:outline-none focus:ring-4 focus:ring-brand-900/10"
                  />
                </label>
                <div className="flex items-end">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => void refetchGroups()}
                  >
                    <Icon name="refresh" className="text-[16px]" />
                    Refresh
                  </Button>
                </div>
              </div>
            </section>

            {/* Table */}
            <SectionCard
              title="All Groups"
              description="Manage your typed groups."
              action={
                <Button className="gap-2" onClick={() => setShowCreate(true)}>
                  <Icon name="add" className="text-[18px]" />
                  Add Group
                </Button>
              }
            >
                <div className="overflow-x-auto rounded-[22px] border border-slate-200 bg-white">
                <DataTable
                  loading={groupsLoading}
                  columns={[
                    {
                      header: "Name",
                      className: "rounded-l-2xl",
                      cell: (group) => (
                        <>
                          <p className="font-semibold text-slate-900">
                            {group.name}
                          </p>
                          {group.description && (
                            <p className="text-xs text-slate-500 mt-0.5">
                              {group.description}
                            </p>
                          )}
                        </>
                      ),
                    },
                    {
                      header: "Type",
                      cell: (group) => (
                        <Chip variant="neutral">{group.groupType || "team"}</Chip>
                      ),
                    },
                    {
                      header: "Status",
                      cell: (group) => (
                        <Chip variant={group.isActive ? "success" : "neutral"}>
                          {group.isActive ? "Active" : "Inactive"}
                        </Chip>
                      ),
                    },
                    {
                      header: "Organizations",
                      cell: (group) =>
                        group.organizationMappings?.length ??
                        group.organizationIds?.length ??
                        0,
                    },
                    {
                      header: "Members",
                      cell: (group) => group.members?.length ?? 0,
                    },
                    {
                      header: "Actions",
                      className: "rounded-r-2xl text-right",
                      cell: (group) => (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingGroup(group)}
                        >
                          <Icon name="edit" />
                        </Button>
                      ),
                    },
                  ]}
                  data={filteredGroups}
                  emptyTitle="No groups found."
                  emptyDescription=""
                />
              </div>
            </SectionCard>
          </>
        )}

        {activeTab === "types" && (
          <>
            {/* Stats */}
            <div className="grid gap-4 md:grid-cols-3 hidden">
              <StatCard
                label="Total Types"
                value={String(groupTypes.length)}
                tone="neutral"
              />
            </div>

            {/* Table */}
            <SectionCard
              title="Group Types"
              description="Manage the types of groups available."
              action={
                <Button
                  className="gap-2"
                  onClick={() =>
                    setEditingType({
                      id: "",
                      name: "",
                      slug: "",
                      description: "",
                    })
                  }
                >
                  <Icon name="add" className="text-[18px]" />
                  Add Type
                </Button>
              }
            >
              <div className="overflow-x-auto rounded-[22px] border border-slate-200 bg-white">
                <DataTable
                  columns={[
                    {
                      header: "Name",
                      className: "rounded-l-2xl",
                      cell: (type) => (
                        <p className="font-semibold text-slate-900">
                          {type.name}
                        </p>
                      ),
                    },
                    {
                      header: "Slug",
                      cell: (type) => (
                        <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">
                          {type.slug}
                        </code>
                      ),
                    },
                    {
                      header: "Description",
                      cell: (type) => (
                        <span className="text-slate-500">
                          {type.description}
                        </span>
                      ),
                    },
                    {
                      header: "Actions",
                      className: "rounded-r-2xl text-right",
                      cell: (type) => (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingType(type)}
                        >
                          <Icon name="edit" />
                        </Button>
                      ),
                    },
                  ]}
                  data={groupTypes}
                  emptyTitle="No group types found."
                  emptyDescription=""
                />
              </div>
            </SectionCard>
          </>
        )}
      </div>

      {/* SlideOvers */}
      {showCreate && (
        <AdminGroupSlideOver
          types={groupTypes}
          onClose={() => setShowCreate(false)}
          onSaved={() => {
            setShowCreate(false);
            setListKey((k) => k + 1);
          }}
        />
      )}

      {editingGroup && (
        <AdminGroupSlideOver
          group={editingGroup}
          types={groupTypes}
          onClose={() => setEditingGroup(null)}
          onSaved={() => {
            setEditingGroup(null);
            setListKey((k) => k + 1);
          }}
        />
      )}

      {editingType !== null && (
        <AdminGroupTypeSlideOver
          type={editingType}
          onClose={() => setEditingType(null)}
          onSaved={(saved: {
            id: string;
            name: string;
            slug: string;
            description: string;
          }) => {
            if (saved.id && groupTypes.find((t) => t.id === saved.id)) {
              setGroupTypes((prev) =>
                prev.map((t) => (t.id === saved.id ? saved : t)),
              );
            } else {
              setGroupTypes((prev) => [...prev, saved]);
            }
            setEditingType(null);
          }}
        />
      )}
    </AppShell>
  );
}
