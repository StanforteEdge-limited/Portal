import { useMemo, useState } from "react";
import {
  Button,
  Chip,
  SectionCard,
  StatCard,
  useToast,
  Icon,
} from "@/shared";
import { DataTable } from "@/shared/components/ui/DataTable";
import { useCachedQuery, httpRequest } from "@/shared/lib/core";
import { formatDisplayDate } from "@stanforte/shared";
import {
  listMyProjectTimesheets,
  submitMyProjectTimesheet,
  type TimesheetRow,
} from "@/shared/api/payroll-api";
import { AccountShellPage } from "./page-helpers";
import TimesheetEditorSlideOver from "./TimesheetEditorSlideOver";

const statusVariant: Record<string, "success" | "pending" | "neutral" | "warning" | "danger"> = {
  draft: "neutral",
  submitted: "pending",
  approved: "success",
  rejected: "danger",
};

export default function TimesheetsPage() {
  const { showToast } = useToast();
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const { data: timesheets = [], loading, refetch } = useCachedQuery(
    "payroll:my-timesheets",
    () => listMyProjectTimesheets({ page: 1, per_page: 500 }),
    { ttlMs: 1000 * 60, storage: "memory" }
  );

  const summary = useMemo(() => {
    const totalHours = timesheets.reduce((sum: number, row: any) => sum + Number(row.hours || 0), 0);
    return {
      entries: timesheets.length,
      hours: totalHours,
      submitted: timesheets.filter((row: any) => row.status === "submitted").length,
      approved: timesheets.filter((row: any) => row.status === "approved").length,
    };
  }, [timesheets]);

  async function submitTimesheet(id: string) {
    try {
      await submitMyProjectTimesheet(id);
      showToast({ tone: "success", title: "Submitted", message: "Timesheet submitted for review." });
      void refetch();
    } catch (err: any) {
      showToast({ tone: "danger", title: "Cannot submit", message: err.message || "Failed to submit timesheet." });
    }
  }

  return (
    <AccountShellPage
      activeLabel="Timesheets"
      eyebrow="My Account"
      breadcrumbs={[
        { label: "Profile", path: "/profile" },
        { label: "Timesheets" },
      ]}
      title="My Project Timesheets"
      description="Submit your project time to feed payroll allocations."
    >
      <div className="grid gap-6 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-8">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900">Recent Entries</h3>
            <Button size="sm" onClick={() => { setEditingId(null); setEditorOpen(true); }}>
              <Icon name="add" className="mr-2" />
              New Entry
            </Button>
          </div>

          <SectionCard>
            <DataTable
              columns={[
                {
                  header: "Date & Desc",
                  cell: (row: any) => (
                    <>
                      <div className="font-semibold text-slate-900">{row.work_date ? formatDisplayDate(row.work_date) : "-"}</div>
                      <div className="text-xs text-slate-500 line-clamp-1 max-w-[200px]" title={row.description}>{row.description || "No description"}</div>
                    </>
                  )
                },
                {
                  header: "Project / Fund",
                  cell: (row: any) => (
                    <>
                      <div className="font-medium text-slate-800">{row.project?.name || "General"}</div>
                      <div className="text-xs text-slate-500">{row.fund?.name || "No fund"} • {row.grant?.name || "No grant"}</div>
                    </>
                  )
                },
                {
                  header: "Hours",
                  cell: (row: any) => Number(row.hours).toFixed(1)
                },
                {
                  header: "Status",
                  cell: (row: any) => {
                    const statusKey = String(row.status || "").toLowerCase();
                    return (
                      <Chip variant={statusVariant[statusKey] ?? "neutral"} className="capitalize">
                        {row.status?.replace("_", " ") || "Draft"}
                      </Chip>
                    );
                  }
                },
                {
                  header: "Actions",
                  className: "text-right",
                  cell: (row: any) => {
                    const statusKey = String(row.status || "").toLowerCase();
                    const isDraftOrRejected = ["draft", "rejected"].includes(statusKey);
                    return (
                      <div className="space-x-2">
                        {isDraftOrRejected && (
                          <>
                            <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); setEditingId(row.id); setEditorOpen(true); }}>
                              <Icon name="edit" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); void submitTimesheet(row.id); }}>
                              <Icon name="send" />
                            </Button>
                          </>
                        )}
                      </div>
                    );
                  }
                }
              ]}
              data={timesheets}
              loading={loading}
            />
          </SectionCard>
        </div>

        <div className="space-y-6 lg:col-span-4">
          <StatCard label="Entries" value={String(summary.entries)} tone="neutral" />
          <StatCard label="Hours Logged" value={summary.hours.toFixed(1)} tone="pending" />
          <StatCard label="Submitted" value={String(summary.submitted)} tone="neutral" />
          <StatCard label="Approved" value={String(summary.approved)} tone="success" hint="Feeding into next payroll run" />

          <SectionCard title="Guidelines">
            <ul className="text-sm text-slate-600 list-disc pl-4 space-y-2">
              <li>Approved entries feed payroll allocation for project costing.</li>
              <li>Draft and rejected rows can be edited freely.</li>
              <li>Submitted rows are locked until reviewed.</li>
            </ul>
          </SectionCard>
        </div>
      </div>

      {editorOpen && (
        <TimesheetEditorSlideOver
          open={editorOpen}
          onClose={() => setEditorOpen(false)}
          timesheetId={editingId}
          onSaved={() => {
            setEditorOpen(false);
            void refetch();
          }}
        />
      )}
    </AccountShellPage>
  );
}
