import type { ReactNode } from "react";
import { Button } from "../ui/Button";
import { Icon } from "../ui/Icon";

type FilterBarProps = {
  searchPlaceholder?: string;
  primaryActionLabel?: string;
  secondaryActionLabel?: string;
  children?: ReactNode;
};

export function FilterBar({
  searchPlaceholder = "Search",
  primaryActionLabel,
  secondaryActionLabel,
  children,
}: FilterBarProps) {
  return (
    <div className="shell-panel flex flex-col gap-4 px-4 py-4 sm:px-5 lg:flex-row lg:items-center lg:justify-between">
      <div className="relative flex-1">
        <label className="sr-only" htmlFor="filter-search">
          Search
        </label>
        <Icon
          name="search"
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
        />
        <input
          id="filter-search"
          className="input-base h-11 pl-11"
          placeholder={searchPlaceholder}
          type="search"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {children}
        {secondaryActionLabel ? (
          <Button variant="secondary" size="sm">
            {secondaryActionLabel}
          </Button>
        ) : null}
        {primaryActionLabel ? (
          <Button size="sm">{primaryActionLabel}</Button>
        ) : null}
      </div>
    </div>
  );
}
