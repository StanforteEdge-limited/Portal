import { useEffect, useState } from "react";
import {
  Button,
  Select,
  SlideOver,
  SlideOverPanel,
  SlideOverHeader,
  SlideOverContent,
  SlideOverFooter,
  TextInput,
  useToast,
} from "@/shared";
import { httpRequest, useDirectory } from "@/shared/lib/core";
import {
  createMyProjectTimesheet,
  updateMyProjectTimesheet,
} from "@/shared/api/payroll-api";

interface SlideOverProps {
  open: boolean;
  onClose: () => void;
  timesheetId: string | null;
  onSaved: () => void;
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
        setProjects(Array.isArray(projRes) ? projRes : (projRes?.data || []));
        setFunds(Array.isArray(fundRes) ? fundRes : (fundRes?.data || []));
        setGrants(Array.isArray(grantRes) ? grantRes : (grantRes?.data || []));
      } catch (e) {
        // Safe fail
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
      // Wait, there is no getMyProjectTimesheet endpoint in payroll-api.ts
      // We will have to fetch the list and find it.
      const res = await httpRequest<any>(`/payroll/my/timesheets?page=1&per_page=500`);
      const list = Array.isArray(res) ? res : (res?.data || []);
      const item = list.find((t: any) => t.id === timesheetId);
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
      showToast({ tone: "danger", title: "Error", message: "Date and hours are required." });
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
        await updateMyProjectTimesheet(timesheetId, payload);
      } else {
        await createMyProjectTimesheet(payload);
      }
      
      showToast({ tone: "success", title: "Success", message: "Timesheet saved successfully." });
      onSaved();
    } catch (err: any) {
      showToast({ tone: "danger", title: "Cannot save", message: err.message || "An error occurred." });
    } finally {
      setSaving(false);
    }
  };

  const projectOptions = projects.map(p => ({ label: p.name, value: p.id }));
  const fundOptions = funds.map(f => ({ label: f.name, value: f.id }));
  const grantOptions = grants.map(g => ({ label: g.name, value: g.id }));

  return (
    <SlideOver open={open} onClose={onClose}>
      <SlideOverPanel>
        <SlideOverHeader
          title={timesheetId ? "Edit Timesheet Entry" : "New Timesheet Entry"}
          subtitle="Log your project time"
          onClose={onClose}
        />

        <SlideOverContent className="p-6">
          {loading ? (
            <div className="text-sm text-slate-500 py-10 text-center">Loading entry...</div>
          ) : (
            <form id="timesheet-form" onSubmit={handleSave} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <TextInput
                  label="Work Date"
                  type="date"
                  value={form.work_date}
                  onChange={(e) => setForm({ ...form, work_date: e.target.value })}
                  required
                />
                <TextInput
                  label="Hours"
                  type="number"
                  step="0.5"
                  value={form.hours}
                  onChange={(e) => setForm({ ...form, hours: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-4">
                {directory.organizations.length > 1 && (
                  <Select
                    label="Organization"
                    options={[{ label: "None", value: "" }, ...directory.organizations.map(o => ({ label: o.name, value: o.id }))]}
                    value={form.organization_id}
                    onChange={(val) => setForm({ ...form, organization_id: val })}
                  />
                )}
                
                {directory.teams.length > 1 && (
                  <Select
                    label="Team"
                    options={[{ label: "None", value: "" }, ...directory.teams.map(t => ({ label: t.name, value: t.id }))]}
                    value={form.team_id}
                    onChange={(val) => setForm({ ...form, team_id: val })}
                  />
                )}

                <Select
                  label="Project"
                  options={[{ label: "None", value: "" }, ...projectOptions]}
                  value={form.project_id}
                  onChange={(val) => setForm({ ...form, project_id: val })}
                />

                <Select
                  label="Fund"
                  options={[{ label: "None", value: "" }, ...fundOptions]}
                  value={form.fund_id}
                  onChange={(val) => setForm({ ...form, fund_id: val })}
                />

                <Select
                  label="Grant"
                  options={[{ label: "None", value: "" }, ...grantOptions]}
                  value={form.grant_id}
                  onChange={(val) => setForm({ ...form, grant_id: val })}
                />

                <TextInput
                  label="Description"
                  placeholder="What did you work on?"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
            </form>
          )}
        </SlideOverContent>

        <SlideOverFooter>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form="timesheet-form" disabled={saving || loading}>
            {saving ? "Saving..." : "Save Entry"}
          </Button>
        </SlideOverFooter>
      </SlideOverPanel>
    </SlideOver>
  );
}
