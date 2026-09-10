import { forwardRef, useEffect, useImperativeHandle } from "react";
import type { RequestTypeOption, RequestCategoryOption, RequestRecord } from "@/pages/requests/requests-api";
import type { RequestFormHandle } from "./category-form-types";

type Props = {
  selectedType: RequestTypeOption;
  selectedCategory: RequestCategoryOption | null;
  editRequest?: RequestRecord | null;
  loadingEdit: boolean;
  onSummary: (node: React.ReactNode) => void;
};

export const OtherRequestFormPage = forwardRef<RequestFormHandle, Props>(({
  selectedCategory,
  onSummary,
}, ref) => {
  useEffect(() => {
    onSummary(
      <section className="section-card bg-brand-900 p-5 text-white">
        <p className="text-[0.72rem] font-bold uppercase tracking-[0.16em] text-white/70">
          {selectedCategory?.name || "Request Summary"}
        </p>
        <p className="mt-3 text-4xl font-semibold tracking-tight">&mdash;</p>
        <p className="mt-2 text-sm leading-6 text-white/70">
          {selectedCategory?.description || "Complete the request details above."}
        </p>
      </section>,
    );
  }, [selectedCategory, onSummary]);

  useImperativeHandle(ref, () => ({
    validateAndBuild: () => ({ payload: { data: {} } }),
  }));

  return null;
});

OtherRequestFormPage.displayName = "OtherRequestFormPage";
