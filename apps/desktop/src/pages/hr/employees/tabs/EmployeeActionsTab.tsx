import { Button, Chip, Icon, TextField, useToast } from "@/shared";
import { useState } from "react";
import { hrApi } from "@/shared/lib/core";
import { type EmployeeDetail, type EmployeeAction } from "@stanforte/shared";

function humanize(value: string) {
    return String(value || "")
        .replaceAll("_", " ")
        .replace(/\b\w/g, (char) => char.toUpperCase());
}

type ActionCardProps = {
    title: string;
    description: string;
    action: EmployeeAction;
    disabled: boolean;
    employee: EmployeeDetail;
    onSuccess: () => void;
};

function ActionCard({ title, description, action, disabled, employee, onSuccess }: ActionCardProps) {
    const { showToast } = useToast();
    const [effectiveDate, setEffectiveDate] = useState("");
    const [notes, setNotes] = useState("");
    const [submitting, setSubmitting] = useState(false);

    async function handleSubmit() {
        try {
            setSubmitting(true);
            await hrApi.runAction(employee.id, {
                action,
                effective_date: effectiveDate || undefined,
                notes: notes.trim() || undefined,
            });
            showToast({ tone: "success", title: "Success", message: `${humanize(action)} action completed.` });
            onSuccess();
        } catch (err: any) {
            showToast({ tone: "danger", title: "Failed", message: err?.message || "Action failed" });
        } finally {
            setSubmitting(false);
        }
    }

    const isCurrentStatus =
        (action === 'activate' && employee.employment_status === 'active') ||
        (action === 'suspend' && employee.employment_status === 'suspended') ||
        (action === 'exit' && employee.employment_status === 'exited');

    const tone = action === 'activate' ? 'success' : action === 'suspend' ? 'warning' : 'danger';

    return (
        <div className={`rounded-2xl border-2 ${isCurrentStatus ? 'border-slate-200 bg-slate-50' : `border-${tone}/20 bg-white`} p-5`}>
            <div className="flex items-start justify-between gap-3">
                <div>
                    <h4 className="text-sm font-semibold text-slate-950">{title}</h4>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
                </div>
                {isCurrentStatus && <Chip variant="neutral">Current</Chip>}
            </div>

            <div className="mt-4 grid gap-3">
                <TextField
                    label="Effective Date (optional)"
                    type="date"
                    value={effectiveDate}
                    onChange={(e) => setEffectiveDate(e.target.value)}
                    disabled={disabled || isCurrentStatus}
                />
                <TextField
                    label="Notes (optional)"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    disabled={disabled || isCurrentStatus}
                />
                <Button
                    className="gap-2"
                    onClick={() => void handleSubmit()}
                    disabled={disabled || isCurrentStatus || submitting}
                >
                    {submitting ? (
                        <>
                            <Icon name="hourglass_empty" className="text-[18px] animate-spin" />
                            Processing...
                        </>
                    ) : (
                        <>
                            <Icon name={action === 'activate' ? 'check_circle' : action === 'suspend' ? 'pause_circle' : 'exit_to_app'} className="text-[18px]" />
                            {humanize(action)}
                        </>
                    )}
                </Button>
            </div>
        </div>
    );
}

export default function EmployeeActionsTab({ employee, onSaved }: { employee: EmployeeDetail; onSaved: () => void }) {
    return (
        <div className="space-y-4 max-w-2xl">
            <ActionCard
                title="Activate Employee"
                description="Set the employee to active status. They will have full access to the portal."
                action="activate"
                disabled={false}
                employee={employee}
                onSuccess={onSaved}
            />

            <ActionCard
                title="Exit Employee"
                description="Permanently mark the employee as exited. This action should be used when an employee leaves the organization."
                action="exit"
                disabled={false}
                employee={employee}
                onSuccess={onSaved}
            />
        </div>
    );
}
