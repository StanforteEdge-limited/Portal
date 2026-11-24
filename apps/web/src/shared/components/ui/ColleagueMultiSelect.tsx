import { useMemo, useState } from "react";
import { Check, Search, X } from "lucide-react";
import type { TaskAssignee } from "@/pages/tasks/types";

interface ColleagueMultiSelectProps {
  colleagues: TaskAssignee[];
  selectedIds: string[];
  onChange: (nextIds: string[]) => void;
  placeholder?: string;
  emptyLabel?: string;
  maxVisible?: number;
}

export function ColleagueMultiSelect({
  colleagues,
  selectedIds,
  onChange,
  placeholder = "Search staff by name, email, or role...",
  emptyLabel = "No matching staff found.",
  maxVisible = 25,
}: ColleagueMultiSelectProps) {
  const [query, setQuery] = useState("");

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const selectedColleagues = useMemo(
    () => colleagues.filter((c) => selectedSet.has(c.id)),
    [colleagues, selectedSet],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return colleagues;
    return colleagues.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.email && c.email.toLowerCase().includes(q)) ||
        (c.role && c.role.toLowerCase().includes(q)),
    );
  }, [colleagues, query]);

  const visible = filtered.slice(0, maxVisible);
  const hiddenCount = Math.max(0, filtered.length - visible.length);

  const toggle = (id: string) => {
    if (selectedSet.has(id)) {
      onChange(selectedIds.filter((item) => item !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  return (
    <div className="space-y-2">
      {/* Selected chips */}
      {selectedColleagues.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {selectedColleagues.map((member) => (
            <span
              key={member.id}
              className="inline-flex items-center gap-1.5 pl-1.5 pr-2 py-0.5 rounded-full bg-orange-50 border border-[#ff6900]/30 text-xs font-medium text-neutral-900"
            >
              <span className="w-4 h-4 rounded-full bg-[#ff6900] text-white text-[10px] font-semibold flex items-center justify-center shrink-0">
                {member.avatar || member.name.slice(0, 2).toUpperCase()}
              </span>
              <span className="max-w-[140px] truncate">{member.name}</span>
              <button
                type="button"
                onClick={() => toggle(member.id)}
                className="text-neutral-500 hover:text-neutral-900 transition-colors"
                aria-label={`Remove ${member.name}`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          {selectedColleagues.length > 1 && (
            <button
              type="button"
              onClick={() => onChange([])}
              className="text-[11px] font-medium text-neutral-500 hover:text-rose-600 px-1.5 py-0.5 transition-colors"
            >
              Clear all
            </button>
          )}
        </div>
      )}

      {/* Search box */}
      <div className="relative">
        <Search className="h-3.5 w-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="w-full pl-8 pr-8 py-2 text-xs bg-white border border-neutral-200 rounded-xl text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-[#ff6900] focus:ring-1 focus:ring-[#ff6900]"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700"
            aria-label="Clear search"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Filtered selectable list */}
      <div className="max-h-48 overflow-y-auto rounded-xl border border-neutral-200 bg-neutral-50/50 divide-y divide-neutral-100">
        {visible.length === 0 ? (
          <p className="text-xs text-neutral-400 text-center py-4 px-3">{emptyLabel}</p>
        ) : (
          visible.map((member) => {
            const isSelected = selectedSet.has(member.id);
            return (
              <button
                key={member.id}
                type="button"
                onClick={() => toggle(member.id)}
                className={`w-full flex items-center justify-between gap-2.5 px-3 py-2 text-left transition-colors ${
                  isSelected
                    ? "bg-orange-50/80 text-neutral-900"
                    : "bg-white hover:bg-neutral-50 text-neutral-700"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={`w-7 h-7 rounded-full text-white text-[11px] font-semibold flex items-center justify-center shrink-0 ${
                      isSelected ? "bg-[#ff6900]" : "bg-neutral-800"
                    }`}
                  >
                    {member.avatar || member.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-medium text-neutral-900 truncate">{member.name}</div>
                    <div className="text-[11px] text-neutral-500 truncate">
                      {[member.role, member.email].filter(Boolean).join(" • ")}
                    </div>
                  </div>
                </div>
                <span
                  className={`w-4.5 h-4.5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                    isSelected
                      ? "bg-[#ff6900] border-[#ff6900] text-white"
                      : "border-neutral-300 bg-white"
                  }`}
                >
                  {isSelected && <Check className="h-3 w-3" strokeWidth={2.5} />}
                </span>
              </button>
            );
          })
        )}
        {hiddenCount > 0 && (
          <div className="px-3 py-2 text-[11px] text-neutral-500 bg-neutral-50 text-center">
            Showing {visible.length} of {filtered.length} staff — type a name, email, or role to narrow down
          </div>
        )}
      </div>
    </div>
  );
}
