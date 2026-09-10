import { Button, Chip, Icon, SelectField, TextAreaField, TextField, useToast } from "@/shared";
import { useEffect, useMemo, useState } from "react";
import { hrApi } from "@/shared/lib/core";
import { type EmployeeDetail, type EmploymentType, type WorkMode } from "@stanforte/shared";
import { useDirectory } from "@/shared/lib/use-directory";

function humanize(value: string) {
    return String(value || "")
        .replaceAll("_", " ")
        .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatDate(value?: string | null) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toISOString().slice(0, 10);
}

export default function EmployeeJobTab({ employee, onSaved }: { employee: EmployeeDetail; onSaved: () => void }) {
    const { showToast } = useToast();
    const { employees: allEmployees } = useDirectory();
    const [jobTitle, setJobTitle] = useState(employee.job_title || "");
    const [jobDescription, setJobDescription] = useState(employee.job_description || "");
    const [employmentType, setEmploymentType] = useState<EmploymentType>(employee.employment_type || "full_time");
    const [workMode, setWorkMode] = useState<WorkMode>(employee.work_mode || "onsite");
    const [hireDate, setHireDate] = useState(formatDate(employee.hire_date));
    const [confirmationDate, setConfirmationDate] = useState(formatDate(employee.confirmation_date));
    const [exitDate, setExitDate] = useState(formatDate(employee.exit_date));
    const [managerUserId, setManagerUserId] = useState(employee.manager?.id || "");
    const [saving, setSaving] = useState(false);
    const [apiError, setApiError] = useState<string | null>(null);

    const managerOptions = useMemo(
        () => allEmployees.map(emp => ({
            value: emp.id,
            label: `${emp.name} (${emp.subtitle})`,
        })),
        [allEmployees],
    );

    const isDirty =
        jobTitle !== (employee.job_title || "") ||
        jobDescription !== (employee.job_description || "") ||
        employmentType !== (employee.employment_type || "full_time") ||
        workMode !== (employee.work_mode || "onsite") ||
        hireDate !== formatDate(employee.hire_date) ||
        confirmationDate !== formatDate(employee.confirmation_date) ||
        exitDate !== formatDate(employee.exit_date) ||
        managerUserId !== (employee.manager?.id || "");

    async function handleSave() {
        setApiError(null);
        if (!jobTitle.trim()) {
            showToast({ tone: "warning", title: "Validation error", message: "Job title is required." });
            return;
        }

        try {
            setSaving(true);
            await hrApi.updateEmployee(employee.id, {
                job_title: jobTitle.trim(),
                job_description: jobDescription.trim() || null,
                employment_type: employmentType,
                work_mode: workMode,
                hire_date: hireDate || null,
                confirmation_date: confirmationDate || null,
                exit_date: exitDate || null,
                manager_user_id: managerUserId.trim() || null,
            });
            showToast({ tone: "success", title: "Saved", message: "Job details updated successfully." });
            onSaved();
        } catch (err: any) {
            const message = err?.message || err?.error?.message || "Failed to update";
            setApiError(message);
            showToast({ tone: "danger", title: "Save failed", message });
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="space-y-4">
            {apiError && (
                <div className="rounded-2xl border border-danger/20 bg-danger/10 px-4 py-4 text-sm text-danger">
                    {apiError}
                </div>
            )}

            <div className="mb-4">
                <p className="text-sm font-semibold text-slate-700">Employment Status</p>
                <div className="mt-2">
                    <Chip variant={
                        employee.employment_status === 'active' ? 'success' :
                            employee.employment_status === 'draft' ? 'pending' :
                                employee.employment_status === 'suspended' ? 'danger' :
                                    'neutral'
                    }>
                        {humanize(employee.employment_status || "draft")}
                    </Chip>
                </div>
                <p className="mt-2 text-xs text-slate-500">Status can be changed via the Actions tab.</p>
            </div>

            <div className="grid gap-4 max-w-2xl">
                <TextField label="Job Title" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} />
                <TextAreaField label="Job Description" value={jobDescription} onChange={(e) => setJobDescription(e.target.value)} rows={4} />

                <div className="grid gap-4 sm:grid-cols-2">
                    <SelectField
                        label="Employment Type"
                        value={employmentType}
                        onChange={(e) => setEmploymentType(e.target.value as EmploymentType)}
                    >
                        <option value="full_time">Full-time</option>
                        <option value="contract">Contract</option>
                        <option value="intern">Intern</option>
                        <option value="consultant">Consultant</option>
                    </SelectField>

                    <SelectField
                        label="Work Mode"
                        value={workMode}
                        onChange={(e) => setWorkMode(e.target.value as WorkMode)}
                    >
                        <option value="onsite">Onsite</option>
                        <option value="hybrid">Hybrid</option>
                        <option value="remote">Remote</option>
                    </SelectField>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                    <TextField label="Hire Date" type="date" value={hireDate} onChange={(e) => setHireDate(e.target.value)} />
                    <TextField label="Confirmation Date" type="date" value={confirmationDate} onChange={(e) => setConfirmationDate(e.target.value)} />
                    <TextField label="Exit Date" type="date" value={exitDate} onChange={(e) => setExitDate(e.target.value)} />
                </div>

                <SelectField
                    label="Manager"
                    value={managerUserId}
                    onChange={(e) => setManagerUserId(e.target.value)}
                >
                    <option value="">No manager</option>
                    {managerOptions.map(option => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </SelectField>

                <div className="pt-4">
                    <Button
                        className="gap-2"
                        onClick={() => void handleSave()}
                        disabled={saving || !isDirty}
                    >
                        {saving ? (
                            <>
                                <Icon name="hourglass_empty" className="text-[18px] animate-spin" />
                                Saving...
                            </>
                        ) : (
                            <>
                                <Icon name="save" className="text-[18px]" />
                                Save Changes
                            </>
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
}
