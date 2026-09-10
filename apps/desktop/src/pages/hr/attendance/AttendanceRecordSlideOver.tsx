import { useEffect, useState } from "react";
import { Chip, Icon, SlideOver, SlideOverHeader, SlideOverContent } from "@/shared";
import { attendanceApi } from "@/shared/lib/core";
import { TimeWithNextDay } from "@/shared/components/ui/TimeWithNextDay";

type Props = {
  userId: string;
  workDate: string;
  employeeName?: string;
  onClose: () => void;
};

function formatTime(iso: string | null) {
  if (!iso) return "-";
  return new Date(iso).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
}

function formatMinutes(mins: number | null) {
  if (mins === null || mins === undefined) return "-";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export default function AttendanceRecordSlideOver({ userId, workDate, employeeName, onClose }: Props) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    attendanceApi.getDailyRecord(userId, workDate)
      .then((res) => {
        setData(res);
        setLoading(false);
      })
      .catch((err) => {
        setError(err?.message || "Failed to load record");
        setLoading(false);
      });
  }, [userId, workDate]);

  const daily = data?.daily;
  const entries = data?.entries || [];
  const profile = data?.profile;

  const displayName = employeeName || (profile ? `${profile.first_name} ${profile.last_name}` : "-");

  const statusVariant = daily?.status === "present" ? "success" : 
                        daily?.status === "late" ? "warning" : 
                        daily?.status === "absent" ? "danger" : "neutral";

  return (
    <SlideOver open={true} onClose={onClose}>
      <SlideOverHeader title={displayName} onClose={onClose} subtitle={new Date(workDate).toDateString()} />
      <SlideOverContent>
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Icon name="sync" className="animate-spin text-2xl text-slate-400" />
          </div>
        ) : error ? (
          <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
        ) : (
          <div className="space-y-6">
            {/* Summary */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                <p className="text-[0.68rem] font-bold uppercase tracking-[0.16em] text-slate-500">Status</p>
                <Chip variant={statusVariant} className="mt-1 capitalize">{daily?.status || "-"}</Chip>
              </div>
              <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                <p className="text-[0.68rem] font-bold uppercase tracking-[0.16em] text-slate-500">Worked</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{formatMinutes(daily?.worked_minutes)}</p>
              </div>
              <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                <p className="text-[0.68rem] font-bold uppercase tracking-[0.16em] text-slate-500">Late</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{formatMinutes(daily?.late_minutes)}</p>
              </div>
              <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                <p className="text-[0.68rem] font-bold uppercase tracking-[0.16em] text-slate-500">Expected</p>
                <p className="mt-1 text-sm font-semibold capitalize text-slate-900">{daily?.expected_mode || "-"}</p>
              </div>
            </div>

            {/* Clock In/Out Times */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                <p className="text-[0.68rem] font-bold uppercase tracking-[0.16em] text-slate-500">First In</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{formatTime(daily?.first_in_at)}</p>
              </div>
              <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                <p className="text-[0.68rem] font-bold uppercase tracking-[0.16em] text-slate-500">Last Out</p>
                <p className="mt-1 text-sm font-semibold text-slate-900"><TimeWithNextDay time={daily?.last_out_at} referenceDate={daily?.first_in_at} /></p>
              </div>
            </div>

            {/* Clock Entries */}
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Clock Entries</h3>
              <div className="mt-3 space-y-2">
                {entries.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                    No clock entries found.
                  </div>
                ) : (
                  entries.map((entry: any) => (
                    <div key={entry.id} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          {entry.type === "clock_in" ? "Clock In" : entry.type === "clock_out" ? "Clock Out" : entry.type}
                        </p>
                        <p className="text-xs text-slate-500"><TimeWithNextDay time={entry.timestamp} referenceDate={daily?.first_in_at} /></p>
                        {entry.location && <p className="text-xs text-slate-400">{entry.location}</p>}
                        {entry.latitude && entry.longitude && (
                          <p className="text-xs text-slate-400">
                            {entry.latitude.toFixed(4)}, {entry.longitude.toFixed(4)}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <Chip variant="neutral" className="text-xs capitalize">{entry.mode || "-"}</Chip>
                        {entry.source && <Chip variant="neutral" className="text-xs">{entry.source}</Chip>}
                        {entry.verified !== undefined && (
                          <Chip variant={entry.verified ? "success" : "warning"} className="text-xs">
                            {entry.verified ? "Verified" : "Unverified"}
                          </Chip>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </SlideOverContent>
    </SlideOver>
  );
}