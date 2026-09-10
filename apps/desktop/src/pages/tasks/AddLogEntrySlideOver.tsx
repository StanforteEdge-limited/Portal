import { useState } from "react";
import { Button, SelectField, TextField, useToast } from "@/shared";
import { SlideOver, SlideOverHeader, SlideOverContent, SlideOverFooter } from "@/shared/components/ui/SlideOver";
import { useCachedQuery, workApi } from "@/shared/lib/core";
import type { WorkLog, CreateWorkLogDto } from "@stanforte/shared";

type Props = {
  logDate: string;
  editing: WorkLog | null;
  preselectedTaskId?: string;
  onClose: () => void;
  onSaved: () => void;
};

type Form = {
  work_item_id: string;
  note: string;
  hours_spent: string;
};

export default function AddLogEntrySlideOver({ logDate, editing, preselectedTaskId, onClose, onSaved }: Props) {
  const { showToast } = useToast();
  const [form, setForm] = useState<Form>({
    work_item_id: editing?.work_item?.id ?? preselectedTaskId ?? "",
    note: editing?.note ?? "",
    hours_spent: editing?.hours_spent ? String(editing.hours_spent) : "",
  });
  const [saving, setSaving] = useState(false);

  const set = (patch: Partial<Form>) => setForm((prev) => ({ ...prev, ...patch }));

  const { data: rawTasks } = useCachedQuery(
    "tasks:my:for-log",
    () => workApi.listMyWorkItems(),
    { ttlMs: 1000 * 60 * 5, storage: "memory" },
  );
  const tasks = rawTasks ?? [];

  const handleSave = async () => {
    if (!form.work_item_id) {
      showToast({ message: "Select a task.", tone: "danger" });
      return;
    }
    if (!form.note.trim()) {
      showToast({ message: "Notes are required.", tone: "danger" });
      return;
    }

    const parsedHours = form.hours_spent.trim() === "" ? undefined : Number(form.hours_spent);
    if (parsedHours != null) {
      if (!Number.isFinite(parsedHours) || parsedHours < 0) {
        showToast({ message: "Hours must be a valid number.", tone: "danger" });
        return;
      }
      if (parsedHours > 24) {
        showToast({ message: "Hours cannot be greater than 24.", tone: "danger" });
        return;
      }
    }

    setSaving(true);
    try {
      const dto: CreateWorkLogDto = {
        work_item_id: form.work_item_id,
        log_date: logDate,
        note: form.note,
        hours_spent: parsedHours,
      };

      if (editing) {
        await workApi.updateWorkLog(editing.id, dto);
      } else {
        await workApi.createWorkLog(dto);
      }

      showToast({ message: editing ? "Entry updated." : "Entry added.", tone: "success" });
      onSaved();
    } catch {
      showToast({ message: "Unable to save entry.", tone: "danger" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <SlideOver open={true} onClose={onClose}>
      <SlideOverHeader title={editing ? "Edit Log Entry" : "Add Log Entry"} onClose={onClose} />
      <SlideOverContent>
        <div className="flex flex-col gap-4">
          <SelectField
            label="Task"
            value={form.work_item_id}
            onChange={(e) => set({ work_item_id: e.target.value })}
          >
            <option value="">Select a task…</option>
            {tasks.map((task) => (
              <option key={task.id} value={task.id}>{task.title}</option>
            ))}
          </SelectField>
          <TextField
            label="Notes (what did you do?)"
            value={form.note}
            onChange={(e) => set({ note: e.target.value })}
          />
          <TextField
            label="Hours (optional)"
            type="number"
            min={0}
            max={24}
            step="0.25"
            value={form.hours_spent}
            onChange={(e) => set({ hours_spent: e.target.value })}
          />
          <p className="text-xs text-gray-400">Logging for: {logDate}</p>
        </div>
      </SlideOverContent>
      <SlideOverFooter>
        <Button variant="ghost" onClick={onClose} disabled={saving}>Cancel</Button>
        <Button variant="primary" onClick={() => void handleSave()} disabled={saving}>
          {saving ? "Saving…" : editing ? "Update" : "Add Entry"}
        </Button>
      </SlideOverFooter>
    </SlideOver>
  );
}
