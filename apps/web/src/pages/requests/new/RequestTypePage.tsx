import { useMemo, useState, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { PortalLayout } from "@/components/layout/PortalLayout";
import { PageHeader } from "@/shared";
import { useCachedQuery } from "@/shared/lib/core";
import {
  listRequestTypes,
  listCategories,
  type RequestTypeOption,
  type RequestCategoryOption,
} from "@/pages/requests/requests-api";
import {
  ArrowRight,
  Clock,
  Search,
  X,
  FileText,
} from "lucide-react";

const WORKFLOW_LABELS: Record<string, string> = {
  payment: "Payment",
  leave: "Leave",
  loan: "Loan",
  other: "Operations",
};

function formatLimit(raw: unknown): string | null {
  if (raw === null || raw === undefined || raw === "") return null;
  const num = Number(raw);
  if (!Number.isFinite(num) || num <= 0) return null;
  return `Up to ₦${num.toLocaleString("en-NG", { maximumFractionDigits: 0 })}`;
}

export default function RequestTypePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const categoryIdParam = searchParams.get("categoryId") || "all";
  const teamIdParam = searchParams.get("team_id");
  const orgIdParam = searchParams.get("organization_id");

  const [query, setQuery] = useState("");

  const { data: requestTypes, loading: typesLoading, error: typesError } = useCachedQuery(
    "requests:types:all",
    () => listRequestTypes(),
    { ttlMs: 1000 * 60 * 5, storage: "memory" },
  );

  const { data: categories, loading: categoriesLoading } = useCachedQuery(
    "requests:categories:all",
    () => listCategories(),
    { ttlMs: 1000 * 60 * 5, storage: "memory" },
  );

  const loading = typesLoading || categoriesLoading;
  const allTypes = (requestTypes ?? []) as RequestTypeOption[];
  const allCategories = (categories ?? []) as RequestCategoryOption[];

  const categoryNameById = useMemo(() => {
    const map = new Map<string, string>();
    allCategories.forEach((c) => map.set(c.id, c.name));
    return map;
  }, [allCategories]);

  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = { all: allTypes.length };
    allTypes.forEach((t) => {
      const catId = t.categoryId ?? t.category_id ?? "others";
      counts[catId] = (counts[catId] ?? 0) + 1;
    });
    return counts;
  }, [allTypes]);

  const railCategories = useMemo(() => {
    const items: Array<{ key: string; name: string; count: number }> = [
      { key: "all", name: "All workflows", count: typeCounts.all ?? 0 },
      ...allCategories.map((c) => ({
        key: c.id,
        name: c.name,
        count: typeCounts[c.id] ?? 0,
      })),
    ];
    if ((typeCounts.others ?? 0) > 0) {
      items.push({ key: "others", name: "Uncategorized", count: typeCounts.others });
    }
    return items;
  }, [allCategories, typeCounts]);

  const visibleTypes = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allTypes.filter((t) => {
      const catId = t.categoryId ?? t.category_id ?? "others";
      const matchesCategory =
        categoryIdParam === "all" ||
        (categoryIdParam === "others" ? !t.categoryId && !t.category_id : catId === categoryIdParam);
      if (!matchesCategory) return false;
      if (!q) return true;
      const prefix = String(t.codePrefix ?? t.code_prefix ?? "").toLowerCase();
      const handler = String(
        t.handler_role_label ?? (t as any).handlerRoleLabel ?? "",
      ).toLowerCase();
      const catName = (categoryNameById.get(catId) ?? "").toLowerCase();
      return (
        t.name.toLowerCase().includes(q) ||
        (t.description ?? "").toLowerCase().includes(q) ||
        prefix.includes(q) ||
        handler.includes(q) ||
        catName.includes(q)
      );
    });
  }, [allTypes, categoryIdParam, query, categoryNameById]);

  const activeCategoryName = useMemo(() => {
    if (categoryIdParam === "all") return "All workflows";
    if (categoryIdParam === "others") return "Uncategorized";
    return categoryNameById.get(categoryIdParam) ?? "All workflows";
  }, [categoryIdParam, categoryNameById]);

  const formLinkParams = useMemo(() => {
    const p = new URLSearchParams();
    if (teamIdParam) p.set("team_id", teamIdParam);
    if (orgIdParam) p.set("organization_id", orgIdParam);
    return p.toString();
  }, [teamIdParam, orgIdParam]);

  const formLink = (typeId: string) => {
    const base = `/requests/new/form?typeId=${typeId}`;
    return formLinkParams ? `${base}&${formLinkParams}` : base;
  };

  const handleSelectCategory = useCallback(
    (key: string) => {
      const next = new URLSearchParams(searchParams);
      if (key === "all") {
        next.delete("categoryId");
      } else {
        next.set("categoryId", key);
      }
      setSearchParams(next);
    },
    [searchParams, setSearchParams],
  );

  return (
    <PortalLayout activeNav="My Requests">
      <div className="space-y-6">
        <PageHeader
          title="New request"
          description="Pick a workflow to start a finance, HR, procurement, or operations request"
          actions={
            <Link
              to="/requests"
              className="button-secondary h-9 px-3.5 text-sm"
            >
              <Clock className="h-4 w-4 text-neutral-500" strokeWidth={1.5} />
              <span>Submitted requests</span>
            </Link>
          }
        />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left rail: Category index + compact submission note */}
          <aside className="lg:col-span-3 space-y-6">
            <div className="rounded-2xl bg-white border border-neutral-900/[0.08] p-4 shadow-xs">
              <p className="px-2 pb-2 text-xs font-medium text-neutral-500">
                Categories
              </p>
              <nav className="space-y-1" aria-label="Request categories">
                {railCategories.map((item) => {
                  const active = categoryIdParam === item.key;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => handleSelectCategory(item.key)}
                      className={`w-full h-9 px-2.5 rounded-lg flex items-center justify-between gap-2 text-sm transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6900]/30 ${
                        active
                          ? "bg-neutral-100 text-neutral-900 font-medium"
                          : "text-neutral-600 font-normal hover:bg-neutral-50 hover:text-neutral-900"
                      }`}
                    >
                      <span className="flex items-center gap-2 min-w-0">
                        <span
                          className={`h-1.5 w-1.5 rounded-full shrink-0 ${
                            active ? "bg-[#ff6900]" : "bg-transparent"
                          }`}
                        />
                        <span className="truncate">{item.name}</span>
                      </span>
                      <span
                        className={`font-mono text-xs tabular-nums shrink-0 ${
                          active ? "text-[#c2410c]" : "text-neutral-400"
                        }`}
                      >
                        {item.count}
                      </span>
                    </button>
                  );
                })}
              </nav>
            </div>

            <div className="rounded-2xl bg-white border border-neutral-900/[0.08] p-4 shadow-xs space-y-3">
              <p className="text-xs font-medium text-neutral-900">
                Before you submit
              </p>
              <ol className="space-y-2.5 text-xs text-neutral-500 leading-relaxed">
                <li className="flex gap-2.5">
                  <span className="font-mono text-neutral-400 tabular-nums shrink-0">01</span>
                  <span>Choose the workflow that matches your expense, leave, or equipment need</span>
                </li>
                <li className="flex gap-2.5">
                  <span className="font-mono text-neutral-400 tabular-nums shrink-0">02</span>
                  <span>Attach quotes or supporting receipts for finance and procurement requests</span>
                </li>
                <li className="flex gap-2.5">
                  <span className="font-mono text-neutral-400 tabular-nums shrink-0">03</span>
                  <span>Your request routes automatically to your line manager and approvers</span>
                </li>
              </ol>
            </div>
          </aside>

          {/* Right column: Search + Workflow ledger */}
          <section className="lg:col-span-9 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-baseline gap-2.5 min-w-0">
                <h2 className="font-headline text-base font-medium tracking-tight text-neutral-900 truncate">
                  {activeCategoryName}
                </h2>
                <span className="font-mono text-xs text-neutral-500 tabular-nums shrink-0">
                  {visibleTypes.length}
                </span>
              </div>

              <div className="relative w-full sm:w-72">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400"
                  strokeWidth={1.5}
                />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search request types"
                  className="w-full h-9 pl-9 pr-8 rounded-lg border border-neutral-900/[0.12] bg-white text-sm text-neutral-900 placeholder:text-neutral-400 outline-none focus:border-[#ff6900] focus:ring-2 focus:ring-[#ff6900]/15 transition-colors duration-150"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery("")}
                    aria-label="Clear search"
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-neutral-400 hover:text-neutral-700"
                  >
                    <X className="h-3.5 w-3.5" strokeWidth={1.5} />
                  </button>
                )}
              </div>
            </div>

            {typesError ? (
              <div className="rounded-2xl bg-white border border-neutral-900/[0.08] p-8 text-center">
                <p className="text-sm font-medium text-neutral-900">Unable to load workflows</p>
                <p className="mt-1 text-xs text-neutral-500">Refresh the page to try again</p>
              </div>
            ) : loading ? (
              <div className="rounded-2xl bg-white border border-neutral-900/[0.08] divide-y divide-neutral-900/[0.06] overflow-hidden">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="px-5 py-4 flex items-center gap-4">
                    <div className="w-16 h-6 rounded bg-neutral-100 shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="w-44 h-4 rounded bg-neutral-100" />
                      <div className="w-80 max-w-full h-3 rounded bg-neutral-100" />
                    </div>
                  </div>
                ))}
              </div>
            ) : visibleTypes.length === 0 ? (
              <div className="rounded-2xl bg-white border border-neutral-900/[0.08] px-6 py-12 text-center space-y-2">
                <FileText className="h-5 w-5 text-neutral-400 mx-auto" strokeWidth={1.5} />
                <p className="text-sm font-medium text-neutral-900">No matching request types</p>
                <p className="text-xs text-neutral-500">
                  {query
                    ? "Try a different keyword or clear the search filter"
                    : "No active workflows are configured in this category yet"}
                </p>
                {(query || categoryIdParam !== "all") && (
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setQuery("");
                        handleSelectCategory("all");
                      }}
                      className="button-secondary h-8 px-3 text-xs"
                    >
                      Show all workflows
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-2xl bg-white border border-neutral-900/[0.08] shadow-xs divide-y divide-neutral-900/[0.06] overflow-hidden">
                {visibleTypes.map((type) => {
                  const prefix = (
                    type.codePrefix ??
                    type.code_prefix ??
                    (type as any).code ??
                    "REQ"
                  ).toUpperCase();
                  const handler =
                    type.handler_role_label ?? (type as any).handlerRoleLabel ?? null;
                  const wfKey = String(
                    type.workflow_type ?? (type as any).workflowType ?? "",
                  ).toLowerCase();
                  const wfLabel = WORKFLOW_LABELS[wfKey] ?? null;
                  const limitLabel = formatLimit(
                    (type as any).approvalLimit ?? (type as any).approval_limit,
                  );
                  const catId = type.categoryId ?? type.category_id ?? "";
                  const catName = categoryNameById.get(catId);

                  return (
                    <Link
                      key={type.id}
                      to={formLink(type.id)}
                      className="group flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 px-5 py-4 hover:bg-neutral-50 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#ff6900]/30"
                    >
                      {/* Signature filing-prefix column */}
                      <div className="w-16 shrink-0">
                        <span className="inline-flex items-center justify-center min-w-[52px] px-2 py-1 rounded-md font-mono text-xs font-medium tabular-nums bg-neutral-100 text-neutral-700 border border-neutral-900/[0.06] group-hover:bg-orange-50 group-hover:text-[#c2410c] group-hover:border-orange-200/70 transition-colors duration-150">
                          {prefix}
                        </span>
                      </div>

                      {/* Name + description */}
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-sm font-medium text-neutral-900 group-hover:text-[#c2410c] transition-colors duration-150">
                            {type.name}
                          </h3>
                          {categoryIdParam === "all" && catName && (
                            <span className="text-xs text-neutral-400">
                              {catName}
                            </span>
                          )}
                        </div>
                        {type.description && (
                          <p className="mt-0.5 text-xs text-neutral-500 line-clamp-1 leading-relaxed">
                            {type.description}
                          </p>
                        )}
                      </div>

                      {/* Right metadata + quiet action */}
                      <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 text-xs">
                        <div className="flex flex-wrap items-center gap-3 text-neutral-500">
                          {handler && <span className="truncate max-w-[160px]">{handler}</span>}
                          {limitLabel && (
                            <span className="font-mono tabular-nums text-neutral-600">
                              {limitLabel}
                            </span>
                          )}
                          {!limitLabel && wfLabel && (
                            <span className="text-neutral-400">{wfLabel}</span>
                          )}
                        </div>
                        <ArrowRight
                          className="h-4 w-4 text-neutral-400 group-hover:text-[#ff6900] transition-colors duration-150 shrink-0"
                          strokeWidth={1.5}
                        />
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>
    </PortalLayout>
  );
}
