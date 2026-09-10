import { useMemo, useState } from "react";
import { Button, Chip, EmptyState } from "@/shared";
import { useCachedQuery, workApi } from "@/shared/lib/core";
import type { WorkItem, WorkItemStatus } from "@stanforte/shared";
import TaskDetailSlideOver from "./TaskDetailSlideOver";
import NewPersonalTaskSlideOver from "./NewPersonalTaskSlideOver";

type Props = {
  onLogToday: (item: WorkItem) => void;
};

type FilterType = "all" | "assigned" | "personal";

const STATUS_ORDER: WorkItemStatus[] = ["in_progress", "planned", "blocked"];

const STATUS_LABEL: Record<string, string> = {
  in_progress: "In Progress",
  planned: "Planned",
  blocked: "Blocked",
};

const FILTER_BUTTONS: { key: FilterType; label: string }[] = [
  { key: "all", label: "All" },
  { key: "assigned", label: "Assigned to me" },
  { key: "personal", label: "Personal" },
];

function TaskCard({ item, onClick }: { item: WorkItem; onClick: () => void }) {
  const isPersonal = item.is_staff_added === true;
  const source = isPersonal ? "Personal" : (item.owner_team?.name ?? "Assigned");

  return (
    <button
      type="button"
      className="w-full rounded-lg border border-gray-200 bg-white p-3 text-left hover:border-blue-200 hover:bg-blue-50/30 transition-colors"
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="font-medium truncate">{item.title}</div>
          <div className="text-xs text-gray-400 mt-0.5">{source}</div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {item.due_date && (
            <span className="text-xs text-gray-400">{String(item.due_date).slice(0, 10)}</span>
          )}
          <Chip variant={item.priority === "high" || item.priority === "critical" ? "danger" : "neutral"}>
            {String(item.priority)}
          </Chip>
          <span className="text-gray-300">→</span>
        </div>
      </div>
    </button>
  );
}

export default function MyTasksTab({ onLogToday }: Props) {
  const [filter, setFilter] = useState<FilterType>("all");
  const [showCompleted, setShowCompleted] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [selected, setSelected] = useState<WorkItem | null>(null);
  const [showNew, setShowNew] = useState(false);

  const { data: rawItems, loading } = useCachedQuery(
    `tasks:my:${refreshKey}`,
    () => workApi.listMyWorkItems(),
    { ttlMs: 1000 * 60, storage: "memory" },
  );
  const items = rawItems ?? [];

  const refresh = () => setRefreshKey((k) => k + 1);

  const filtered = useMemo(() => {
    if (filter === "assigned") return items.filter((item) => !item.is_staff_added);
    if (filter === "personal") return items.filter((item) => item.is_staff_added);
    return items;
  }, [items, filter]);

  const active = useMemo(
    () => STATUS_ORDER.flatMap((status) => filtered.filter((item) => item.status === status)),
    [filtered],
  );

  const completed = useMemo(
    () => filtered.filter((item) => item.status === "completed" || item.status === "cancelled" || item.status === "carried_over"),
    [filtered],
  );

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <div className="flex gap-2">
          {FILTER_BUTTONS.map((button) => (
            <Button
              key={button.key}
              size="sm"
              variant={filter === button.key ? "primary" : "ghost"}
              onClick={() => setFilter(button.key)}
            >
              {button.label}
            </Button>
          ))}
        </div>
        <Button size="sm" variant="primary" onClick={() => setShowNew(true)}>
          + New Task
        </Button>
      </div>

      {loading && !items.length && (
        <div className="text-sm text-gray-400 py-8 text-center">Loading tasks…</div>
      )}

      {!loading && !active.length && !completed.length && (
        <EmptyState
          title="No tasks yet"
          description="Create a personal task or wait for assignments."
        />
      )}

      <div className="space-y-1">
        {STATUS_ORDER.map((status) => {
          const group = active.filter((item) => item.status === status);
          if (!group.length) return null;

          return (
            <div key={status}>
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mt-4 mb-2">
                ● {STATUS_LABEL[status]}
              </div>
              <div className="space-y-2">
                {group.map((item) => (
                  <TaskCard key={item.id} item={item} onClick={() => setSelected(item)} />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {completed.length > 0 && (
        <div className="mt-4">
          <button
            type="button"
            className="text-sm text-gray-400 hover:text-gray-600"
            onClick={() => setShowCompleted((value) => !value)}
          >
            {showCompleted ? "▲ Hide" : "▼ Show"} {completed.length} completed
          </button>
          {showCompleted && (
            <div className="mt-2 space-y-2">
              {completed.map((item) => (
                <TaskCard key={item.id} item={item} onClick={() => setSelected(item)} />
              ))}
            </div>
          )}
        </div>
      )}

      {selected && (
        <TaskDetailSlideOver
          item={selected}
          onClose={() => setSelected(null)}
          onUpdated={() => {
            setSelected(null);
            refresh();
          }}
          onLogToday={(item) => {
            setSelected(null);
            onLogToday(item);
          }}
        />
      )}

      {showNew && (
        <NewPersonalTaskSlideOver
          onClose={() => setShowNew(false)}
          onSaved={() => {
            setShowNew(false);
            refresh();
          }}
        />
      )}
    </div>
  );
}
