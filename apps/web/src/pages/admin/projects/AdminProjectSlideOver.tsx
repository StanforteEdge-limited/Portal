import { DateInput } from "@/components/ui/date-picker";
import { SelectBox } from "@/components/ui/select";
import { useState, useEffect } from "react";
import { useToast } from "@/shared";
import {
  SlideOver,
  SlideOverHeader,
  SlideOverContent,
  SlideOverFooter,
} from "@/shared/components/ui/SlideOver";
import { resourceApi, hrApi } from "@/shared/lib/core";
import { Briefcase, Building2, Calendar, User, Check } from "lucide-react";

type Props = {
  project?: {
    id: string;
    name: string;
    description?: string;
    projectCode?: string;
    organizationId?: string;
    ownerId?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
  } | null;
  defaultOrgId?: string;
  onClose: () => void;
  onSaved: () => void;
};

const projectStatusOptions = [
  { value: "active", label: "Active" },
  { value: "planned", label: "Planned" },
  { value: "on_hold", label: "On Hold" },
  { value: "completed", label: "Completed" },
  { value: "archived", label: "Archived" },
];

export default function AdminProjectSlideOver({
  project,
  defaultOrgId,
  onClose,
  onSaved,
}: Props) {
  const { showToast } = useToast();
  const [saving, setSaving] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);

  const [name, setName] = useState(project?.name || "");
  const [description, setDescription] = useState(project?.description || "");
  const [projectCode, setProjectCode] = useState(project?.projectCode || "");
  const [organizationId, setOrganizationId] = useState(
    project?.organizationId || defaultOrgId || "",
  );
  const [ownerId, setOwnerId] = useState(project?.ownerId || "");
  const [status, setStatus] = useState(project?.status || "active");
  const [startDate, setStartDate] = useState(project?.startDate || "");
  const [endDate, setEndDate] = useState(project?.endDate || "");

  useEffect(() => {
    async function loadData() {
      setLoadingData(true);
      try {
        const orgs = await resourceApi.listOrganizations();
        const employeesResult = (await hrApi.listEmployees({ status: "active" })) as any;
        setOrganizations(orgs);
        const employeesList = employeesResult?.data?.items ?? [];
        setUsers(employeesList);
      } catch {
        setOrganizations([]);
        setUsers([]);
      } finally {
        setLoadingData(false);
      }
    }
    void loadData();
  }, []);

  async function handleSubmit(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!name.trim()) {
      showToast("Please enter a project name", "error");
      return;
    }
    if (!projectCode.trim()) {
      showToast("Please enter a unique project code", "error");
      return;
    }

    try {
      setSaving(true);
      const payload = {
        name: name.trim(),
        description: description.trim() || undefined,
        project_code: projectCode.trim(),
        organization_id: organizationId || undefined,
        owner_user_id: ownerId || undefined,
        governance_status: status,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
      };

      if (project) {
        await resourceApi.updateProject(project.id, payload);
        showToast(`Project "${name}" updated successfully.`, "success");
      } else {
        await resourceApi.createProject(payload);
        showToast(`Project "${name}" created successfully.`, "success");
      }
      onSaved();
    } catch (err: any) {
      showToast(err?.message || "Failed to save project.", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <SlideOver isOpen onClose={onClose} size="lg">
      <SlideOverHeader
        title={project ? "Edit Project" : "Create New Project"}
        subtitle="Manage governance tracking code, corporate ownership, and delivery schedule."
        onClose={onClose}
      />

      <form onSubmit={handleSubmit} className="flex-1 flex flex-col justify-between overflow-y-auto">
        <SlideOverContent className="space-y-6 p-6">
          {/* Section 1: Basic Info */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100 text-xs font-bold text-slate-900 uppercase tracking-wider">
              <Briefcase className="h-4 w-4 text-[#ff6900]" />
              Project Identity
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Project Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Core Banking System Upgrade"
                  required
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#ff6900]/20 focus:border-[#ff6900]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Project Code <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={projectCode}
                  onChange={(e) => setProjectCode(e.target.value)}
                  placeholder="e.g., PRJ-2026-001"
                  required
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-mono font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#ff6900]/20 focus:border-[#ff6900]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Description & Objectives
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief summary of deliverables and strategic goals..."
                rows={3}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#ff6900]/20 focus:border-[#ff6900]"
              />
            </div>
          </div>

          {/* Section 2: Organization & Owner */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100 text-xs font-bold text-slate-900 uppercase tracking-wider">
              <Building2 className="h-4 w-4 text-blue-600" />
              Ownership & Organization
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Host Organization Entity
                </label>
                <SelectBox
                  value={organizationId}
                  onChange={(e) => setOrganizationId(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#ff6900]/20 focus:border-[#ff6900]"
                >
                  <option value="">Select Organization</option>
                  {organizations.map((org) => (
                    <option key={org.id} value={org.id}>
                      {org.name}
                    </option>
                  ))}
                </SelectBox>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Project Owner / Lead
                </label>
                <SelectBox
                  value={ownerId}
                  onChange={(e) => setOwnerId(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#ff6900]/20 focus:border-[#ff6900]"
                >
                  <option value="">Select Owner</option>
                  {users.map((u) => {
                    const uName =
                      `${u.first_name || ""} ${u.last_name || ""}`.trim() ||
                      u.email ||
                      u.id;
                    return (
                      <option key={u.id} value={u.id}>
                        {uName}
                      </option>
                    );
                  })}
                </SelectBox>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Governance Status
                </label>
                <SelectBox
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#ff6900]/20 focus:border-[#ff6900]"
                >
                  {projectStatusOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </SelectBox>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Start Date
                </label>
                <DateInput
                  
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#ff6900]/20 focus:border-[#ff6900]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Target End Date
                </label>
                <DateInput
                  
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#ff6900]/20 focus:border-[#ff6900]"
                />
              </div>
            </div>
          </div>
        </SlideOverContent>

        <SlideOverFooter className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-semibold text-xs hover:bg-white transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2 rounded-xl bg-[#ff6900] hover:bg-[#ea580c] text-white font-bold text-xs shadow-sm shadow-orange-500/20 transition flex items-center gap-2"
          >
            {saving ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            <span>{project ? "Update Project" : "Create Project"}</span>
          </button>
        </SlideOverFooter>
      </form>
    </SlideOver>
  );
}
