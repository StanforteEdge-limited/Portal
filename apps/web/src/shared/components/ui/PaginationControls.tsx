import { useMemo } from "react";
import { Button } from "./Button";
import { SelectField } from "./fields";

type PaginationControlsProps = {
  page: number;
  totalPages: number;
  totalCount: number;
  itemLabel?: string;
  perPage?: number;
  perPageOptions?: number[];
  showStatus?: boolean;
  onPerPageChange?: (value: number) => void;
  onPageChange: (value: number) => void;
};

export function PaginationControls({
  page,
  totalPages,
  totalCount,
  itemLabel = "item",
  perPage,
  perPageOptions = [10, 20, 50, 100],
  showStatus = true,
  onPerPageChange,
  onPageChange,
}: PaginationControlsProps) {
  const safePerPage =
    typeof perPage === "number" && perPage > 0
      ? perPage
      : perPageOptions[0] || 10;
  const derivedTotalPages = Math.max(1, Math.ceil(Math.max(0, totalCount) / safePerPage));
  const safeTotalPages = Math.max(1, totalPages, derivedTotalPages);
  const safePage = Math.min(Math.max(1, page), safeTotalPages);
  const rangeStart = totalCount > 0 ? (safePage - 1) * safePerPage + 1 : 0;
  const rangeEnd = totalCount > 0 ? Math.min(totalCount, safePage * safePerPage) : 0;

  const visiblePages = useMemo(() => {
    if (safeTotalPages <= 7) {
      return Array.from({ length: safeTotalPages }, (_, index) => index + 1);
    }

    const pages = new Set<number>([1, safeTotalPages, safePage, safePage - 1, safePage + 1]);
    for (let candidate = safePage - 2; candidate <= safePage + 2; candidate += 1) {
      if (candidate > 1 && candidate < safeTotalPages) pages.add(candidate);
    }
    return Array.from(pages)
      .filter((value) => value >= 1 && value <= safeTotalPages)
      .sort((left, right) => left - right);
  }, [safePage, safeTotalPages]);

  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
      {onPerPageChange && typeof perPage === "number" ? (
        <SelectField
          label="Per Page"
          value={String(perPage)}
          onChange={(event) => onPerPageChange(Number(event.target.value) || perPageOptions[0])}
          className="min-w-[110px] flex-1 lg:flex-none"
        >
          {perPageOptions.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </SelectField>
      ) : (
        <div />
      )}

      {showStatus ? (
        <p className="text-sm text-slate-500">
          Page {safePage} of {safeTotalPages} • Showing {rangeStart}-{rangeEnd} of {totalCount} {itemLabel}
          {totalCount === 1 ? "" : "s"}
        </p>
      ) : (
        <div />
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onPageChange(1)}
          disabled={safePage <= 1}
        >
          {'<<'}
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onPageChange(Math.max(1, safePage - 1))}
          disabled={safePage <= 1}
        >
          {'<'}
        </Button>
        {visiblePages.map((pageNumber, index) => {
          const previous = visiblePages[index - 1];
          const showGap = typeof previous === "number" && pageNumber - previous > 1;
          return (
            <span key={`page-chip-${pageNumber}`} className="inline-flex items-center gap-2">
              {showGap ? <span className="px-1 text-sm text-slate-400">...</span> : null}
              <Button
                variant={pageNumber === safePage ? "primary" : "secondary"}
                size="sm"
                onClick={() => onPageChange(pageNumber)}
                disabled={pageNumber === safePage}
              >
                {pageNumber}
              </Button>
            </span>
          );
        })}
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onPageChange(Math.min(safeTotalPages, safePage + 1))}
          disabled={safePage >= safeTotalPages}
        >
          {'>'}
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onPageChange(safeTotalPages)}
          disabled={safePage >= safeTotalPages}
        >
          {'>>'}
        </Button>
      </div>
    </div>
  );
}
