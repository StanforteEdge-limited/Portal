import { useState } from "react";
import { Button, SelectField, TextField, useToast } from "@/shared";
import { SlideOver, SlideOverHeader, SlideOverContent, SlideOverFooter } from "@/shared/components/ui/SlideOver";
import { workApi } from "@/shared/lib/core";
import type { WorkItemPriority } from "@stanforte/shared";

type Props = { onClose: () => void; onSaved: () => void };

type Form = {
  title: string;
  description: string;
  priority: WorkItemPriority;
  due_date: string;
};

const EMPTY: Form = { title: "", description: "", priority: "medium", due_date: "" };

export default function NewPersonalTaskSlideOver({ onClose, onSaved }: Props) {
  const { showToast } = useToast();
  const [form, setForm] = useState<Form>(EMPTY);
  const [saving, setSaving] = useState(false);

  const set = (patch: Partial<Form>) => setForm((prev) => ({ ...prev, ...patch }));

  const handleSave = async () => {
    if (!form.title.trim()) {
      showToast({ message: "Title is required.", tone: "danger" });
      return;
    }

    setSaving(true);
    try {
      await workApi.createWorkItem({
        title: form.title,
        description: form.description || undefined,
        priority: form.priority,
        due_date: form.due_date || undefined,
        item_type: "weekly_task",
        is_staff_added: true,
      });
      showToast({ message: "Task created.", tone: "success" });
      onSaved();
    } catch {
      showToast({ message: "Unable to create task.", tone: "danger" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <SlideOver open={true} onClose={onClose}>
      <SlideOverHeader title="New Personal Task" onClose={onClose} />
      <SlideOverContent>
        <div className="flex flex-col gap-4">
          <TextField label="Title" value={form.title} onChange={(e) => set({ title: e.target.value })} />
          <TextField
            label="Notes"
            value={form.description}
            onChange={(e) => set({ description: e.target.value })}
          />
          <SelectField
            label="Priority"
            value={form.priority}
            onChange={(e) => set({ priority: e.target.value as WorkItemPriority })}
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </SelectField>
          <TextField
            label="Due date (optional)"
            type="date"
            value={form.due_date}
            onChange={(e) => set({ due_date: e.target.value })}
          />
        </div>
      </SlideOverContent>
      <SlideOverFooter>
        <Button variant="ghost" onClick={onClose} disabled={saving}>Cancel</Button>
        <Button variant="primary" onClick={() => void handleSave()} disabled={saving}>
          {saving ? "Saving…" : "Add Task"}
        </Button>
      </SlideOverFooter>
    </SlideOver>
  );
}
