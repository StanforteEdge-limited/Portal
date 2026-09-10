import { useState } from "react";
import { Button, Chip, SelectField, useToast } from "@/shared";
import { SlideOver, SlideOverHeader, SlideOverContent, SlideOverFooter } from "@/shared/components/ui/SlideOver";
import { workApi } from "@/shared/lib/core";
import type { WorkItem, WorkItemStatus } from "@stanforte/shared";

type Props = {
  item: WorkItem;
  onClose: () => void;
  onUpdated: () => void;
  onLogToday: (item: WorkItem) => void;
};

const STATUS_OPTIONS: { value: WorkItemStatus; label: string }[] = [
  { value: "planned", label: "Planned" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "blocked", label: "Blocked" },
];

const STATUS_VARIANT: Record<string, "success" | "warning" | "danger" | "neutral"> = {
  planned: "neutral",
  in_progress: "warning",
  completed: "success",
  blocked: "danger",
  carried_over: "neutral",
  cancelled: "danger",
};

export default function TaskDetailSlideOver({ item, onClose, onUpdated, onLogToday }: Props) {
  const { showToast } = useToast();
  const [status, setStatus] = useState<WorkItemStatus>(item.status);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (status === item.status) {
      onClose();
      return;
    }

    setSaving(true);
    try {
      await workApi.updateWorkItem(item.id, { status });
      showToast({ message: "Status updated.", tone: "success" });
      onUpdated();
    } catch {
      showToast({ message: "Unable to update status.", tone: "danger" });
    } finally {
      setSaving(false);
    }
  };

  const isPersonal = item.is_staff_added === true;
  const source = isPersonal ? "Personal" : (item.owner_team?.name ?? "Assigned");

  return (
    <SlideOver open={true} onClose={onClose}>
      <SlideOverHeader title={item.title} onClose={onClose} />
      <SlideOverContent>
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <Chip variant={STATUS_VARIANT[item.status] ?? "neutral"}>
              {String(item.status).replace(/_/g, " ")}
            </Chip>
            <span className="text-sm text-gray-400">{source}</span>
          </div>

          {item.description && (
            <p className="text-sm text-gray-600">{item.description}</p>
          )}

          <div className="grid grid-cols-2 gap-3 text-sm">
            {item.due_date && (
              <div>
                <div className="text-xs text-gray-400 mb-1">Due date</div>
                <div>{String(item.due_date).slice(0, 10)}</div>
              </div>
            )}
            <div>
              <div className="text-xs text-gray-400 mb-1">Priority</div>
              <div className="capitalize">{item.priority}</div>
            </div>
          </div>

          <SelectField
            label="Update status"
            value={status}
            onChange={(e) => setStatus(e.target.value as WorkItemStatus)}
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </SelectField>
        </div>
      </SlideOverContent>
      <SlideOverFooter>
        <Button variant="ghost" onClick={onClose} disabled={saving}>Cancel</Button>
        <Button variant="ghost" onClick={() => { onLogToday(item); onClose(); }}>
          Log today
        </Button>
        <Button variant="primary" onClick={() => void handleSave()} disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </Button>
      </SlideOverFooter>
    </SlideOver>
  );
}
