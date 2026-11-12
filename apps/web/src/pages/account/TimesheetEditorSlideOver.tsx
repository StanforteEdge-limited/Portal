import { DateInput } from "@/components/ui/date-picker";
import { SelectBox } from "@/components/ui/select";
import { useEffect, useState } from "react";
import {
  Calendar,
  Clock,
  Briefcase,
  Building2,
  Users,
  Wallet,
  PiggyBank,
  FileText,
  X,
  Save,
  Hourglass,
  Layers,
} from "lucide-react";
import {
  SlideOver,
  SlideOverPanel,
  SlideOverHeader,
  SlideOverContent,
  SlideOverFooter,
} from "@/shared/components/ui/SlideOver";
import { useToast } from "@/shared";
import { httpRequest, timesheetApi, useDirectory } from "@/shared/lib/core";

interface SlideOverProps {
  open: boolean;
  onClose: () => void;
  timesheetId: string | null;
  onSaved: () => void;
}

function toArray<T = any>(val: any): T[] {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  if (Array.isArray(val.items)) return val.items;
  if (Array.isArray(val.data?.items)) return val.data.items;
  if (Array.isArray(val.data)) return val.data;
  if (Array.isArray(val.result)) return val.result;
  return [];
}

export default function TimesheetEditorSlideOver({
  open,
  onClose,
  timesheetId,
  onSaved,
}: SlideOverProps) {
  const { showToast } = useToast();
  const directory = useDirectory();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [projects, setProjects] = useState<any[]>([]);
  const [funds, setFunds] = useState<any[]>([]);
  const [grants, setGrants] = useState<any[]>([]);

  const [form, setForm] = useState({
    work_date: new Date().toISOString().slice(0, 10),
    hours: "",
    organization_id: "",
    team_id: "",
    project_id: "",
    fund_id: "",
    grant_id: "",
    description: "",
  });

  useEffect(() => {
    async function loadOptions() {
      try {
        const [projRes, fundRes, grantRes] = await Promise.all([
          httpRequest<any>("/projects?active_only=true").catch(() => []),
          httpRequest<any>("/finance/settings/funds").catch(() => []),
          httpRequest<any>("/finance/settings/grants").catch(() => []),
        ]);
        setProjects(toArray(projRes));
        setFunds(toArray(fundRes));
        setGrants(toArray(grantRes));
      } catch (e) {
        // Safe fallback to empty arrays
        setProjects([]);
        setFunds([]);
        setGrants([]);
      }
    }
    void loadOptions();
  }, []);

  useEffect(() => {
    if (timesheetId && open) {
      void loadTimesheet();
    } else {
      setForm({
        work_date: new Date().toISOString().slice(0, 10),
        hours: "",
        organization_id: "",
        team_id: "",
        project_id: "",
        fund_id: "",
        grant_id: "",
        description: "",
      });
    }
  }, [timesheetId, open]);

  async function loadTimesheet() {
    try {
      setLoading(true);
      const res = await timesheetApi.listMyEntries({ page: 1, per_page: 500 });
      const list = toArray(res);
      const item = list.find((t: any) => String(t.id) === String(timesheetId));
      if (item) {
        setForm({
          work_date: item.work_date ? String(item.work_date).slice(0, 10) : "",
          hours: String(item.hours || ""),
          organization_id: item.organization_id || "",
          team_id: item.team_id || "",
          project_id: item.project_id || "",
          fund_id: item.fund_id || "",
          grant_id: item.grant_id || "",
          description: item.description || "",
        });
      }
    } catch (e) {
      showToast({ tone: "danger", title: "Error", message: "Failed to load timesheet entry." });
    } finally {
      setLoading(false);
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.work_date || !form.hours) {
      showToast({ tone: "danger", title: "Required", message: "Work date and hours are required." });
      return;
    }

    try {
      setSaving(true);
      const payload = {
        ...form,
        organization_id: form.organization_id || undefined,
        team_id: form.team_id || undefined,
        project_id: form.project_id || undefined,
        fund_id: form.fund_id || undefined,
        grant_id: form.grant_id || undefined,
        hours: Number(form.hours),
      };

      if (timesheetId) {
        await timesheetApi.updateMyEntry(timesheetId, payload);
      } else {
        await timesheetApi.createMyEntry(payload);
      }

      showToast({ tone: "success", title: "Saved", message: "Timesheet entry recorded." });
      onSaved();
    } catch (err: any) {
      showToast({ tone: "danger", title: "Cannot save", message: err.message || "An error occurred." });
    } finally {
      setSaving(false);
    }
  };

  const projectOptions = toArray(projects).map((p: any) => ({
    label: p.name || p.title || "Project",
    value: String(p.id),
  }));
  const fundOptions = toArray(funds).map((f: any) => ({
    label: f.name || f.code || "Fund",
    value: String(f.id),
  }));
  const grantOptions = toArray(grants).map((g: any) => ({
    label: g.name || g.code || "Grant",
    value: String(g.id),
  }));
  const orgOptions = toArray(directory?.organizations).map((o: any) => ({
    label: o.name || "Organization",
    value: String(o.id),
  }));
  const teamOptions = toArray(directory?.teams).map((t: any) => ({
    label: t.name || "Team",
    value: String(t.id),
  }));

  return (
    <SlideOver open={open} onClose={onClose} size="lg">
      <SlideOverPanel>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200/80 bg-slate-50/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 flex items-center justify-center font-bold shadow-xs">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {timesheetId ? "Edit Timesheet Entry" : "Log New Timesheet"}
              </h2>
              <p className="text-xs text-slate-500">
                Record hours worked against assigned projects, funds, or grants
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <SlideOverContent className="p-6 overflow-y-auto flex-1">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400 space-y-2">
              <Hourglass className="w-8 h-8 animate-pulse text-orange-500" />
              <p className="text-xs font-semibold">Loading timesheet record...</p>
            </div>
          ) : (
            <form id="timesheet-form" onSubmit={handleSave} className="space-y-5">
              {/* Date & Hours Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-50/70 border border-slate-200/70">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-orange-600" />
                    Work Date <span className="text-red-500">*</span>
                  </label>
                  <DateInput
                    
                    value={form.work_date}
                    onChange={(e) => setForm({ ...form, work_date: e.target.value })}
                    required
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-orange-600" />
                    Hours Logged <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.25"
                    min="0.25"
                    max="24"
                    value={form.hours}
                    onChange={(e) => setForm({ ...form, hours: e.target.value })}
                    placeholder="e.g. 8.0"
                    required
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 font-medium"
                  />
                </div>
              </div>

              {/* Project Allocation */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5 text-slate-500" />
                  Assigned Project
                </label>
                <SelectBox
                  value={form.project_id}
                  onChange={(e) => setForm({ ...form, project_id: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                >
                  <option value="">— Select Project (Optional) —</option>
                  {projectOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </SelectBox>
              </div>

              {/* Fund & Grant Allocations */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                    <PiggyBank className="w-3.5 h-3.5 text-slate-500" />
                    Funding Stream
                  </label>
                  <SelectBox
                    value={form.fund_id}
                    onChange={(e) => setForm({ ...form, fund_id: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  >
                    <option value="">— Select Fund —</option>
                    {fundOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </SelectBox>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                    <Wallet className="w-3.5 h-3.5 text-slate-500" />
                    Grant Allocation
                  </label>
                  <SelectBox
                    value={form.grant_id}
                    onChange={(e) => setForm({ ...form, grant_id: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  >
                    <option value="">— Select Grant —</option>
                    {grantOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </SelectBox>
                </div>
              </div>

              {/* Organization & Team (if multiple exist) */}
              {(orgOptions.length > 1 || teamOptions.length > 1) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {orgOptions.length > 1 && (
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-slate-500" />
                        Organization
                      </label>
                      <SelectBox
                        value={form.organization_id}
                        onChange={(e) => setForm({ ...form, organization_id: e.target.value })}
                        className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                      >
                        <option value="">— Default Organization —</option>
                        {orgOptions.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </SelectBox>
                    </div>
                  )}

                  {teamOptions.length > 1 && (
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-slate-500" />
                        Team / Workgroup
                      </label>
                      <SelectBox
                        value={form.team_id}
                        onChange={(e) => setForm({ ...form, team_id: e.target.value })}
                        className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                      >
                        <option value="">— Select Team —</option>
                        {teamOptions.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </SelectBox>
                    </div>
                  )}
                </div>
              )}

              {/* Description & Work Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-slate-500" />
                  Description of Deliverables / Tasks Completed
                </label>
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Summarize key tasks, milestones reached, or donor deliverables worked on during this session..."
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 resize-none"
                />
              </div>
            </form>
          )}
        </SlideOverContent>

        {/* Footer */}
        <SlideOverFooter className="flex items-center justify-end gap-2.5 px-6 py-4 border-t border-slate-200 bg-slate-50/80 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2.5 text-xs font-bold rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="timesheet-form"
            disabled={saving || loading}
            className="px-5 py-2.5 text-xs font-bold rounded-xl bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white shadow-sm transition flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {saving ? "Saving..." : timesheetId ? "Update Entry" : "Save Timesheet"}
          </button>
        </SlideOverFooter>
      </SlideOverPanel>
    </SlideOver>
  );
}
