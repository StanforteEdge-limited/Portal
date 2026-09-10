import { forwardRef, useEffect, useImperativeHandle, useMemo, useState } from "react";
import { Button, Chip, Icon, SectionCard, SelectField, TextAreaField, TextField } from "@/shared";
import { formatCurrency, humanize } from "@stanforte/shared";
import type { RequestTypeOption, RequestCategoryOption, RequestRecord, ProjectOption } from "@/pages/requests/requests-api";
import type { RequestFormHandle } from "./category-form-types";
import type { TagTerm } from "@/pages/requests/taxonomy-api";
import { uploadFileAsset } from "@/pages/files/files-api";

type ItemState = {
  description: string;
  quantity: string;
  unit_price: string;
  notes: string;
  vendor_id: string;
  bank_name?: string;
  account_number?: string;
  account_name?: string;
  file_id?: string;
  file_ids?: string[];
  file_names?: string[];
  is_expanded?: boolean;
};

type FinancialFormState = {
  due_date: string;
  reimbursement: boolean;
  items: ItemState[];
};

type Props = {
  selectedType: RequestTypeOption;
  selectedCategory: RequestCategoryOption | null;
  vendorOptions: Array<{ id: string; name: string }>;
  editRequest?: RequestRecord | null;
  loadingEdit: boolean;
  onSummary: (node: React.ReactNode) => void;
};

