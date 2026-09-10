import {
  Button,
  Chip,
  EmptyState,
  Icon,
  PageHeader,
  SectionCard,
} from "@/shared";
import { Link, useSearchParams } from "react-router-dom";
import { useMemo, useRef, useState, useCallback, useEffect } from "react";
import { AppShell } from "@/shared/components/layout/AppShell";
import { useCachedQuery } from "@/shared/lib/core";
import {
  buildRequestsNavigation,
  requestsMobileNav,
} from "@/pages/requests/requests-data";
import {
  listRequestTypes,
  listCategories,
  type RequestTypeOption,
  type RequestCategoryOption,
} from "@/pages/requests/requests-api";

/* ------------------------------------------------------------------ */
/* Category icon mapping (by code)                                     */
/* ------------------------------------------------------------------ */
const CATEGORY_ICON: Record<string, string> = {
  PAYMENT: "payments",
  LEAVE: "event_available",
  LOAN: "account_balance",
};

/* ------------------------------------------------------------------ */
/* CategoryCard                                                        */
/* ------------------------------------------------------------------ */
function CategoryCard({
  category,
  icon,
  count,
  active,
}: {
  category: RequestCategoryOption | null;
  icon: string;
  count: number;
  active: boolean;
}) {
  const name = category ? category.name : "Others";
  const description = category
    ? category.description
    : "Miscellaneous request types without a specific category.";

  return (
    <div
      className={[
        "group flex h-full w-[240px] flex-shrink-0 flex-col rounded-[24px] border bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-card focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-900/10",
        active
          ? "border-brand-900 ring-2 ring-brand-900/10"
          : "border-slate-200",
      ].join(" ")}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-900/10 text-brand-900">
          <Icon name={icon} className="text-[22px]" />
        </div>
        <Chip variant={active ? "pending" : "neutral"}>{count} types</Chip>
      </div>
      <h2 className="mt-5 text-lg font-semibold text-slate-950">{name}</h2>
      <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-500">
        {description}
      </p>
      <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-brand-900">
        {active ? "Category selected" : "Choose category"}
        <Icon name="arrow_forward" className="text-[18px]" />
      </span>
    </div>
  );
}

type CategoryCardDef = {
  category: RequestCategoryOption | null;
  icon: string;
  key: string;
};

/* ------------------------------------------------------------------ */
/* Carousel arrow button                                               */
/* ------------------------------------------------------------------ */
function CarouselArrow({
  direction,
  onClick,
  disabled,
}: {
  direction: "left" | "right";
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={direction === "left" ? "Scroll left" : "Scroll right"}
      className={[
        "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white shadow-sm transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-900/10",
        disabled ? "cursor-not-allowed opacity-30" : "cursor-pointer",
      ].join(" ")}
    >
      <Icon
        name={direction === "left" ? "chevron_left" : "chevron_right"}
        className="text-[20px] text-slate-700"
      />
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* useCarouselScroll                                                    */
/* ------------------------------------------------------------------ */
function useCarouselScroll(scrollRef: React.RefObject<HTMLDivElement | null>) {
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, [scrollRef]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    checkScroll();
    el.addEventListener("scroll", checkScroll, { passive: true });
    const observer = new ResizeObserver(checkScroll);
    observer.observe(el);
    return () => {
      el.removeEventListener("scroll", checkScroll);
      observer.disconnect();
    };
  }, [checkScroll, scrollRef]);

  const scroll = useCallback(
    (direction: "left" | "right") => {
      const el = scrollRef.current;
      if (!el) return;
      const distance = el.clientWidth * 0.65;
      el.scrollBy({
        left: direction === "left" ? -distance : distance,
        behavior: "smooth",
      });
    },
    [scrollRef],
  );

  return { canScrollLeft, canScrollRight, scroll, checkScroll };
}

