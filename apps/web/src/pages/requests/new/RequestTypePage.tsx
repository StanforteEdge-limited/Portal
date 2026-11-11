import { useMemo, useRef, useState, useCallback, useEffect } from "react";
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
  FileText,
  CreditCard,
  Calendar,
  Building2,
  ChevronRight,
  ArrowRight,
  CheckCircle2,
  Clock,
  HelpCircle,
  FolderPlus,
  Send,
  Layers,
  ShieldCheck,
} from "lucide-react";

export default function RequestTypePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const categoryIdParam = searchParams.get("categoryId");
  const teamIdParam = searchParams.get("team_id");
  const orgIdParam = searchParams.get("organization_id");

  const { data: requestTypes, loading: typesLoading, error: typesError } = useCachedQuery(
    "requests:types:all",
    () => listRequestTypes(),
    { ttlMs: 1000 * 60 * 5, storage: "memory" }
  );

  const { data: categories, loading: categoriesLoading } = useCachedQuery(
    "requests:categories:all",
    () => listCategories(),
    { ttlMs: 1000 * 60 * 5, storage: "memory" }
  );

  const loading = typesLoading || categoriesLoading;

  const categoryCards = useMemo(() => {
    const list = categories ?? [];
    const cards = list.map((c) => ({
      category: c,
      key: c.id,
      name: c.name,
      description: c.description || "Operational workflow and approval chain.",
    }));
    cards.push({
      category: null as any,
      key: "others",
      name: "Others",
      description: "Miscellaneous administrative workflows.",
    });
    return cards;
  }, [categories]);

  const selectedTypes = useMemo(() => {
    if (!categoryIdParam || !requestTypes) return [];
    if (categoryIdParam === "others") {
      return (requestTypes as RequestTypeOption[]).filter(
        (t) => !t.categoryId && !t.category_id
      );
    }
    return (requestTypes as RequestTypeOption[]).filter(
      (t) => t.categoryId === categoryIdParam || t.category_id === categoryIdParam
    );
  }, [categoryIdParam, requestTypes]);

  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    (requestTypes ?? []).forEach((t: RequestTypeOption) => {
      const catId = t.categoryId ?? t.category_id ?? "others";
      counts[catId] = (counts[catId] ?? 0) + 1;
    });
    return counts;
  }, [requestTypes]);

  const selectedCategory: RequestCategoryOption | null = useMemo(() => {
    if (!categoryIdParam || categoryIdParam === "others") return null;
    return categories?.find((c) => c.id === categoryIdParam) ?? null;
  }, [categoryIdParam, categories]);

  const selectedCategoryLabel = selectedCategory?.name ?? "Others";

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

  const handleCategoryClick = useCallback(
    (key: string) => {
      const next = new URLSearchParams(searchParams);
      if (next.get("categoryId") === key) {
        next.delete("categoryId");
      } else {
        next.set("categoryId", key);
      }
      setSearchParams(next);
    },
    [searchParams, setSearchParams]
  );

  return (
    <PortalLayout activeNav="My Requests">
      <div className="space-y-6">
        {/* Modern Unified Page Header (No Breadcrumbs) */}
        <PageHeader
          title="Create New Request"
          description="Select the designated request category and workflow subtype to initiate formal sign-off."
          icon={FolderPlus}
          iconColor="bg-orange-50 text-[#ff6900]"
          actions={
            <Link
              to="/requests"
              className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 transition shadow-xs self-start sm:self-auto"
            >
              <Clock className="h-4 w-4 text-slate-400" />
              <span>My Submitted Requests</span>
            </Link>
          }
        />

        {/* 4 KPI Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-50 text-[#ff6900] flex items-center justify-center shrink-0">
                <Layers className="h-5 w-5" />
              </div>
              <div>
                <div className="text-[11px] font-semibold text-slate-500">Categories</div>
                <div className="text-xl font-black text-slate-900 mt-0.5">
                  {categories?.length || 0}
                </div>
              </div>
            </div>
            <div className="text-[11px] font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">
              Standard
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <div className="text-[11px] font-semibold text-slate-500">Available Subtypes</div>
              <div className="text-xl font-black text-slate-900 mt-0.5">
                {requestTypes?.length || 0}
              </div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <div className="text-[11px] font-semibold text-slate-500">Approval Chains</div>
              <div className="text-xl font-black text-emerald-600 mt-0.5">Multi-tier</div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <div className="text-[11px] font-semibold text-slate-500">Draft Auto-save</div>
              <div className="text-xl font-black text-purple-700 mt-0.5">Enabled</div>
            </div>
          </div>
        </div>

        {/* Step 1: Request Categories Carousel / Grid */}
        <div className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Step 1: Select Request Category
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {categoryCards.map((card) => {
              const active = categoryIdParam === card.key;
              const count = typeCounts[card.key] ?? 0;

              return (
                <button
                  key={card.key}
                  type="button"
                  onClick={() => handleCategoryClick(card.key)}
                  className={`p-5 rounded-2xl border text-left transition-all duration-200 flex flex-col justify-between group ${
                    active
                      ? "bg-[#0a1128] text-white border-[#0a1128] shadow-lg shadow-navy-900/20 scale-[1.01]"
                      : "bg-white text-slate-900 border-slate-200/80 hover:border-[#ff6900]/50 hover:shadow-md"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                          active
                            ? "bg-[#ff6900] text-white"
                            : "bg-orange-50 text-[#ff6900] group-hover:bg-[#ff6900] group-hover:text-white"
                        }`}
                      >
                        <FolderPlus className="h-5 w-5" />
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          active
                            ? "bg-white/10 text-orange-400 border border-white/10"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {count} {count === 1 ? "workflow" : "workflows"}
                      </span>
                    </div>

                    <h3 className="font-extrabold text-sm mb-1">{card.name}</h3>
                    <p
                      className={`text-xs line-clamp-2 ${
                        active ? "text-slate-300" : "text-slate-500"
                      }`}
                    >
                      {card.description}
                    </p>
                  </div>

                  <div className="pt-4 mt-3 border-t border-slate-100/10 flex items-center justify-between text-xs font-bold">
                    <span className={active ? "text-orange-400" : "text-[#ff6900]"}>
                      {active ? "Selected Category" : "Choose Category"}
                    </span>
                    <ArrowRight
                      className={`h-3.5 w-3.5 transition-transform group-hover:translate-x-1 ${
                        active ? "text-orange-400" : "text-[#ff6900]"
                      }`}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Step 2: Request Subtypes List & Guidance Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-8 space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Step 2: Choose Workflow Subtype
            </h2>

            {!categoryIdParam ? (
              <div className="p-12 text-center bg-white rounded-2xl border border-slate-200/80 shadow-sm">
                <Layers className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-700">Choose a Category First</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Click on one of the category cards above to display its corresponding workflow forms.
                </p>
              </div>
            ) : loading ? (
              <div className="p-12 text-center bg-white rounded-2xl border border-slate-200/80 text-xs font-medium text-slate-400">
                Loading request forms...
              </div>
            ) : selectedTypes.length === 0 ? (
              <div className="p-12 text-center bg-white rounded-2xl border border-slate-200/80 shadow-sm">
                <FileText className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-700">No Request Types Available</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  This category currently has no active form templates configured.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {selectedTypes.map((type) => (
                  <Link
                    key={type.id}
                    to={formLink(type.id)}
                    className="p-5 rounded-2xl bg-white border border-slate-200/80 hover:border-[#ff6900]/50 hover:shadow-md transition-all duration-200 flex flex-col justify-between group cursor-pointer"
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="w-2 h-2 rounded-full bg-[#ff6900]" />
                        <h3 className="font-extrabold text-slate-900 group-hover:text-[#ff6900] transition-colors text-sm">
                          {type.name}
                        </h3>
                      </div>
                      <p className="text-xs text-slate-500 line-clamp-3 leading-relaxed">
                        {type.description ||
                          "Launch this workflow with verified fields and automated stage routing."}
                      </p>
                    </div>

                    <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                      <span className="text-[11px] font-medium text-slate-400">
                        Code: {(type as any).code || "STD"}
                      </span>
                      <span className="font-bold text-[#ff6900] flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                        <span>Open Form</span>
                        <ArrowRight className="h-3 w-3" />
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Right 4 Columns: Process SLA & Protocol Card */}
          <div className="lg:col-span-4 space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Submission Guidelines
            </h2>

            <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-4">
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                <HelpCircle className="h-4 w-4 text-[#ff6900]" />
                <h3 className="text-xs font-bold text-slate-900">Standard Request Protocol</h3>
              </div>

              <div className="space-y-3 text-xs text-slate-600">
                <div className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                    1
                  </div>
                  <div>
                    <p className="font-bold text-slate-800">Select Category & Subtype</p>
                    <p className="text-[11px] text-slate-400">
                      Match the budget line item or leave category.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                    2
                  </div>
                  <div>
                    <p className="font-bold text-slate-800">Attach Quotes & Justifications</p>
                    <p className="text-[11px] text-slate-400">
                      Required for financial or procurement requests.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                    3
                  </div>
                  <div>
                    <p className="font-bold text-slate-800">Manager & Audit Sign-off</p>
                    <p className="text-[11px] text-slate-400">
                      Automated routing with notifications and timeline tracking.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PortalLayout>
  );
}
