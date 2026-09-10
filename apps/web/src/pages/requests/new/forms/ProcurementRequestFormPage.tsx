import { forwardRef, useEffect, useImperativeHandle, useMemo, useState } from "react";
import { Button, Icon, MediaPickerModal, SectionCard, TextField, TextAreaField, SelectField } from "@/shared";
import type { ApprovedBudgetLineOption, RequestTypeOption, RequestCategoryOption, RequestRecord } from "@/pages/requests/requests-api";
import type { RequestFormHandle } from "./category-form-types";
import { listFileAssets, uploadFileAsset } from "@/pages/files/files-api";

const OTHER_VENDOR_VALUE = "__other__";

type Props = {
  selectedType: RequestTypeOption;
  selectedCategory: RequestCategoryOption | null;
  vendorOptions: Array<{ id: string; name: string }>;
  editRequest?: RequestRecord | null;
  loadingEdit: boolean;
  approvedBudgetLines: ApprovedBudgetLineOption[];
  onSummary: (node: React.ReactNode) => void;
};

export const ProcurementRequestFormPage = forwardRef<RequestFormHandle, Props>(({
  selectedCategory,
  vendorOptions,
  editRequest,
  approvedBudgetLines,
  onSummary,
}, ref) => {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("goods");
  const [neededBy, setNeededBy] = useState("");
  const [budgetId, setBudgetId] = useState("");
  const [budgetLineId, setBudgetLineId] = useState("");
  const [justification, setJustification] = useState("");
  const [specification, setSpecification] = useState("");
  const [suggestedVendorId, setSuggestedVendorId] = useState("");
  const [suggestedVendorName, setSuggestedVendorName] = useState("");
  const [vendorIsOther, setVendorIsOther] = useState(false);
  const [supportingFileIds, setSupportingFileIds] = useState<string[]>([]);
  const [supportingFileNames, setSupportingFileNames] = useState<string[]>([]);
  const [showDocsPicker, setShowDocsPicker] = useState(false);

  const budgetOptions = useMemo(() => {
    const byBudget = new Map<string, { id: string; name: string }>();
    for (const line of approvedBudgetLines) {
      if (!byBudget.has(line.budget_id)) {
        byBudget.set(line.budget_id, { id: line.budget_id, name: line.budget_name });
      }
    }
    return Array.from(byBudget.values());
  }, [approvedBudgetLines]);

  const budgetLineOptions = useMemo(
    () => approvedBudgetLines.filter((line) => !budgetId || line.budget_id === budgetId),
    [approvedBudgetLines, budgetId],
  );

  const selectedBudgetLine = useMemo(
    () => approvedBudgetLines.find((line) => line.budget_line_id === budgetLineId) ?? null,
    [approvedBudgetLines, budgetLineId],
  );

  useEffect(() => {
    if (!editRequest?.data) return;
    const data = editRequest.data as Record<string, unknown>;
    setTitle(String(data.title || ""));
    setCategory(String(data.category || "goods"));
    setNeededBy(String(data.needed_by || ""));
    setBudgetId(String(data.budget_id || ""));
    setBudgetLineId(String(data.budget_line_id || ""));
    setJustification(String(data.justification || ""));
    setSpecification(String(data.specification || ""));
    const vendorId = String(data.suggested_vendor_id || "");
    const vendorName = String(data.suggested_vendor_name || "");
    setSuggestedVendorId(vendorId);
    setSuggestedVendorName(vendorName);
    setVendorIsOther(!vendorId && Boolean(vendorName));
    const fileIds = Array.isArray(data.supporting_file_ids) ? data.supporting_file_ids.map(String) : [];
    const fileNames = Array.isArray(data.supporting_file_names) ? data.supporting_file_names.map(String) : [];
    setSupportingFileIds(fileIds);
    setSupportingFileNames(fileNames);
  }, [editRequest]);

  useEffect(() => {
    onSummary(
      <section className="section-card bg-brand-900 p-5 text-white">
        <p className="text-[0.72rem] font-bold uppercase tracking-[0.16em] text-white/70">
          {selectedCategory?.name || "Procurement Request"}
        </p>
        <p className="mt-3 text-4xl font-semibold tracking-tight">&mdash;</p>
        <p className="mt-2 text-sm leading-6 text-white/70">
          {title || selectedCategory?.description || "Fill in the procurement details."}
        </p>
      </section>,
    );
  }, [selectedCategory, onSummary, title]);

  useImperativeHandle(ref, () => ({
    validateAndBuild: () => ({
      payload: {
        data: {
          title: title.trim() || undefined,
          category: category || undefined,
          needed_by: neededBy || undefined,
          budget_id: budgetId || undefined,
          budget_revision_id: selectedBudgetLine?.budget_revision_id || undefined,
          budget_line_id: budgetLineId || undefined,
          justification: justification.trim() || undefined,
          specification: specification.trim() || undefined,
          suggested_vendor_id: vendorIsOther ? undefined : suggestedVendorId || undefined,
          suggested_vendor_name: vendorIsOther ? suggestedVendorName.trim() || undefined : undefined,
          supporting_file_ids: supportingFileIds.length ? supportingFileIds : undefined,
          supporting_file_names: supportingFileNames.length ? supportingFileNames : undefined,
        },
      },
    }),
  }));


  return (
    <SectionCard
      title="Procurement Details"
      description="Describe what you need to procure."
    >
      <div className="grid gap-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <TextField
            label="Item / Service Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Purchase of QA Testing Laptops"
          />
        </div>
        <SelectField
          label="Category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="goods">Goods</option>
          <option value="services">Services</option>
          <option value="works">Works</option>
        </SelectField>
        <TextField
          label="Needed By"
          type="date"
          value={neededBy}
          onChange={(e) => setNeededBy(e.target.value)}
        />
        <SelectField
          label="Budget"
          value={budgetId}
          onChange={(e) => {
            setBudgetId(e.target.value);
            setBudgetLineId("");
          }}
          disabled={budgetOptions.length === 0}
        >
          <option value="">Select approved budget</option>
          {budgetOptions.map((option) => (
            <option key={option.id} value={option.id}>{option.name}</option>
          ))}
        </SelectField>
        <SelectField
          label="Budget Line"
          value={budgetLineId}
          onChange={(e) => setBudgetLineId(e.target.value)}
          disabled={budgetLineOptions.length === 0}
        >
          <option value="">Select approved budget line</option>
          {budgetLineOptions.map((option) => (
            <option key={option.budget_line_id} value={option.budget_line_id}>
              {option.line_label} ({option.total_amount})
            </option>
          ))}
        </SelectField>
        <div>
          <SelectField
            label="Suggested Vendor"
            value={vendorIsOther ? OTHER_VENDOR_VALUE : suggestedVendorId}
            onChange={(e) => {
              const value = e.target.value;
              if (value === OTHER_VENDOR_VALUE) {
                setVendorIsOther(true);
                setSuggestedVendorId("");
              } else {
                setVendorIsOther(false);
                setSuggestedVendorId(value);
                setSuggestedVendorName("");
              }
            }}
          >
            <option value="">No suggestion</option>
            {vendorOptions.map((v) => (
              <option key={v.id} value={v.id}>{v.name}</option>
            ))}
            <option value={OTHER_VENDOR_VALUE}>Other — type a name</option>
          </SelectField>
          {vendorIsOther && (
            <div className="mt-2">
              <TextField
                label="Vendor Name"
                value={suggestedVendorName}
                onChange={(e) => setSuggestedVendorName(e.target.value)}
                placeholder="Enter vendor name"
              />
            </div>
          )}
        </div>
        <div className="md:col-span-2">
          <TextAreaField
            label="Justification"
            value={justification}
            onChange={(e) => setJustification(e.target.value)}
            placeholder="Why is this procurement needed?"
            rows={3}
          />
        </div>
        <div className="md:col-span-2">
          <TextAreaField
            label="Specification"
            value={specification}
            onChange={(e) => setSpecification(e.target.value)}
            placeholder="Detailed specs, preferred brands, or requirements"
            rows={4}
          />
        </div>
        <div className="md:col-span-2">
          <span className="field-label">Supporting Documents</span>
          <div className="mt-2">
            <Button
              variant="secondary"
              onClick={() => setShowDocsPicker(true)}
            >
              <Icon name="attach_file" className="text-[18px]" />
              {supportingFileIds.length ? "Manage Supporting Documents" : "Pick Supporting Documents"}
            </Button>
          </div>
          {supportingFileNames.length > 0 && (
            <ul className="mt-3 space-y-1.5">
              {supportingFileNames.map((name, index) => (
                <li
                  key={`${name}-${index}`}
                  className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700"
                >
                  <Icon name="attach_file" className="text-[16px] text-brand-900" />
                  <span className="truncate">{name}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <MediaPickerModal
        open={showDocsPicker}
        onClose={() => setShowDocsPicker(false)}
        title="Select Supporting Documents"
        multiple
        selectedIds={supportingFileIds}
        loadFiles={async (search) => listFileAssets({ include_usage: true, per_page: 200, search })}
        uploadFiles={async (files, onProgress) => {
          const total = files.length;
          let uploadedCount = 0;
          for (const file of Array.from(files)) {
            onProgress?.({ uploaded: uploadedCount, total, current_file_name: file.name });
            const uploaded = await uploadFileAsset(file, { metadata: { source: "procurement_request" } });
            uploadedCount += 1;
            onProgress?.({ uploaded: uploadedCount, total, current_file_name: file.name });
            setSupportingFileIds((prev) => (prev.includes(uploaded.id) ? prev : [...prev, uploaded.id]));
            setSupportingFileNames((prev) => [...prev, uploaded.file_name]);
          }
        }}
        onSelect={(files) => {
          setSupportingFileIds(files.map((file) => file.id));
          setSupportingFileNames(files.map((file) => file.file_name));
        }}
      />
    </SectionCard>
  );
});

ProcurementRequestFormPage.displayName = "ProcurementRequestFormPage";