/* ------------------------------------------------------------------ */
/* RequestTypePage                                                      */
/* ------------------------------------------------------------------ */
export function RequestTypePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const categoryIdParam = searchParams.get("categoryId");
  const teamIdParam = searchParams.get("team_id");
  const orgIdParam = searchParams.get("organization_id");
  const scrollRef = useRef<HTMLDivElement>(null);
  const { canScrollLeft, canScrollRight, scroll, checkScroll } =
    useCarouselScroll(scrollRef);

  const {
    data: requestTypes,
    loading,
    error,
  } = useCachedQuery("requests:types", () => listRequestTypes(), {
    ttlMs: 1000 * 60 * 10,
    storage: "local",
  });

  const { data: categories } = useCachedQuery(
    "requests:categories",
    () => listCategories(),
    { ttlMs: 1000 * 60 * 10, storage: "local" },
  );

  const categoryCards: CategoryCardDef[] = useMemo(() => {
    const sorted = [...(categories ?? [])].sort(
      (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0),
    );
    const cards: CategoryCardDef[] = sorted.map((cat) => ({
      category: cat,
      icon: CATEGORY_ICON[cat.code] ?? "category",
      key: cat.id,
    }));
    cards.push({
      category: null,
      icon: "assignment",
      key: "others",
    });
    return cards;
  }, [categories]);

  // Trigger carousel scroll check once cards are rendered
  useEffect(() => {
    checkScroll();
  }, [categoryCards, checkScroll]);

  const selectedTypes = useMemo(() => {
    if (!categoryIdParam || !requestTypes) return [];
    if (categoryIdParam === "others") {
      return (requestTypes as RequestTypeOption[]).filter(
        (t) => !t.categoryId && !t.category_id,
      );
    }
    return (requestTypes as RequestTypeOption[]).filter(
      (t) =>
        t.categoryId === categoryIdParam || t.category_id === categoryIdParam,
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
    [searchParams, setSearchParams],
  );

  /* ---------------------------------------------------------------- */
  /* Desktop carousel                                                  */
  /* ---------------------------------------------------------------- */
  const renderDesktopCarousel = () => (
    <section className="relative">
      {/* Arrow controls row */}
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
          Request Categories
        </p>
        <div className="flex items-center gap-2">
          <CarouselArrow
            direction="left"
            onClick={() => scroll("left")}
            disabled={!canScrollLeft}
          />
          <CarouselArrow
            direction="right"
            onClick={() => scroll("right")}
            disabled={!canScrollRight}
          />
        </div>
      </div>

      {/* Scrollable track */}
      <div
        ref={scrollRef}
        className="no-scrollbar -mx-1 flex gap-4 overflow-x-auto px-1 pb-2"
      >
        {categoryCards.map((card) => (
          <button
            key={card.key}
            type="button"
            onClick={() => handleCategoryClick(card.key)}
            className="block flex-shrink-0"
          >
            <CategoryCard
              category={card.category}
              icon={card.icon}
              active={categoryIdParam === card.key}
              count={typeCounts[card.key] ?? 0}
            />
          </button>
        ))}
      </div>

      {/* Fade edges */}
      {canScrollLeft && (
        <div className="pointer-events-none absolute bottom-2 left-0 top-10 w-8 bg-gradient-to-r from-white to-transparent" />
      )}
      {canScrollRight && (
        <div className="pointer-events-none absolute bottom-2 right-0 top-10 w-8 bg-gradient-to-l from-white to-transparent" />
      )}
    </section>
  );

  /* ---------------------------------------------------------------- */
  /* Mobile category list (horizontal scroll)                          */
  /* ---------------------------------------------------------------- */
  const renderMobileCategories = () => (
    <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-2">
      {categoryCards.map((card) => (
        <button
          key={card.key}
          type="button"
          onClick={() => handleCategoryClick(card.key)}
          className="block flex-shrink-0"
        >
          <CategoryCard
            category={card.category}
            icon={card.icon}
            active={categoryIdParam === card.key}
            count={typeCounts[card.key] ?? 0}
          />
        </button>
      ))}
    </div>
  );

  return (
    <AppShell
      navigation={buildRequestsNavigation()}
      activeLabel="New Request"
      user={{ name: "Alex Sterling", role: "Fleet Operations" }}
      mobileNav={requestsMobileNav}
    >
      <div className="hidden lg:block">
        <PageHeader
          breadcrumbs={[
            { label: "Requests", path: "/requests" },
            { label: "New Request" },
          ]}
          title="Create a new request"
          description="Start by choosing a request category, then select the exact subtype you want to submit."
        />

        <div className="grid gap-6 lg:grid-cols-12">
          <div className="space-y-6 lg:col-span-8">
            {renderDesktopCarousel()}

            <SectionCard
              title={
                categoryIdParam
                  ? `${selectedCategoryLabel} request types`
                  : "Choose a category first"
              }
              description={
                categoryIdParam
                  ? "Select the exact request subtype to open the right form structure."
                  : "Each request category has its own subtypes, fields, and approval flow."
              }
            >
              {!categoryIdParam ? (
                <EmptyState
                  title="Choose a request category"
                  description="We'll then show the relevant request subtypes for that category."
                />
              ) : loading ? (
                <div className="rounded-2xl bg-slate-50 px-4 py-6 text-sm text-slate-500">
                  Loading request types...
                </div>
              ) : error ? (
                <div className="rounded-2xl border border-danger/20 bg-danger/10 px-4 py-4 text-sm text-danger">
                  {error}
                </div>
              ) : selectedTypes.length === 0 ? (
                <EmptyState
                  title="No request subtypes available"
                  description="This category doesn't have active request types yet."
                />
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {selectedTypes.map((type) => (
                    <Link
                      key={type.id}
                      to={formLink(type.id)}
                      className="group rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-card focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-900/10"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-lg font-semibold text-slate-950">
                            {type.name}
                          </p>
                          <p className="mt-2 text-sm leading-6 text-slate-500">
                            {type.description ||
                              "Open this workflow with the right fields and approval path."}
                          </p>
                        </div>
                      </div>
                      <div className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-brand-900">
                        Open form
                        <Icon name="arrow_forward" className="text-[18px]" />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </SectionCard>
          </div>

          <div className="space-y-6 lg:col-span-4">
            <SectionCard title="How this works">
              <div className="space-y-3 text-sm leading-6 text-slate-600">
                <p>1. Choose the request category.</p>
                <p>2. Pick the exact subtype.</p>
                <p>3. Complete the right form for that workflow.</p>
              </div>
            </SectionCard>

            <SectionCard title="Need help choosing?">
              <p className="text-sm leading-6 text-slate-600">
                If you are not sure which request subtype to use, start with the
                category that best matches the outcome you need.
              </p>
              <Button
                variant="secondary"
                className="mt-4 w-full justify-center"
              >
                Contact Support
              </Button>
            </SectionCard>
          </div>
        </div>
      </div>

      <div className="space-y-4 lg:hidden">
        <div className="pt-1">
          <p className="text-[0.72rem] font-bold uppercase tracking-[0.18em] text-slate-500">
            Request Center
          </p>
          <h1 className="page-title mt-2 text-[clamp(1.7rem,7vw,2.2rem)]">
            Create a new request
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-slate-500">
            Choose a request category first, then select the subtype to open the
            right form.
          </p>
        </div>

        {renderMobileCategories()}

        {categoryIdParam ? (
          <section className="section-card p-4">
            <p className="text-[0.72rem] font-bold uppercase tracking-[0.18em] text-slate-500">
              {selectedCategoryLabel} Request Types
            </p>
            <div className="mt-4 grid gap-3">
              {selectedTypes.map((type) => (
                <Link
                  key={type.id}
                  to={formLink(type.id)}
                  className="rounded-[20px] border border-slate-200 bg-white px-4 py-4 shadow-sm"
                >
                  <p className="text-sm font-semibold text-slate-950">
                    {type.name}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    {type.description ||
                      "Open the right request form for this subtype."}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </AppShell>
  );
}

export default RequestTypePage;
