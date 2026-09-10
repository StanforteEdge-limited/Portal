import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Button,
  PageHeader,
  SectionCard,
  TextField,
  TextAreaField,
  SelectField,
  useToast,
} from "@/shared";
import { AppShell } from "@/shared/components/layout/AppShell";
import { useAuth } from "@/shared/context/AuthProvider";
import { useCachedQuery } from "@/shared/lib/core";
import { buildAppNavigation, buildAppMobileNav } from "@/shared/navigation";
import { getWorkspaceProfile } from "@/shared/api/workspace-api";
import { createPayrollRun } from "@/shared/api/payroll-api";

const MONTHS = [
  { value: 1, label: "January" },
  { value: 2, label: "February" },
  { value: 3, label: "March" },
  { value: 4, label: "April" },
  { value: 5, label: "May" },
  { value: 6, label: "June" },
  { value: 7, label: "July" },
  { value: 8, label: "August" },
  { value: 9, label: "September" },
  { value: 10, label: "October" },
  { value: 11, label: "November" },
  { value: 12, label: "December" },
];

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = [CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1];

function defaultPeriodDates(year: number, month: number) {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0);
  return {
    period_start: start.toISOString().slice(0, 10),
    period_end: end.toISOString().slice(0, 10),
  };
}

export default function HrPayrollRunFormPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [name, setName] = useState(
    `Payroll ${MONTHS[today.getMonth()].label} ${today.getFullYear()}`,
  );
  const [currency, setCurrency] = useState("NGN");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { data: profile } = useCachedQuery(
    "hr:profile",
    () => getWorkspaceProfile(),
    { ttlMs: 1000 * 60, storage: "memory" },
  );

  const userName =
    `${user?.first_name || ""} ${user?.last_name || ""}`.trim() ||
    user?.email ||
    "HR Staff";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { period_start, period_end } = defaultPeriodDates(year, month);
      const run = await createPayrollRun({
        name,
        year,
        month,
        period_start,
        period_end,
        currency,
        notes: notes || undefined,
      });
      showToast({ message: "Payroll run created", tone: "success" });
      navigate(`/hr/payroll/runs/${run.id}`);
    } catch {
      showToast({ message: "Failed to create payroll run", tone: "danger" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppShell
      navigation={buildAppNavigation()}
      activeLabel="hr-payroll"
      user={{
        name: userName,
        role: profile?.employee_profile?.job_title || "HR Staff",
      }}
      mobileNav={buildAppMobileNav("HR")}
    >
      <PageHeader
        breadcrumbs={[
          { label: "HR", path: "/hr" },
          { label: "Payroll", path: "/hr/payroll" },
          { label: "New Run" },
        ]}
        title="New Payroll Run"
        description="Create a payroll run. After saving, generate employee items then submit to Finance."
      />

      <form onSubmit={handleSubmit}>
        <SectionCard title="Run Details">
          <div className="grid gap-4 md:grid-cols-2">
            <TextField
              label="Run Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <SelectField
              label="Currency"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
            >
              <option value="NGN">NGN</option>
              <option value="USD">USD</option>
              <option value="GBP">GBP</option>
              <option value="EUR">EUR</option>
            </SelectField>
            <SelectField
              label="Year"
              value={String(year)}
              onChange={(e) => setYear(Number(e.target.value))}
            >
              {YEARS.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </SelectField>
            <SelectField
              label="Month"
              value={String(month)}
              onChange={(e) => setMonth(Number(e.target.value))}
            >
              {MONTHS.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </SelectField>
            <div className="md:col-span-2">
              <TextAreaField
                label="Notes (optional)"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>
        </SectionCard>

        <div className="mt-4 flex gap-3">
          <Button type="submit" disabled={submitting}>
            {submitting ? "Creating..." : "Create Run"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => navigate("/hr/payroll")}
          >
            Cancel
          </Button>
        </div>
      </form>
    </AppShell>
  );
}