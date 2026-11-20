export function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-neutral-100 bg-neutral-50 px-4 py-3">
      <p className="text-xs font-medium text-neutral-500">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold text-neutral-900">
        {value || "-"}
      </p>
    </div>
  );
}