function parsePositiveNumber(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function itemTotal(item: ItemState) {
  return parsePositiveNumber(item.quantity) * parsePositiveNumber(item.unit_price);
}

export const PaymentRequestFormPage = forwardRef<RequestFormHandle, Props>(({
  selectedType,
  selectedCategory,
  vendorOptions,
  editRequest,
  loadingEdit,
  onSummary,
}, ref) => {
  const [form, setForm] = useState<FinancialFormState>({
    due_date: "",
    reimbursement: false,
    items: [{ description: "", quantity: "1", unit_price: "", notes: "", vendor_id: "", bank_name: "", account_number: "", account_name: "" }],
  });

  const [showCsvModal, setShowCsvModal] = useState(false);
  const [csvPreview, setCsvPreview] = useState<any[]>([]);

  useEffect(() => {
    if (!editRequest?.data) return;
    const data = editRequest.data as Record<string, unknown>;
    const loadedItems = editRequest.items?.length
      ? editRequest.items.map((item) => ({
          description: item.description ?? "",
          quantity: String(item.quantity ?? 1),
          unit_price: String(item.amount ?? ""),
          notes: item.notes ?? "",
          vendor_id: "",
          bank_name: item.bank_name ?? "",
          account_number: item.account_number ?? "",
          account_name: item.account_name ?? "",
          file_id: item.file_id ?? undefined,
          file_ids: item.files?.map((f) => f.id),
          file_names: item.files?.map((f) => f.file_name),
        }))
      : [{ description: "", quantity: "1", unit_price: "", notes: "", vendor_id: "", bank_name: "", account_number: "", account_name: "" }];
    setForm((prev) => ({
      ...prev,
      due_date: String(data.due_date || ""),
      reimbursement: Boolean(data.reimbursement),
      items: loadedItems,
    }));
  }, [editRequest]);

  const totalAmount = useMemo(
    () => form.items.reduce((sum, item) => sum + parsePositiveNumber(item.quantity) * parsePositiveNumber(item.unit_price), 0),
    [form.items],
  );

  useEffect(() => {
    onSummary(
      <section className="section-card bg-brand-900 p-5 text-white">
        <p className="text-[0.72rem] font-bold uppercase tracking-[0.16em] text-white/70">
          {selectedCategory?.name || "Financial Request"}
        </p>
        <p className="mt-3 text-4xl font-semibold tracking-tight">
          {formatCurrency(totalAmount || 0)}
        </p>
        <p className="mt-2 text-sm leading-6 text-white/70">
          {selectedCategory?.description || "The request total updates from the line items you add below."}
        </p>
      </section>,
    );
  }, [totalAmount, selectedCategory, onSummary]);

  useImperativeHandle(ref, () => ({
    validateAndBuild: () => {
      if (form.items.some((item) => !item.description.trim())) {
        return { error: "Each item needs a description." };
      }
      if (form.items.some((item) => parsePositiveNumber(item.quantity) <= 0)) {
        return { error: "Each item needs a valid quantity." };
      }
      if (form.items.some((item) => parsePositiveNumber(item.unit_price) <= 0)) {
        return { error: "Each item needs a valid unit price." };
      }

      return {
        payload: {
          data: {
            due_date: form.due_date || undefined,
            reimbursement: form.reimbursement,
          },
          items: form.items.map((item) => ({
            description: item.description.trim(),
            quantity: parsePositiveNumber(item.quantity) || 1,
            amount: parsePositiveNumber(item.unit_price),
            notes: item.notes.trim() || undefined,
            vendor_id: item.vendor_id || undefined,
            bank_name: item.bank_name?.trim() || undefined,
            account_number: item.account_number?.trim() || undefined,
            account_name: item.account_name?.trim() || undefined,
            file_id: item.file_ids?.[0] || item.file_id || undefined,
            file_ids: item.file_ids?.length ? item.file_ids : undefined,
          })),
        },
      };
    },
  }));

  async function handleAttachFiles(index: number, files: FileList | null) {
    if (!files || files.length === 0) return;
    try {
      const uploaded = await Promise.all(
        Array.from(files).map((file) =>
          uploadFileAsset(file, {
            metadata: { source: "request_item" },
          }),
        ),
      );
      setForm((prev) => {
        const nextItems = [...prev.items];
        nextItems[index] = {
          ...nextItems[index],
          file_id: uploaded[0]?.id,
          file_ids: uploaded.map((f) => f.id),
          file_names: uploaded.map((f) => f.file_name),
        };
        return { ...prev, items: nextItems };
      });
    } catch {
      // silently fail — file upload is non-critical
    }
  }

  return (
    <>
      <SectionCard
        title="Request Setup"
        description="Configure the request details and timing."
      >
        <div className="grid gap-4 lg:grid-cols-2">
          <TextField
            label="Due Date"
            type="date"
            value={form.due_date}
            onChange={(event) => setForm((prev) => ({ ...prev, due_date: event.target.value }))}
          />
          <label className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3">
            <span>
              <span className="field-label">Reimbursement Needed</span>
              <span className="block text-sm text-slate-500">
                Mark this if the request is a reimbursement flow.
              </span>
            </span>
            <input
              type="checkbox"
              checked={form.reimbursement}
              onChange={(event) => setForm((prev) => ({ ...prev, reimbursement: event.target.checked }))}
              className="h-5 w-5 rounded border-slate-300 text-brand-900 focus:ring-brand-900"
            />
          </label>
        </div>
      </SectionCard>

      <SectionCard
        title="Request Items"
        description="List the cost items that make up this request."
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              className="gap-2 border-slate-200"
              onClick={() => setShowCsvModal(true)}
            >
              <Icon name="file_upload" className="text-[18px]" />
              Import CSV
            </Button>
            <Button
              variant="secondary"
              size="sm"
              className="gap-2"
              onClick={() =>
                setForm((prev) => ({
                  ...prev,
                  items: [...prev.items, { description: "", quantity: "1", unit_price: "", notes: "", vendor_id: "", bank_name: "", account_number: "", account_name: "" }],
                }))
              }
            >
              <Icon name="add" className="text-[18px]" />
              Add Line Item
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          {form.items.map((item, index) => (
            <div key={`item-${index}`} className="rounded-[20px] border border-slate-200 bg-white p-4">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-950">Request Item {index + 1}</p>
                  <p className="mt-1 text-xs text-slate-500">Line total updates as quantity and unit price change.</p>
                </div>
                <button
                  type="button"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-danger/15 bg-danger/10 text-danger transition hover:bg-danger/15"
                  onClick={() =>
                    setForm((prev) => {
                      if (prev.items.length === 1) {
                        return { ...prev, items: [{ description: "", quantity: "1", unit_price: "", notes: "", vendor_id: "", bank_name: "", account_number: "", account_name: "" }] };
                      }
                      return { ...prev, items: prev.items.filter((_, i) => i !== index) };
                    })
                  }
                  aria-label={`Remove request item ${index + 1}`}
                >
                  <Icon name="delete" className="text-[18px]" />
                </button>
              </div>
              <div className="grid gap-4 lg:grid-cols-[1.8fr_0.7fr_0.7fr_auto]">
                <TextField
                  label="Description"
                  value={item.description}
                  onChange={(event) =>
                    setForm((prev) => {
                      const nextItems = [...prev.items];
                      nextItems[index] = { ...nextItems[index], description: event.target.value };
                      return { ...prev, items: nextItems };
                    })
                  }
                />
                <TextField
                  label="Quantity"
                  type="number"
                  min="1"
                  value={item.quantity}
                  onChange={(event) =>
                    setForm((prev) => {
                      const nextItems = [...prev.items];
                      nextItems[index] = { ...nextItems[index], quantity: event.target.value };
                      return { ...prev, items: nextItems };
                    })
                  }
                />
                <TextField
                  label="Unit Price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={item.unit_price}
                  onChange={(event) =>
                    setForm((prev) => {
                      const nextItems = [...prev.items];
                      nextItems[index] = { ...nextItems[index], unit_price: event.target.value };
                      return { ...prev, items: nextItems };
                    })
                  }
                />
                <div className="flex items-end">
                  <div className="mb-1">
                    <Chip variant="neutral">{formatCurrency(itemTotal(item))}</Chip>
                  </div>
                </div>
              </div>
              <div className="mt-2">
                <button
                  type="button"
                  className="text-xs font-medium text-brand-600 hover:text-brand-800"
                  onClick={() =>
                    setForm((prev) => {
                      const nextItems = [...prev.items];
                      nextItems[index] = { ...nextItems[index], is_expanded: !item.is_expanded };
                      return { ...prev, items: nextItems };
                    })
                  }
                >
                  {item.is_expanded ? "Hide Details" : "+ Add More Details"}
                </button>
              </div>
              {item.is_expanded && (
                <>
                  <div className="mt-4 grid gap-4 lg:grid-cols-3">
                <div>
                  <TextAreaField
                    label="Notes"
                    value={item.notes}
                    rows={2}
                    onChange={(event) =>
                      setForm((prev) => {
                        const nextItems = [...prev.items];
                        nextItems[index] = { ...nextItems[index], notes: event.target.value };
                        return { ...prev, items: nextItems };
                      })
                    }
                    placeholder="Optional context."
                  />
                </div>
                <div>
                  <SelectField
                    label="Vendor"
                    value={item.vendor_id}
                    onChange={(event) =>
                      setForm((prev) => {
                        const nextItems = [...prev.items];
                        nextItems[index] = { ...nextItems[index], vendor_id: event.target.value };
                        return { ...prev, items: nextItems };
                      })
                    }
                  >
                    <option value="">No vendor</option>
                    {vendorOptions.map((v) => (
                      <option key={v.id} value={v.id}>{v.name}</option>
                    ))}
                  </SelectField>
                </div>
                <div>
                  <span className="field-label">Invoice File</span>
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
                    <Icon name="attach_file" className="text-[18px]" />
                    {(item.file_names || []).length ? "Change Files" : "Pick Files"}
                    <input
                      type="file"
                      className="hidden"
                      multiple
                      onChange={(event) => {
                        void handleAttachFiles(index, event.target.files);
                        event.target.value = "";
                      }}
                    />
                  </label>
                  <p className="mt-2 text-xs text-slate-500">
                    {(item.file_names || []).length
                      ? `Attached: ${(item.file_names || []).join(", ")}`
                      : "Attach invoice per item"}
                  </p>
                </div>
              </div>
              <div className="mt-4 grid gap-4 lg:grid-cols-3 border-t border-slate-100 pt-4">
                <TextField
                  label="Bank Name (Optional)"
                  value={item.bank_name || ""}
                  onChange={(event) =>
                    setForm((prev) => {
                      const nextItems = [...prev.items];
                      nextItems[index] = { ...nextItems[index], bank_name: event.target.value };
                      return { ...prev, items: nextItems };
                    })
                  }
                />
                <TextField
                  label="Account Number (Optional)"
                  value={item.account_number || ""}
                  onChange={(event) =>
                    setForm((prev) => {
                      const nextItems = [...prev.items];
                      nextItems[index] = { ...nextItems[index], account_number: event.target.value };
                      return { ...prev, items: nextItems };
                    })
                  }
                />
                <TextField
                  label="Account Name (Optional)"
                  value={item.account_name || ""}
                  onChange={(event) =>
                    setForm((prev) => {
                      const nextItems = [...prev.items];
                      nextItems[index] = { ...nextItems[index], account_name: event.target.value };
                      return { ...prev, items: nextItems };
                    })
                  }
                />
              </div>
            </>
          )}
            </div>
          ))}
        </div>
        <div className="mt-6 flex justify-center">
          <Button
            variant="secondary"
            size="sm"
            className="gap-2"
            onClick={() =>
              setForm((prev) => ({
                ...prev,
                items: [...prev.items, { description: "", quantity: "1", unit_price: "", notes: "", vendor_id: "", bank_name: "", account_number: "", account_name: "" }],
              }))
            }
          >
            <Icon name="add" className="text-[18px]" />
            Add Line Item
          </Button>
        </div>
      </SectionCard>

      {showCsvModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6" role="dialog" aria-modal="true" aria-labelledby="csv-modal-title">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowCsvModal(false)} aria-hidden="true" />
          <div className="relative w-full max-w-2xl rounded-2xl bg-white shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h2 id="csv-modal-title" className="text-lg font-semibold text-slate-900">Import CSV</h2>
              <button onClick={() => setShowCsvModal(false)} className="rounded-full p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-600">
                <Icon name="close" className="text-[20px]" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto">
              <div className="mb-4">
                <p className="text-sm text-slate-600 mb-2">Upload a CSV file containing your line items. Use headers like: Description, Quantity, Unit Price, Bank Name, Account Number, Account Name.</p>
                <div className="flex gap-2 mb-4">
                  <a href="/csv-samples/request-items-sample.csv" download className="text-brand-600 text-sm hover:underline">Download Sample CSV</a>
                </div>
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = (event) => {
                      const text = event.target?.result as string;
                      if (!text) return;
                      const lines = text.split(/\r?\n/).filter(line => line.trim() !== "");
                      if (lines.length < 2) return;
                      
                      // Very basic CSV parser handling quotes
                      const parseLine = (str: string) => {
                        const result = [];
                        let inQuotes = false;
                        let current = "";
                        for (let i = 0; i < str.length; i++) {
                          const char = str[i];
                          if (char === '"') {
                            inQuotes = !inQuotes;
                          } else if (char === ',' && !inQuotes) {
                            result.push(current.trim());
                            current = "";
                          } else {
                            current += char;
                          }
                        }
                        result.push(current.trim());
                        return result;
                      };

                      const headers = parseLine(lines[0] || "").map(h => h.toLowerCase());
                      const parsed = [];
                      for (let i = 1; i < lines.length; i++) {
                        const values = parseLine(lines[i] || "");
                        const row: any = {};
                        headers.forEach((header, index) => {
                          row[header] = values[index] !== undefined ? values[index] : "";
                        });

                        parsed.push({
                          description: row["description"] || "Imported Item",
                          unit_price: String(Number(row["unit price"] || row["unit_price"] || row["amount"]) || 0),
                          quantity: String(Number(row["quantity"]) || 1),
                          bank_name: row["bank name"] || row["bank_name"] || "",
                          account_number: row["account number"] || row["account_number"] || "",
                          account_name: row["account name"] || row["account_name"] || "",
                          notes: row["notes"] || "",
                          vendor_id: "",
                        });
                      }
                      setCsvPreview(parsed);
                    };
                    reader.readAsText(file);
                  }}
                  className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100"
                />
              </div>

              {csvPreview.length > 0 && (
                <div className="mt-4 border rounded-lg overflow-hidden">
                  <div className="bg-slate-50 px-4 py-2 font-medium text-sm border-b">Preview ({csvPreview.length} items)</div>
                  <div className="max-h-60 overflow-y-auto">
                    {csvPreview.map((item, idx) => (
                      <div key={idx} className="p-3 border-b last:border-0 text-sm">
                        <div className="font-medium">{item.description}</div>
                        <div className="text-slate-500 text-xs mt-1">
                          {item.quantity} x {formatCurrency(Number(item.unit_price) || 0)}
                          {(item.bank_name || item.account_number) && ` • Bank: ${item.bank_name} - ${item.account_number}`}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="border-t border-slate-100 bg-slate-50 px-6 py-4 flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setShowCsvModal(false)}>Cancel</Button>
              <Button variant="primary" disabled={csvPreview.length === 0} onClick={() => {
                if (csvPreview.length > 0) {
                  setForm(prev => ({ ...prev, items: [...prev.items, ...csvPreview] }));
                  setCsvPreview([]);
                  setShowCsvModal(false);
                }
              }}>Import Items</Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
});

PaymentRequestFormPage.displayName = "PaymentRequestFormPage";
