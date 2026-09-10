import { useMemo, useState } from "react";
import { Button, Chip, EmptyState, useToast } from "@/shared";
import { useCachedQuery, workApi } from "@/shared/lib/core";
import type { WorkLog } from "@stanforte/shared";
import AddLogEntrySlideOver from "./AddLogEntrySlideOver";

type Props = {
  preselectedTaskId?: string;
  onPreselectedConsumed?: () => void;
};

function toDateStr(date: Date) {
  return date.toISOString().slice(0, 10);
}

function getWeekStart(date = new Date()) {
  const next = new Date(date);
  const day = next.getDay();
  next.setDate(next.getDate() + (day === 0 ? -6 : 1 - day));
  next.setHours(0, 0, 0, 0);
  return next;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

const LOG_STATUS_VARIANT: Record<string, "success" | "warning" | "danger" | "neutral"> = {
  draft: "neutral",
  pending_review: "warning",
  submitted: "warning",
  approved: "success",
  rejected: "danger",
};

const LOG_STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  pending_review: "Pending Review",
  submitted: "Pending Review",
  approved: "Approved",
  rejected: "Rejected",
};

function getLogStatus(log: WorkLog) {
  return String(log.approval_status || log.status || "draft");
}

export default function DailyLogTab({ preselectedTaskId, onPreselectedConsumed }: Props) {
  const today = toDateStr(new Date());
  const { showToast } = useToast();
  const [weekStart, setWeekStart] = useState(() => getWeekStart());
  const [selectedDate, setSelectedDate] = useState(today);
  const [refreshKey, setRefreshKey] = useState(0);
  const [slideOver, setSlideOver] = useState<{ editing: WorkLog | null } | null>(
    preselectedTaskId ? { editing: null } : null,
  );
  const [submitting, setSubmitting] = useState(false);

  const weekDays = useMemo(
    () =>
      Array.from({ length: 7 }, (_, index) => {
        const date = addDays(weekStart, index);
        return {
          key: toDateStr(date),
          label: date.toLocaleDateString(undefined, { weekday: "short", day: "numeric" }),
          isFuture: toDateStr(date) > today,
        };
      }),
    [today, weekStart],
  );

  const { data: rawLogs, loading } = useCachedQuery(
    `tasks:logs:${toDateStr(weekStart)}:${refreshKey}`,
    () =>
      workApi.listMyWorkLogs({
        date_from: toDateStr(weekStart),
        date_to: toDateStr(addDays(weekStart, 6)),
      }),
    { ttlMs: 1000 * 60, storage: "memory" },
  );
  const logs = rawLogs ?? [];

  const refresh = () => setRefreshKey((value) => value + 1);

  const dayLogs = logs.filter((log) => String(log.log_date).slice(0, 10) === selectedDate);
  const isToday = selectedDate === today;
  const hasDrafts = dayLogs.some((log) => getLogStatus(log) === "draft");
  const hasSubmitted = dayLogs.some((log) => getLogStatus(log) !== "draft");
  const needsLog = isToday && !hasSubmitted && dayLogs.length === 0;

  const handleSubmitAll = async () => {
    const drafts = dayLogs.filter((log) => getLogStatus(log) === "draft");
    if (!drafts.length) return;

    setSubmitting(true);
    try {
      await Promise.all(drafts.map((log) => workApi.submitWorkLog(log.id)));
      showToast({ message: "Daily log submitted.", tone: "success" });
      refresh();
    } catch {
      showToast({ message: "Unable to submit log.", tone: "danger" });
    } finally {
      setSubmitting(false);
    }
  };

  const canGoNext = toDateStr(addDays(weekStart, 7)) <= today;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <Button size="sm" variant="ghost" onClick={() => setWeekStart((value) => addDays(value, -7))}>◀</Button>
        <div className="text-sm font-medium text-gray-700">
          Week of {weekStart.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            if (canGoNext) setWeekStart((value) => addDays(value, 7));
          }}
          disabled={!canGoNext}
        >
          ▶
        </Button>
      </div>

      <div className="flex gap-1 mb-4 overflow-x-auto pb-1">
        {weekDays.map((day) => {
          const dayHasLogs = logs.some((log) => String(log.log_date).slice(0, 10) === day.key);
          return (
            <button
              key={day.key}
              type="button"
              disabled={day.isFuture}
              onClick={() => setSelectedDate(day.key)}
              className={[
                "flex-1 min-w-[60px] rounded py-2 text-xs text-center transition-colors",
                selectedDate === day.key
                  ? "bg-blue-600 text-white"
                  : day.isFuture
                    ? "text-gray-300 cursor-not-allowed"
                    : "hover:bg-gray-100 text-gray-600",
              ].join(" ")}
            >
              {day.label}
              {dayHasLogs && selectedDate !== day.key && (
                <div className="mx-auto mt-1 h-1 w-1 rounded-full bg-green-400" />
              )}
            </button>
          );
        })}
      </div>

      {needsLog && (
        <button
          type="button"
          className="w-full mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 text-left hover:bg-amber-100"
          onClick={() => setSlideOver({ editing: null })}
        >
          ⚠ Clockout pending — log your day to complete it
        </button>
      )}

      {loading && !logs.length && (
        <div className="text-sm text-gray-400 py-6 text-center">Loading…</div>
      )}

      {!loading && !dayLogs.length && !needsLog && (
        <EmptyState
          title={isToday ? "Nothing logged yet today" : "No entries for this day"}
          description={isToday ? "Add your first entry for today." : "Try another day in this week."}
        />
      )}

      <div className="space-y-3 mb-4">
        {dayLogs.map((log) => {
          const status = getLogStatus(log);
          const isRejected = status === "rejected";
          const isEditable = isToday && (status === "draft" || status === "rejected");

          return (
            <div key={log.id} className="rounded-lg border border-gray-200 bg-white p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">
                    {log.work_item?.title ?? "Unknown task"}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">{log.note ?? log.notes ?? ""}</div>
                  {log.hours_spent != null && (
                    <div className="text-xs text-gray-400 mt-1">{log.hours_spent}h</div>
                  )}
                  {isRejected && (log.rejection_note || log.blocker_note) && (
                    <div className="mt-2 text-xs text-red-600 bg-red-50 rounded px-2 py-1">
                      Rejected: {log.rejection_note || log.blocker_note}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Chip variant={LOG_STATUS_VARIANT[status] ?? "neutral"}>
                    {LOG_STATUS_LABEL[status] ?? status}
                  </Chip>
                  {isEditable && (
                    <Button size="sm" variant="ghost" onClick={() => setSlideOver({ editing: log })}>
                      Edit
                    </Button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {isToday && (
        <div className="flex justify-end gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              onPreselectedConsumed?.();
              setSlideOver({ editing: null });
            }}
          >
            + Add Entry
          </Button>
          {hasDrafts && (
            <Button
              size="sm"
              variant="primary"
              onClick={() => void handleSubmitAll()}
              disabled={submitting}
            >
              {submitting ? "Submitting…" : "Submit All"}
            </Button>
          )}
        </div>
      )}

      {slideOver !== null && (
        <AddLogEntrySlideOver
          logDate={selectedDate}
          editing={slideOver.editing}
          preselectedTaskId={preselectedTaskId}
          onClose={() => {
            setSlideOver(null);
            onPreselectedConsumed?.();
          }}
          onSaved={() => {
            setSlideOver(null);
            onPreselectedConsumed?.();
            refresh();
          }}
        />
      )}
    </div>
  );
}
