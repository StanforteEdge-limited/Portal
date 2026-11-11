import { useNavigate } from "react-router-dom";
import { Link } from "@/shared/router-adapter";
import type { CreateAdminUser } from "@stanforte/contract";
import { PortalLayout } from "@/components/layout/PortalLayout";
import { PageHeader } from "@/shared";
import { useAuth } from "@/shared/context/AuthProvider";
import { useCachedQuery, resourceApi, adminUsersApi } from "@/shared/lib/core";
import { BulkImportDashboard, type BulkColumnSchema } from "@/shared/components/feedback/BulkImportDashboard";
import { Users, ChevronRight, ArrowLeft } from "lucide-react";

export default function AdminUserBulkPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: organizations } = useCachedQuery(
    "admin:users:organizations",
    () => resourceApi.listOrganizations(),
    { ttlMs: 1000 * 60, storage: "memory" },
  );

  const { data: roleOptions } = useCachedQuery(
    "admin:users:roles",
    () => adminUsersApi.listRoleOptions(),
    { ttlMs: 1000 * 60, storage: "memory" },
  );

  const orgOptions = Array.isArray(organizations)
    ? organizations.map((o: any) => ({ value: String(o.id), label: o.name }))
    : [];

  const columns: BulkColumnSchema[] = [
    { key: "first_name", label: "First Name", placeholder: "e.g., John", required: true, minWidth: "150px" },
    { key: "last_name", label: "Last Name", placeholder: "e.g., Doe", required: true, minWidth: "150px" },
    { key: "email", label: "Email Address", placeholder: "e.g., john@company.com", required: true, minWidth: "220px" },
    { key: "username", label: "Username", placeholder: "e.g., johndoe (optional)", minWidth: "150px" },
    {
      key: "type",
      label: "Role Type",
      type: "select",
      options: [
        { value: "staff", label: "Staff" },
        { value: "vendor", label: "Vendor" },
        { value: "client", label: "Client" },
        { value: "board_member", label: "Board Member" },
      ],
      required: true,
      minWidth: "140px",
    },
    {
      key: "primary_organization_id",
      label: "Organization",
      type: "select",
      options: orgOptions,
      required: true,
      minWidth: "180px",
    },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [
        { value: "active", label: "Active" },
        { value: "pending", label: "Pending" },
        { value: "suspended", label: "Suspended" },
      ],
      required: true,
      minWidth: "130px",
    },
    {
      key: "roles",
      label: "Portal Roles",
      type: "multiselect",
      options: Array.isArray(roleOptions)
        ? roleOptions.map((r: any) => ({ value: r.slug, label: r.name }))
        : [],
      minWidth: "220px",
    },
    {
      key: "send_invite",
      label: "Send Invite",
      type: "checkbox",
      minWidth: "100px",
    },
  ];

  const sampleUsers: CreateAdminUser[] = [
    {
      first_name: "Jane",
      last_name: "Smith",
      email: "jane.smith@stanforteedge.com",
      username: "janesmith",
      type: "staff",
      primary_organization_id: orgOptions[0]?.value || "",
      status: "active",
      roles: ["employee"],
      send_invite: true,
    },
  ];

  const handleSubmitBulk = async (dataList: CreateAdminUser[]) => {
    return await adminUsersApi.createBulkUsers({ users: dataList });
  };

  return (
    <PortalLayout activeNav="Employees Directory">
      <div className="space-y-6 max-w-[1600px] mx-auto pb-12">
        {/* Modern Unified Page Header (No Breadcrumbs) */}
        <PageHeader
          title="Bulk Employee Onboarding"
          description="Stage, validate, and mass-register employee accounts across corporate organizations."
          icon={Users}
          iconColor="bg-orange-50 text-[#ff6900]"
          actions={
            <Link
              to="/admin/users"
              className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition shadow-xs self-start sm:self-auto"
            >
              <ArrowLeft className="h-4 w-4 text-slate-400" />
              <span>Back to Staff Directory</span>
            </Link>
          }
        />

        {/* Bulk Dashboard */}
        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden p-6">
          <BulkImportDashboard
            title="CSV / Spreadsheet Importer"
            description="Download the template, paste rows or upload a CSV file to register staff members."
            columns={columns}
            sampleData={sampleUsers}
            onSubmit={handleSubmitBulk}
            onCancel={() => navigate("/admin/users")}
          />
        </div>
      </div>
    </PortalLayout>
  );
}
