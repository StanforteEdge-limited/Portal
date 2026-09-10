import { useEffect, useMemo, useState } from "react";
import { Button, Icon } from "@/shared";
import { suggestTagTerms, type TagTerm } from "@/pages/requests/taxonomy-api";

type TagPickerProps = {
  taxonomyKey: string;
  value: TagTerm[];
  onChange: (tags: TagTerm[]) => void;
  placeholder?: string;
  label?: string;
};

export function TagPicker({
  taxonomyKey,
  value,
  onChange,
  placeholder = "Add tags",
  label = "Tags",
}: TagPickerProps) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<TagTerm[]>([]);
  const selectedIds = useMemo(
    () => new Set(value.map((tag) => tag.id)),
    [value],
  );

  useEffect(() => {
    if (!taxonomyKey || !query.trim()) {
      setSuggestions([]);
      return;
    }

    const timer = window.setTimeout(async () => {
      try {
        const rows = await suggestTagTerms(taxonomyKey, query.trim());
        setSuggestions(rows.filter((row: TagTerm) => !selectedIds.has(row.id)));
      } catch {
        setSuggestions([]);
      }
    }, 180);

    return () => window.clearTimeout(timer);
  }, [query, selectedIds, taxonomyKey]);

  function addTag(tag: TagTerm) {
    if (selectedIds.has(tag.id)) return;
    onChange([...value, tag]);
    setQuery("");
    setSuggestions([]);
  }

  function addCustomTag() {
    const label = query.trim();
    if (!label) return;
    const normalized = label.toLowerCase();
    if (value.some((tag) => tag.label.toLowerCase() === normalized)) {
      setQuery("");
      return;
    }

    onChange([
      ...value,
      {
        id: `new:${normalized}`,
        value:
          normalized.replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") ||
          "tag",
        label,
      },
    ]);
    setQuery("");
    setSuggestions([]);
  }

  return (
    <div className="space-y-3">
      <span className="field-label">{label}</span>
      <div className="flex flex-wrap gap-2">
        {value.map((tag) => (
          <span
            key={tag.id}
            className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700"
          >
            {tag.label}
            <button
              type="button"
              className="text-slate-500 transition hover:text-slate-900 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-900/10"
              aria-label={`Remove tag ${tag.label}`}
              onClick={() =>
                onChange(value.filter((item) => item.id !== tag.id))
              }
            >
              <Icon name="close" className="text-[14px]" />
            </button>
          </span>
        ))}
      </div>

      <input
        type="text"
        value={query}
        className="input-base"
        placeholder={placeholder}
        aria-label={label}
        onChange={(event) => setQuery(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === ",") {
            event.preventDefault();
            addCustomTag();
          }
        }}
      />

      {query.trim() ? (
        <div
          className="rounded-[20px] border border-slate-200 bg-white p-2 shadow-soft"
          role="listbox"
          aria-label={`${label} suggestions`}
        >
          <Button
            type="button"
            variant="ghost"
            className="w-full justify-between rounded-2xl px-3 py-2 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-900/10"
            onClick={addCustomTag}
          >
            <span>Create tag "{query.trim()}"</span>
            <Icon name="add" className="text-[18px]" />
          </Button>
          {suggestions.map((item) => (
            <button
              key={item.id}
              type="button"
              className="flex w-full items-center justify-between rounded-2xl px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-900/10"
              onClick={() => addTag(item)}
              role="option"
              aria-selected="false"
            >
              <span>{item.label}</span>
              <Icon name="sell" className="text-[18px] text-slate-400" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
