import { useState } from "react";
import {
  Chip,
  StatCard,
  TextField,
} from "@/shared";
import { DataTable } from "@/shared/components/ui/DataTable";
import { attendanceApi, useCachedQuery } from "@/shared/lib/core";
import { formatDate, formatTime, formatDuration } from "@stanforte/shared";
import { TimeWithNextDay } from "@/shared/components/ui/TimeWithNextDay";

type Props = {
  employeeId: string;
};

const statusVariant: Record<string, "success" | "warning" | "danger" | "neutral"> = {
  present: "success",
  late: "warning",
  absent: "danger",
};

export default function EmployeeAttendanceTab({ employeeId }: Props) {
  const [from, setFrom] = useState(new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10));
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));

  const { data, loading } = useCachedQuery(
    `hr:employee:attendance:${employeeId}:${from}:${to}`,
    () => attendanceApi.listRecords({ from, to, user_id: employeeId }),
    { ttlMs: 1000 * 60, storage: "memory" }
  );

  const rows: any[] = (data as any)?.items || [];
  
  // Aggregate stats from rows
  const stats = rows.reduce((acc, row) => {
    acc.total++;
    if (row.status === 'present' || row.status === 'late') acc.present++;
    if (row.status === 'late') acc.late++;
    if (row.status === 'absent') acc.absent++;
    acc.workedMins += row.worked_minutes;
    return acc;
  }, { total: 0, present: 0, late: 0, absent: 0, workedMins: 0 });

  const [exportingCsv, setExportingCsv] = useState(false);

  const handleExportCsv = async () => {
    try {
      setExportingCsv(true);
      const res = await attendanceApi.listRecords({ from, to, user_id: employeeId, page: 1, per_page: 5000 });
      const csvRows = ["Date,Clock In,Clock Out,Worked Minutes,Late Minutes,Status"];
      for (const row of res.items) {
        csvRows.push(`${row.work_date},${row.first_in_at || ''},${row.last_out_at || ''},${row.worked_minutes},${row.late_minutes},${row.status}`);
      }
      const csv = csvRows.join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `attendance_${employeeId}_${from}_${to}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      alert("Failed to export CSV");
    } finally {
      setExportingCsv(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Total Days" value={String(stats.total)} icon="calendar_today" />
        <StatCard label="Present" value={String(stats.present)} tone="success" icon="check_circle" />
        <StatCard label="Late" value={String(stats.late)} tone="warning" icon="schedule" />
        <StatCard label="Worked Time" value={formatDuration(stats.workedMins)} icon="timer" />
      </div>

      <div className="flex flex-wrap items-end justify-between gap-3 bg-slate-50 p-4 rounded-3xl border border-slate-100">
        <div className="flex flex-wrap items-end gap-3">
          <TextField label="From" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          <TextField label="To" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <button
          onClick={handleExportCsv}
          disabled={exportingCsv}
          className="flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-inset ring-slate-300 hover:bg-slate-50 disabled:opacity-50"
        >
          <span className="material-symbols-outlined text-[18px]">download</span>
          {exportingCsv ? "Exporting..." : "Export CSV"}
        </button>
      </div>

      {loading ? (
        <div className="p-8 text-center text-slate-500">Loading history...</div>
      ) : (
        <div className="overflow-x-auto rounded-[22px] border border-slate-200">
          <DataTable
            columns={[
              { header: "Date", className: "font-medium text-slate-900", cell: (row) => formatDate(row.work_date) },
              { header: "Clock In", cell: (row) => formatTime(row.first_in_at) },
              { header: "Clock Out", cell: (row) => <TimeWithNextDay time={row.last_out_at} referenceDate={row.first_in_at} /> },
              { header: "Worked", cell: (row) => formatDuration(row.worked_minutes) },
              { header: "Late", cell: (row) => row.late_minutes > 0 ? formatDuration(row.late_minutes) : "-" },
              { header: "Status", cell: (row) => (
                <Chip variant={statusVariant[row.status] ?? "neutral"}>
                  {row.status}
                </Chip>
              ) },
            ]}
            data={rows}
            loading={loading}
          />
        </div>
      )}
    </div>
  );
}
