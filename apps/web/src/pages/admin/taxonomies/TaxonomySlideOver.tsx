import { useState } from "react";
import { useToast } from "@/shared";
import {
  SlideOver,
  SlideOverHeader,
  SlideOverContent,
  SlideOverFooter,
} from "@/shared/components/ui/SlideOver";
import {
  createTaxonomy,
  updateTaxonomy,
  syncTaxonomyTerms,
  type ManagedTaxonomy,
} from "@/pages/requests/taxonomy-api";
import { Tags, Plus, X, Check } from "lucide-react";

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

  async function handleSubmit(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!name.trim()) {
      showToast("Please enter a taxonomy name.", "error");
      return;
    }
    if (!(key.trim() || taxonomy)) {
      showToast("Please enter a taxonomy key.", "error");
      return;
    }

    try {
      setSaving(true);
      let id = taxonomy?.id ?? "";

      if (taxonomy) {
        await updateTaxonomy(taxonomy.id, {
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

      showToast(`Taxonomy "${name}" saved successfully.`, "success");
      onSaved();
    } catch (err: any) {
      showToast(err?.message || "Failed to save taxonomy.", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <SlideOver isOpen onClose={onClose} size="md">
      <SlideOverHeader
        title={taxonomy ? "Edit Taxonomy" : "Create Taxonomy Definition"}
        subtitle="Custom classification vocabularies and select values for requests."
        onClose={onClose}
      />

      <form onSubmit={handleSubmit} className="flex-1 flex flex-col justify-between overflow-y-auto">
        <SlideOverContent className="space-y-6 p-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100 text-xs font-bold text-slate-900 uppercase tracking-wider">
              <Tags className="h-4 w-4 text-[#ff6900]" />
              Taxonomy Metadata
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Taxonomy Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="e.g., Expense Category"
                required
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#ff6900]/20 focus:border-[#ff6900]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Taxonomy Key
                </label>
                <input
                  type="text"
                  value={key}
                  onChange={(e) => setKey(e.target.value)}
                  placeholder="e.g., expense_category"
                  disabled={!!taxonomy}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-mono text-slate-800 placeholder-slate-400 disabled:bg-slate-50 disabled:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#ff6900]/20 focus:border-[#ff6900]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Render Control
                </label>
                <select
                  value={renderType}
                  onChange={(e) => setRenderType(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#ff6900]/20 focus:border-[#ff6900]"
                >
                  <option value="select">Dropdown Select</option>
                  <option value="radio">Radio Buttons</option>
                  <option value="checkbox">Multi Checkboxes</option>
                  <option value="tag">Pill Badges</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief explanation of how this classification is utilized..."
                rows={2}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#ff6900]/20 focus:border-[#ff6900]"
              />
            </div>
          </div>

          {/* Terms / Values List */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Vocabularies & Option Terms ({terms.length})
              </span>
            </div>

            {/* Add term input */}
            <div className="flex gap-2">
              <input
                type="text"
                value={newTerm}
                onChange={(e) => setNewTerm(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addTerm();
                  }
                }}
                placeholder="Type new option label and press Add..."
                className="flex-1 px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#ff6900]/20 focus:border-[#ff6900]"
              />
              <button
                type="button"
                onClick={addTerm}
                className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 transition"
              >
                <Plus className="h-4 w-4" /> Add
              </button>
            </div>

            {/* Terms pills */}
            <div className="flex flex-wrap gap-2 pt-1 max-h-48 overflow-y-auto">
              {terms.length === 0 ? (
                <span className="text-xs text-slate-400 italic">No option values added yet.</span>
              ) : (
                terms.map((term) => (
                  <span
                    key={term}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-800"
                  >
                    <span>{term}</span>
                    <button
                      type="button"
                      onClick={() => removeTerm(term)}
                      className="hover:text-rose-600 transition"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))
              )}
            </div>
          </div>
        </SlideOverContent>

        <SlideOverFooter className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-semibold text-xs hover:bg-white transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2 rounded-xl bg-[#ff6900] hover:bg-[#ea580c] text-white font-bold text-xs shadow-sm shadow-orange-500/20 transition flex items-center gap-2"
          >
            {saving ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            <span>{taxonomy ? "Update Taxonomy" : "Save Taxonomy"}</span>
          </button>
        </SlideOverFooter>
      </form>
    </SlideOver>
  );
}
