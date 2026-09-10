import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Button,
  Chip,
  EmptyState,
  Icon,
  PageHeader,
  SectionCard,
  SelectField,
  StatCard,
  TextField,
} from "@/shared";
import { DataTable } from "@/shared/components/ui/DataTable";
import { AppShell } from "@/shared/components/layout/AppShell";
import { useAuth } from "@/shared/context/AuthProvider";
import { adminUsersApi, resourceApi, useCachedQuery, httpRequest } from "@/shared/lib/core";
import { buildAppNavigation, buildAppMobileNav } from "@/shared/navigation";
import { getWorkspaceProfile } from "@/shared/api/workspace-api";
import type { AdminUser } from "@stanforte/shared";
import AdminUserCreateSlideOver from "./AdminUserCreateSlideOver";
import { BulkImportDashboard, type BulkColumnSchema } from "@/shared/components/feedback/BulkImportDashboard";

function formatDate(value?: string) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

const statusVariant: Record<string, "success" | "warning" | "danger" | "neutral"> = {
  active: "success",
  pending: "warning",
  suspended: "danger",
  inactive: "neutral",
  deleted: "danger",
};

const typeLabel: Record<string, string> = {
  staff: "Staff",
  vendor: "Vendor",
  client: "Client",
  board_member: "Board Member",
};

export default function AdminUsersPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: profile } = useCachedQuery(
    "admin:profile",
    () => getWorkspaceProfile(),
    { ttlMs: 1000 * 60, storage: "memory" },
  );

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [orgFilter, setOrgFilter] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [listKey, setListKey] = useState(0);

  const { data, loading, error } = useCachedQuery(
    `admin:users:${listKey}:${search}:${typeFilter}:${statusFilter}:${orgFilter}`,
    () =>
      adminUsersApi.listUsers({
        search: search || undefined,
        type: typeFilter || undefined,
        status: statusFilter || undefined,
        organization_id: orgFilter || undefined,
        per_page: 100,
      }),
    { ttlMs: 1000 * 30, storage: "memory" },
  );

  const users: AdminUser[] = Array.isArray(data?.data) ? data.data : [];
  const { data: organizations } = useCachedQuery(
    "admin:users:organizations",
    () => resourceApi.listOrganizations(),
    { ttlMs: 1000 * 60, storage: "memory" },
  );
  const organizationNameById = new Map(
    (organizations as any)?.data?.items?.map((org: any) => [String(org.id), org.name]) ?? []
  );
  const total = (data as any)?.data?.meta?.total ?? users.length;
  const active = users.filter((u) => u.status === "active").length;
  const pending = users.filter((u) => u.status === "pending").length;
  const suspended = users.filter((u) => u.status === "suspended").length;

  const userName =
    `${user?.first_name || ""} ${user?.last_name || ""}`.trim() ||
    user?.email ||
    "Admin";

  return (
    <AppShell
      navigation={buildAppNavigation()}
      activeLabel="admin-users"
      user={{
        name: userName,
        role: profile?.employee_profile?.job_title || "Admin",
      }}
      mobileNav={buildAppMobileNav("Dashboard")}
    >
      <PageHeader
        breadcrumbs={[{ label: "Administration" }, { label: "Users" }]}
        title="Users"
        description="Manage all portal accounts — staff, vendors, clients, and board members."
        actions={
          <div className="flex gap-2">
            <Button
              className="gap-2"
              variant="secondary"
              onClick={() => navigate("/admin/users/bulk")}
            >
              <Icon name="grid_on" className="text-[18px]" />
              Bulk Import
            </Button>
            <Button
              className="gap-2"
              onClick={() => setShowCreate(true)}
            >
              <Icon name="person_add" className="text-[18px]" />
              Add User
            </Button>
          </div>
        }
      />

      <div className="grid gap-6">
        {/* Stat cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <StatCard label="Total Users" value={String(total)} tone="neutral" icon="group" />
          <StatCard label="Active" value={String(active)} tone="success" icon="check_circle" />
          <StatCard label="Pending Invite" value={String(pending)} tone="warning" icon="mail" />
          <StatCard label="Suspended" value={String(suspended)} tone="danger" icon="block" />
        </div>

        {/* Filter bar + table */}
        <SectionCard
          title="All Users"
          description="Search or filter to find a specific user."
        >
          <div className="mb-4 flex flex-wrap items-end gap-3">
            <TextField
              label="Search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <SelectField
              label="Type"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="">All types</option>
              <option value="staff">Staff</option>
              <option value="vendor">Vendor</option>
              <option value="client">Client</option>
              <option value="board_member">Board Member</option>
            </SelectField>
            <SelectField
              label="Status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All statuses</option>
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="suspended">Suspended</option>
              <option value="deleted">Deleted</option>
            </SelectField>
            <SelectField
              label="Organization"
              value={orgFilter}
              onChange={(e) => setOrgFilter(e.target.value)}
            >
              <option value="">All organizations</option>
              {(organizations ?? []).map((org) => (
                <option key={org.id} value={String(org.id)}>
                  {org.name}
                </option>
              ))}
            </SelectField>
          </div>

          <DataTable
            columns={[
              {
                header: "User",
                cell: (u) => (
                  <div>
                    <p className="font-semibold text-slate-900">
                      {[u.first_name, u.last_name].filter(Boolean).join(" ") || "-"}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">{u.email}</p>
                  </div>
                )
              },
              {
                header: "Organization",
                cell: (u) => {
                  const primaryFromMembership = (u.organizations ?? []).find(
                    (org) => org.id === u.primary_organization_id || org.is_primary,
                  );
                  const orgName = String(
                    primaryFromMembership?.name ||
                    (u.primary_organization_id
                      ? organizationNameById.get(String(u.primary_organization_id)) || ""
                      : "") ||
                    u.primary_organization?.name ||
                    ""
                  );
                  return orgName ? (
                    <span className="text-sm">{orgName}</span>
                  ) : (
                    <span className="text-sm text-slate-400">-</span>
                  );
                }
              },
              {
                header: "Type",
                cell: (u) => typeLabel[u.type] ?? u.type
              },
              {
                header: "Status",
                cell: (u) => (
                  <Chip variant={statusVariant[u.status] ?? "neutral"}>
                    {u.status}
                  </Chip>
                )
              },
              {
                header: "Created",
                cell: (u) => formatDate(u.created_at)
              },
              {
                header: "",
                className: "text-right",
                cell: (u) => (
                  <Link to={`/admin/users/${u.id}`} onClick={(e) => e.stopPropagation()}>
                    <Button size="sm" variant="ghost" className="gap-2 text-brand-900">
                      View <Icon name="arrow_forward" className="text-[16px]" />
                    </Button>
                  </Link>
                )
              }
            ]}
            data={users}
            loading={loading}
            error={error}
            onRowClick={(u) => navigate(`/admin/users/${u.id}`)}
            emptyTitle="No users found"
            emptyDescription="Try adjusting your filters or add a new user."
          />
        </SectionCard>
      </div>

      {showCreate ? (
        <AdminUserCreateSlideOver
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            setListKey((k) => k + 1);
          }}
        />
      ) : null}
    </AppShell>
  );
}
