import { Button, Icon, TextField, useToast } from "@/shared";
import { useState } from "react";
import { hrApi } from "@/shared/lib/core";
import { type EmployeeDetail } from "@stanforte/shared";

export default function EmployeeProfileTab({ employee, onSaved }: { employee: EmployeeDetail; onSaved: () => void }) {
    const { showToast } = useToast();
    const [firstName, setFirstName] = useState(employee.first_name || "");
    const [lastName, setLastName] = useState(employee.last_name || "");
    const [email, setEmail] = useState(employee.email);
    const [phone, setPhone] = useState(employee.phone || "");
    const [username, setUsername] = useState(employee.username || "");
    const [employeeCode, setEmployeeCode] = useState(employee.employee_code || "");
    const [saving, setSaving] = useState(false);
    const [apiError, setApiError] = useState<string | null>(null);

    const isDirty =
        firstName !== employee.first_name ||
        lastName !== employee.last_name ||
        email !== employee.email ||
        phone !== (employee.phone || "") ||
        username !== (employee.username || "") ||
        employeeCode !== (employee.employee_code || "");

    async function handleSave() {
        setApiError(null);
        if (!firstName.trim() || !lastName.trim() || !email.trim()) {
            showToast({ tone: "warning", title: "Validation error", message: "Name and email are required." });
            return;
        }

        try {
            setSaving(true);
            await hrApi.updateEmployee(employee.id, {
                first_name: firstName.trim(),
                last_name: lastName.trim(),
                email: email.trim(),
                phone: phone.trim() || null,
                username: username.trim() || null,
                employee_code: employeeCode.trim() || null,
            });
            showToast({ tone: "success", title: "Saved", message: "Profile updated successfully." });
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

            <div className="grid gap-4 max-w-2xl">
                <div className="grid gap-4 sm:grid-cols-2">
                    <TextField label="First Name" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                    <TextField label="Last Name" value={lastName} onChange={(e) => setLastName(e.target.value)} />
                </div>

                <TextField label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                <TextField label="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
                <TextField label="Username" value={username} onChange={(e) => setUsername(e.target.value)} />
                <TextField label="Employee Code" value={employeeCode} onChange={(e) => setEmployeeCode(e.target.value)} />

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
