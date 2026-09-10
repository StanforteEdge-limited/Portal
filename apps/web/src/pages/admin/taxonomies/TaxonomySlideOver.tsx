import { useState } from "react";
import { Button, SectionCard, TextField, SelectField, useToast } from "@/shared";
import { SlideOver, SlideOverHeader, SlideOverContent, SlideOverFooter } from "@/shared/components/ui/SlideOver";
import {
  createTaxonomy,
  updateTaxonomy,
  syncTaxonomyTerms,
  type ManagedTaxonomy,
} from "@/pages/requests/taxonomy-api";

type Props = {
  taxonomy?: ManagedTaxonomy | null;
  onClose: () => void;
  onSaved: () => void;
};

export default function TaxonomySlideOver({ taxonomy, onClose, onSaved }: Props) {
  const { showToast } = useToast();
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState(taxonomy?.name || "");
  const [key, setKey] = useState(taxonomy?.key || "");
  const [description, setDescription] = useState(taxonomy?.description || "");
  const [renderType, setRenderType] = useState(taxonomy?.renderType || "select");
  const [isActive, setIsActive] = useState(taxonomy?.is_active ?? true);
  const [terms, setTerms] = useState<string[]>(() => (taxonomy?.terms ?? []).map((t) => t.label));
  const [newTerm, setNewTerm] = useState("");

  const keyFromName = (n: string) =>
    n.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");

  function handleNameChange(value: string) {
    setName(value);
    if (!taxonomy) {
      setKey(keyFromName(value));
    }
  }

  function addTerm() {
    const trimmed = newTerm.trim();
    if (trimmed && !terms.includes(trimmed)) {
      setTerms((prev) => [...prev, trimmed]);
    }
    setNewTerm("");
  }

  function removeTerm(label: string) {
    setTerms((prev) => prev.filter((t) => t !== label));
  }

  async function handleSubmit() {
    if (!name.trim()) {
      showToast({ tone: "warning", title: "Name required", message: "Please enter a taxonomy name." });
      return;
    }
    if (!(key.trim() || taxonomy)) {
      showToast({ tone: "warning", title: "Key required", message: "Please enter a taxonomy key." });
      return;
    }

    try {
      setSaving(true);

      let id = taxonomy?.id ?? "";

      if (taxonomy) {
        const res = await updateTaxonomy(taxonomy.id, {
          name: name.trim(),
          key: key.trim() || undefined,
          description: description.trim() || undefined,
          render_type: renderType,
          is_active: isActive,
        });
      } else {
        const res = await createTaxonomy({
          name: name.trim(),
          key: key.trim(),
          description: description.trim() || undefined,
          render_type: renderType,
        });
        id = String((res as any)?.data?.id ?? "");
      }

      if (id) {
        await syncTaxonomyTerms(id, terms);
      }

      showToast({
        tone: "success",
        title: taxonomy ? "Updated" : "Created",
        message: `${name} has been ${taxonomy ? "updated" : "created"}.`,
      });
      onSaved();
    } catch (err) {
      const message =
        err instanceof Error
          ? (err as any).response?.message ||
            (err as any).message
          : "Unable to save taxonomy.";
      showToast({
        tone: "danger",
        title: "Save failed",
        message,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <SlideOver open={true} onClose={onClose} size="md">
      <SlideOverHeader
        title={taxonomy ? "Edit Taxonomy" : "Add Taxonomy"}
        subtitle={taxonomy ? taxonomy.name : "New Taxonomy"}
        onClose={onClose}
      />
      <SlideOverContent>
        <SectionCard title="Basic Info">
          <div className="grid gap-4">
            <TextField
              label="Name"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="e.g., Equipment Categories"
            />
            <TextField
              label="Key"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="e.g., equipment_categories"
              disabled={!!taxonomy}
              helpText="Auto-generated from name if left empty"
            />
            <TextField
              label="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description"
            />
            <SelectField
              label="Render Type"
              value={renderType}
              onChange={(e) => setRenderType(e.target.value)}
            >
              <option value="select">Select</option>
              <option value="tags">Tags</option>
            </SelectField>
            <div className="flex items-center gap-3 pt-2">
              <input
                type="checkbox"
                id="is_active"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300"
              />
              <label htmlFor="is_active" className="text-sm text-slate-700">
                Active
              </label>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Terms">
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {terms.map((term) => (
                <span
                  key={term}
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 rounded-full text-sm"
                >
                  {term}
                  <button
                    type="button"
                    onClick={() => removeTerm(term)}
                    className="text-slate-400 hover:text-slate-700 leading-none"
                  >
                    &times;
                  </button>
                </span>
              ))}
              {terms.length === 0 && (
                <span className="text-sm text-slate-400">No terms defined.</span>
              )}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newTerm}
                onChange={(e) => setNewTerm(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTerm(); } }}
                placeholder="Type a term and press Add..."
                className="flex-1 rounded-[12px] border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
              />
              <Button variant="ghost" onClick={addTerm} disabled={!newTerm.trim()}>
                Add
              </Button>
            </div>
          </div>
        </SectionCard>
      </SlideOverContent>
      <SlideOverFooter>
        <Button onClick={() => void handleSubmit()} disabled={saving}>
          {saving ? "Saving..." : taxonomy ? "Update Taxonomy" : "Create Taxonomy"}
        </Button>
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
      </SlideOverFooter>
    </SlideOver>
  );
}
