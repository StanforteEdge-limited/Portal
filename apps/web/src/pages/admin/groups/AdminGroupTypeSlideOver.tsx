import { useState } from "react";
import { useToast } from "@/shared";
import {
  SlideOver,
  SlideOverHeader,
  SlideOverContent,
  SlideOverFooter,
} from "@/shared/components/ui/SlideOver";
import { FolderTree, Check } from "lucide-react";

type Props = {
  type: { id: string; name: string; slug: string; description: string } | null;
  onClose: () => void;
  onSaved: (type: { id: string; name: string; slug: string; description: string }) => void;
};

export default function AdminGroupTypeSlideOver({ type, onClose, onSaved }: Props) {
  const { showToast } = useToast();
  const [name, setName] = useState(type?.name || "");
  const [slug, setSlug] = useState(type?.slug || "");
  const [description, setDescription] = useState(type?.description || "");

  const slugFromName = (n: string) =>
    n.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");

  function handleNameChange(value: string) {
    setName(value);
    if (!type?.id) {
      setSlug(slugFromName(value));
    }
  }

  function handleSubmit(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!name.trim()) {
      showToast("Please enter a classification type name.", "error");
      return;
    }
    const finalSlug = slug.trim() || slugFromName(name.trim());
    onSaved({
      id: type?.id || finalSlug,
      name: name.trim(),
      slug: finalSlug,
      description: description.trim(),
    });
    showToast(`Type "${name.trim()}" saved.`, "success");
  }

  return (
    <SlideOver isOpen onClose={onClose} size="md">
      <SlideOverHeader
        title={type?.id ? "Edit Classification Type" : "Add Classification Type"}
        subtitle="Group types organize your teams into functional categories like Departments or Squads."
        onClose={onClose}
      />

      <form onSubmit={handleSubmit} className="flex-1 flex flex-col justify-between overflow-y-auto">
        <SlideOverContent className="space-y-4 p-6">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100 text-xs font-bold text-slate-900 uppercase tracking-wider">
            <FolderTree className="h-4 w-4 text-[#ff6900]" />
            Type Attributes
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Type Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="e.g., Department, Tribe, Squad"
              required
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#ff6900]/20 focus:border-[#ff6900]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Slug Identifier
            </label>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="e.g., department"
              disabled={!!type?.id}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-mono text-slate-800 placeholder-slate-400 disabled:bg-slate-50 disabled:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#ff6900]/20 focus:border-[#ff6900]"
            />
            {!type?.id && (
              <p className="text-[11px] text-slate-400 mt-1">
                Auto-generated system identifier used for taxonomy queries.
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Explain the functional purpose of this group type..."
              rows={3}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#ff6900]/20 focus:border-[#ff6900]"
            />
          </div>
        </SlideOverContent>

        <SlideOverFooter className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-semibold text-xs hover:bg-white transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-5 py-2 rounded-xl bg-[#ff6900] hover:bg-[#ea580c] text-white font-bold text-xs shadow-sm shadow-orange-500/20 transition flex items-center gap-2"
          >
            <Check className="h-4 w-4" />
            <span>{type?.id ? "Update Type" : "Create Type"}</span>
          </button>
        </SlideOverFooter>
      </form>
    </SlideOver>
  );
}
