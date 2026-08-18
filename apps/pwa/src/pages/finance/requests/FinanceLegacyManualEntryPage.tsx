import { useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { useNavigate } from "react-router-dom";
import { AppShell, Button, Icon, PageHeader, TextField, SelectField, TextAreaField, useToast, SlideOver } from "@/shared";
import { DataTable } from "@/shared/components/ui/DataTable";
import { useAuth } from "@/shared/context/AuthProvider";
import { httpRequest } from "@/shared/lib/core";
import { requestApi, adminUsersApi, resourceApi, financeApi } from "@/shared/lib/core";
import { formatCurrency } from "@stanforte/shared";
import { listProjects, downloadRequestArtifact, type RequestItemInput } from "../../requests/requests-api";
import { buildAppMobileNav, buildRequestsNavigation } from "@/pages/requests/requests-data";
import { listManagedTaxonomies, type ManagedTaxonomy } from "../../requests/taxonomy-api";
import { buildCertificateOfHonorPdf, formatCertificateCurrency } from "./details/utils/certificate-pdf";
import { formatPersonName } from "@/pages/requests/request-helpers";
import { MediaPickerModal } from "@/shared/components/media/MediaPickerModal";
import { listFileAssets, uploadFileAsset, getFileAssets, deleteFileAsset } from "@/pages/files/files-api";
import type { FinanceAccountRecord, FinanceRequestDeductionRecord } from "@/shared";

type Option = { id: string; name: string };
type RequestTypeOption = Option & { categoryKey?: string | null; taxonomyKeys?: string[] | null; taxonomy_keys?: string[] | null };
type FileRef = { id: string; name: string };
type ImportAction = "create" | "update" | "skip";
type ImportPreviewRow = {
  rowKey: string;
  requestIdText: string;
  requestTypeText: string;
  staffText: string;
  action: ImportAction;
  actionOptions: ImportAction[];
  existingRequestId: string | null;
  issues: string[];
  payload: Parameters<typeof requestApi.createManualRequestEntry>[0] | null;
  ready: boolean;
};

type ManualItem = {
  description: string;
  amount: number;
  quantity: number;
  notes: string;
  file_ids: FileRef[];
};
type ManualDeductionLine = {
  deduction_type_id: string;
  rate: number;
  gross_amount: number;
  deduction_amount: number;
};
type ManualDisbursement = {
  voucher_number: string;
  amount: number;
  paid_from_account_id?: string;
  method: string;
  transaction_ref: string;
  note: string;
  disbursed_at: string;
  evidence_file_ids: FileRef[];
  retired_amount?: number;
  retirement_status?: string;
  retirement_file_ids: FileRef[];
  contact_id?: string;
  deductions?: ManualDeductionLine[];
  refund_amount?: string;
  refund_method?: string;
  refund_reference?: string;
  refund_date?: string;
  certificate_staff_name?: string;
  certificate_amount?: string;
  certificate_declaration?: string;
  certificate_reason?: string;
};

type ManualEntryPickerTarget = {
  kind: "item" | "pv" | "retirement";
  index: number;
};

const downloadBase64File = (fileName: string, mimeType: string, contentBase64: string) => {
  const bytes = atob(contentBase64);
  const array = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i += 1) array[i] = bytes.charCodeAt(i);
  const blob = new Blob([array], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
};

const normalizeText = (value: unknown) => String(value ?? "").trim();
const normalizeKey = (value: unknown) => normalizeText(value).toLowerCase();
const normalizeRequestIdValue = (value: unknown) => {
  if (value === null || value === undefined || value === "") return "";
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(Math.trunc(value));
  }
  const text = normalizeText(value);
  if (/^\d+\.0+$/.test(text)) {
    return text.replace(/\.0+$/, "");
  }
  return text;
};

const parseSpreadsheetDate = (value: unknown) => {
  if (value === null || value === undefined || value === "") return "";
  if (typeof value === "number") {
    const date = XLSX.SSF.parse_date_code(value);
    if (date) {
      const jsDate = new Date(Date.UTC(date.y, date.m - 1, date.d));
      return jsDate.toISOString().slice(0, 10);
    }
  }
  const parsed = new Date(String(value));
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString().slice(0, 10);
};

function FinanceManualEntryPage() {
  const navigate = useNavigate();
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const { user } = useAuth();
  const auth = { user };
  const roles = (auth.user?.roles ?? []).map((r) => String(r).toLowerCase());
  const allowed = roles.some((r) => 
    r === "admin" || 
    r === "super-admin" || 
    r === "administrator" || 
    r.includes("admin") ||
    r === "finance_manager" || 
    r === "finance-manager" || 
    r === "finance manager" ||
    r.includes("finance_manager") ||
    r.includes("finance-manager")
  );

  const { showToast } = useToast();
  const [notice, setNotice] = useState<{ tone: any; message: string } | null>(null);
  useEffect(() => {
    if (notice) showToast({ tone: notice.tone as any, message: notice.message, title: 'Notice' });
  }, [notice, showToast]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [requestId, setRequestId] = useState<string>("");
  const [voucherId, setVoucherId] = useState<string>("");
  const [lookupId, setLookupId] = useState<string>("");
  const [editingId, setEditingId] = useState<string>("");
  const [checkingNumber, setCheckingNumber] = useState(false);
  const [numberExists, setNumberExists] = useState<{ exists: boolean; requestId: string | null }>({
    exists: false,
    requestId: null,
  });
  const [checkingVoucherIndex, setCheckingVoucherIndex] = useState<number | null>(null);
  const [voucherExistsByIndex, setVoucherExistsByIndex] = useState<Record<number, string | null>>({});
  const [importingPreview, setImportingPreview] = useState(false);
  const [importingCommit, setImportingCommit] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importRows, setImportRows] = useState<ImportPreviewRow[]>([]);

  const [requestCreatorName, setRequestCreatorName] = useState<string>("");

  const [staffOptions, setStaffOptions] = useState<Option[]>([]);
  const [typeOptions, setTypeOptions] = useState<RequestTypeOption[]>([]);
  const [teamOptions, setTeamOptions] = useState<Option[]>([]);
  const [organizationOptions, setOrganizationOptions] = useState<Option[]>([]);
  const [projectOptions, setProjectOptions] = useState<Option[]>([]);
  const [categoryOptions, setCategoryOptions] = useState<Option[]>([]);
  const [taxonomyOptions, setTaxonomyOptions] = useState<ManagedTaxonomy[]>([]);
  const [financeAccounts, setFinanceAccounts] = useState<FinanceAccountRecord[]>([]);
  const [fundOptions, setFundOptions] = useState<Array<{ id: string; code: string; name: string }>>([]);
  const [grantOptions, setGrantOptions] = useState<Array<{ id: string; code: string; name: string; fundId: string | null }>>([]);
  const [vendorOptions, setVendorOptions] = useState<Array<{ id: string; name: string; company_name?: string }>>([]);
  const [deductionTypeOptions, setDeductionTypeOptions] = useState<Array<{ id: string; name: string; rate: number }>>([]);
  const [deductionsOpenByIndex, setDeductionsOpenByIndex] = useState<Record<number, boolean>>({});
  const [certOpenByIndex, setCertOpenByIndex] = useState<Record<number, boolean>>({});
  const [generatingCertIndex, setGeneratingCertIndex] = useState<number | null>(null);
  const [certAssetsByIndex, setCertAssetsByIndex] = useState<Record<number, { id: string; file_name: string; previewUrl: string }[]>>({});
  const [requestDeductions, setRequestDeductions] = useState<FinanceRequestDeductionRecord[]>([]);
  const [signatoryDefaults, setSignatoryDefaults] = useState<{ prepared_by: { name: string; title: string }; reviewed_by: { name: string; title: string }; approved_by: { name: string; title: string } }>({ prepared_by: { name: "", title: "" }, reviewed_by: { name: "", title: "" }, approved_by: { name: "", title: "" } });
  const [mediaPickerTarget, setMediaPickerTarget] = useState<ManualEntryPickerTarget | null>(null);
  const [form, setForm] = useState({
    request_type_id: "",
    staff_id: "",
    request_id: "",
    team_id: "",
    organization_id: "",
    project_id: "",
    fund_id: "",
    grant_id: "",
    category_id: "",
    status: "completed",
    created_at: "",
    due_date: "",
    purpose: "",
    submission_comment: "Please make payment for the listed items.",
    currency: "NGN",
    approvals: {
      team_lead_name: "",
      team_lead_date: "",
      team_lead_comment: "Approved.",
      accountant_name: "",
      accountant_date: "",
      accountant_comment: "Cleared.",
      coo_name: "",
      coo_date: "",
      coo_comment: "Approved.",
      ed_name: "",
      ed_date: "",
      ed_comment: "Approved.",
      include_ed: false,
    },
  });

  const [items, setItems] = useState<ManualItem[]>([
    { description: "", amount: 0, quantity: 1, notes: "", file_ids: [] },
  ]);
  const [disbursements, setDisbursements] = useState<ManualDisbursement[]>([
    {
      voucher_number: "",
      amount: 0,
      paid_from_account_id: "",
      method: "bank_transfer",
      transaction_ref: "",
      note: "",
      disbursed_at: "",
      evidence_file_ids: [],
      retired_amount: 0,
      retirement_status: "not_retired",
      retirement_file_ids: [],
      contact_id: "",
      deductions: [],
      refund_amount: "",
      refund_method: "bank_transfer",
      refund_reference: "",
      refund_date: "",
      certificate_staff_name: "",
      certificate_amount: "",
      certificate_declaration: "",
      certificate_reason: "",
    },
  ]);
  const currentUserId = user?.id ? String(user.id) : undefined;

  const resetManualForm = () => {
    setRequestId("");
    setVoucherId("");
    setLookupId("");
    setEditingId("");
    setRequestCreatorName("");
    setNumberExists({ exists: false, requestId: null });
    setForm({
      request_type_id: "",
      staff_id: "",
      request_id: "",
      team_id: "",
      organization_id: "",
      project_id: "",
      fund_id: "",
      grant_id: "",
      category_id: "",
      status: "completed",
      created_at: "",
      due_date: "",
      purpose: "",
      submission_comment: "Please make payment for the listed items.",
      currency: "NGN",
      approvals: {
        team_lead_name: "",
        team_lead_date: "",
        team_lead_comment: "Approved.",
        accountant_name: signatoryDefaults.prepared_by.name,
        accountant_date: "",
        accountant_comment: "Cleared.",
        coo_name: signatoryDefaults.reviewed_by.name,
        coo_date: "",
        coo_comment: "Approved.",
        ed_name: signatoryDefaults.approved_by.name,
        ed_date: "",
        ed_comment: "Approved.",
        include_ed: false,
      },
    });
    setRequestDeductions([]);
    setItems([{ description: "", amount: 0, quantity: 1, notes: "", file_ids: [] }]);
    setDisbursements([
      {
        voucher_number: "",
        amount: 0,
        paid_from_account_id: "",
        method: "bank_transfer",
        transaction_ref: "",
        note: "",
        disbursed_at: "",
        evidence_file_ids: [],
        retired_amount: 0,
        retirement_status: "not_retired",
        retirement_file_ids: [],
        contact_id: "",
        deductions: [],
        refund_amount: "",
        refund_method: "bank_transfer",
        refund_reference: "",
        refund_date: "",
        certificate_declaration: "",
        certificate_reason: "",
      },
    ]);
  };

  const itemsTotal = useMemo(
    () => items.reduce((sum, item) => sum + Number(item.amount || 0) * Number(item.quantity || 1), 0),
    [items]
  );
  const approvalNameOptions = useMemo(
    () =>
      Array.from(
        new Set(
          staffOptions
            .map((option: any) => option.name.trim())
            .filter((name) => Boolean(name))
        )
      ).sort((a, b) => a.localeCompare(b)),
    [staffOptions]
  );
  const filteredGrantOptions = useMemo(
    () => (form.fund_id ? grantOptions.filter((grant) => grant.fundId === form.fund_id) : grantOptions),
    [grantOptions, form.fund_id]
  );
  const staffLookup = useMemo(() => {
    const map = new Map<string, Option>();
    staffOptions.forEach((item: any) => {
      map.set(normalizeKey(item.id), item);
      map.set(normalizeKey(item.name), item);
    });
    return map;
  }, [staffOptions]);
  const requestTypeLookup = useMemo(() => {
    const map = new Map<string, RequestTypeOption>();
    typeOptions.forEach((item: any) => {
      map.set(normalizeKey(item.id), item);
      map.set(normalizeKey(item.name), item);
    });
    return map;
  }, [typeOptions]);
  const teamLookup = useMemo(() => {
    const map = new Map<string, Option>();
    teamOptions.forEach((item: any) => {
      map.set(normalizeKey(item.id), item);
      map.set(normalizeKey(item.name), item);
    });
    return map;
  }, [teamOptions]);
  const organizationLookup = useMemo(() => {
    const map = new Map<string, Option>();
    organizationOptions.forEach((item: any) => {
      map.set(normalizeKey(item.id), item);
      map.set(normalizeKey(item.name), item);
    });
    return map;
  }, [organizationOptions]);
  const projectLookup = useMemo(() => {
    const map = new Map<string, Option>();
    projectOptions.forEach((item: any) => {
      map.set(normalizeKey(item.id), item);
      map.set(normalizeKey(item.name), item);
    });
    return map;
  }, [projectOptions]);
  const fundLookup = useMemo(() => {
    const map = new Map<string, { id: string; code: string; name: string }>();
    fundOptions.forEach((item: any) => {
      map.set(normalizeKey(item.id), item);
      map.set(normalizeKey(item.name), item);
      map.set(normalizeKey(item.code), item);
      map.set(normalizeKey(`${item.code} ${item.name}`), item);
    });
    return map;
  }, [fundOptions]);
  const grantLookup = useMemo(() => {
    const map = new Map<string, { id: string; code: string; name: string; fundId: string | null }>();
    grantOptions.forEach((item: any) => {
      map.set(normalizeKey(item.id), item);
      map.set(normalizeKey(item.name), item);
      map.set(normalizeKey(item.code), item);
      map.set(normalizeKey(`${item.code} ${item.name}`), item);
    });
    return map;
  }, [grantOptions]);
  const accountLookup = useMemo(() => {
    const map = new Map<string, FinanceAccountRecord>();
    financeAccounts.forEach((item: any) => {
      map.set(normalizeKey(item.id), item);
      map.set(normalizeKey(item.name), item);
      if (item.code) map.set(normalizeKey(item.code), item);
      map.set(normalizeKey(`${item.code || ""} ${item.name}`), item);
    });
    return map;
  }, [financeAccounts]);
  const taxonomyTermLookup = useMemo(() => {
    const map = new Map<string, { id: string; taxonomyKey: string }>();
    taxonomyOptions.forEach((taxonomy) => {
      (taxonomy.terms || []).forEach((term: any) => {
        map.set(normalizeKey(term.id), { id: term.id, taxonomyKey: taxonomy.key });
        map.set(normalizeKey(term.label), { id: term.id, taxonomyKey: taxonomy.key });
        map.set(normalizeKey(term.value), { id: term.id, taxonomyKey: taxonomy.key });
      });
    });
    return map;
  }, [taxonomyOptions]);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [users, groups, teams, orgs, projects, taxonomies, accounts, funds, grants, vendors, deductionTypes, settings] = await Promise.all([
          adminUsersApi.listUsers({ page: 1, per_page: 200 }),
          requestApi.listGroups(),
          resourceApi.listGroups({ active_only: false }),
          resourceApi.listOrganizations(),
          listProjects(),
          listManagedTaxonomies({ include_inactive: false }),
          resourceApi.listFinanceAccounts({ is_active: true }).catch(() => ({ result: [], total: 0, total_result: 0, per_page: 20, page: 1, pages: 1 })),
          financeApi.listFunds({ is_active: true }).catch(() => []),
          financeApi.listGrants({ status: "active" }).catch(() => []),
          financeApi.listContacts({ contact_type: "vendor", per_page: 200 }).catch(() => ({ result: [] })),
          financeApi.listDeductionTypes({ is_active: true }).catch(() => []),
          financeApi.getSettings().catch(() => ({})),
        ]);
        const cfg = (settings || {}) as Record<string, any>;
        const toSig = (key: string) => ({ name: String((cfg[key] as any)?.name ?? ""), title: String((cfg[key] as any)?.title ?? "") });
        setSignatoryDefaults({ prepared_by: toSig("prepared_by"), reviewed_by: toSig("reviewed_by"), approved_by: toSig("approved_by") });
        setStaffOptions(
          users.data.map((u: any) => ({
            id: u.id,
            name: `${u.firstName || ""} ${u.lastName || ""}`.trim() || u.username || u.email,
          }))
        );
        const financeGroup = groups.find((g: any) => g.code?.toLowerCase() === "fin" || g.name?.toLowerCase() === "finance");
        const requestTypes = await requestApi.listTypes(financeGroup ? { group_id: financeGroup.id } : undefined);
        setTypeOptions(requestTypes.map((t: any) => ({ id: t.id, name: t.name, categoryKey: t.category_key, taxonomyKeys: t.taxonomyKeys ?? t.taxonomy_keys ?? [], taxonomy_keys: t.taxonomy_keys ?? t.taxonomyKeys ?? [] })));
        setTeamOptions(teams.map((t: any) => ({ id: t.id, name: t.name })));
        setOrganizationOptions(orgs.map((o: any) => ({ id: o.id, name: o.name })));
        setProjectOptions(projects.map((p: any) => ({ id: p.id, name: p.name })));
        setTaxonomyOptions(taxonomies);
        setFinanceAccounts(accounts?.result || []);
        setFundOptions((funds || []).map((fund: any) => ({ id: String(fund.id), code: String(fund.code || ""), name: String(fund.name || "") })));
        setGrantOptions(
          (grants || []).map((grant: any) => ({
            id: String(grant.id),
            code: String(grant.code || ""),
            name: String(grant.name || ""),
            fundId: grant.fund ? String(grant.fund.id) : null,
          }))
        );
        setVendorOptions(
          ((vendors as any)?.result || []).map((v: any) => ({
            id: String(v.id),
            name: String(v.name || ""),
            company_name: v.company_name ? String(v.company_name) : undefined,
          }))
        );
        setDeductionTypeOptions(
          (deductionTypes as any[] || []).map((t: any) => ({
            id: String(t.id),
            name: String(t.name || ""),
            rate: Number(t.rate || 0),
          }))
        );
      } catch (error: any) {
        setNotice({ tone: "error", message: error?.response?.data?.error?.message || "Unable to load manual entry options." });
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  useEffect(() => {
    if (!editingId && signatoryDefaults.prepared_by.name) {
      setForm((prev) => ({
        ...prev,
        approvals: {
          ...prev.approvals,
          accountant_name: prev.approvals.accountant_name || signatoryDefaults.prepared_by.name,
          coo_name: prev.approvals.coo_name || signatoryDefaults.reviewed_by.name,
          ed_name: prev.approvals.ed_name || signatoryDefaults.approved_by.name,
        },
      }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signatoryDefaults]);

  useEffect(() => {
    const manualNumber = String(form.request_id || "").trim();
    if (!manualNumber) {
      setNumberExists({ exists: false, requestId: null });
      return;
    }
    if (!/^\d+$/.test(manualNumber)) {
      setNumberExists({ exists: true, requestId: null });
      return;
    }

    const timer = window.setTimeout(async () => {
      try {
        setCheckingNumber(true);
        const result = await requestApi.checkManualRequestNumber(manualNumber, {
          request_type_id: form.request_type_id || undefined,
          exclude_id: editingId || undefined,
        });
        setNumberExists({ exists: Boolean(result.exists), requestId: result.request_id });
      } catch {
        setNumberExists({ exists: false, requestId: null });
      } finally {
        setCheckingNumber(false);
      }
    }, 1200);

    return () => window.clearTimeout(timer);
  }, [form.request_id, form.request_type_id, editingId]);

  useEffect(() => {
    const selectedType = typeOptions.find((item: any) => item.id === form.request_type_id);
    const preferredTaxonomyKey =
      selectedType?.taxonomyKeys?.[0] ??
      selectedType?.taxonomy_keys?.[0] ??
      selectedType?.categoryKey ??
      "finance_request_category";
    const preferred = taxonomyOptions.find((item: any) => item.key.trim().toLowerCase() === String(preferredTaxonomyKey).trim().toLowerCase());
    const fallback = taxonomyOptions.find((item: any) => item.key === "finance_request_category") ?? taxonomyOptions[0];
    const activeTaxonomy = preferred ?? fallback;
    const options = (activeTaxonomy?.terms ?? []).map((term: any) => ({ id: term.id, name: term.label }));
    setCategoryOptions(options);
    if (form.category_id && !options.some((option: any) => option.id === form.category_id)) {
      setForm((prev) => ({ ...prev, category_id: "" }));
    }
  }, [form.request_type_id, form.category_id, typeOptions, taxonomyOptions]);

  useEffect(() => {
    setForm((prev) => {
      if (!prev.grant_id) return prev;
      const exists = filteredGrantOptions.some((grant) => grant.id === prev.grant_id);
      return exists ? prev : { ...prev, grant_id: "" };
    });
  }, [filteredGrantOptions]);

  const buildManualPayload = (input: {
    requestTypeId: string;
    staffId: string;
    requestId?: string;
    teamId?: string;
    organizationId?: string;
    status?: string;
    createdAt?: string;
    currency?: string;
    purpose?: string;
    dueDate?: string;
    categoryId?: string;
    projectId?: string;
    projectName?: string;
    fundId?: string;
    grantId?: string;
    approvals?: Array<{ role: string; name?: string; date?: string; done?: boolean }>;
    items?: ManualItem[];
    disbursements?: ManualDisbursement[];
  }) => ({
    request_type_id: input.requestTypeId,
    staff_id: input.staffId,
    request_id: input.requestId || undefined,
    team_id: input.teamId || undefined,
    organization_id: input.organizationId || undefined,
    status: input.status || "completed",
    created_at: input.createdAt || undefined,
    currency: input.currency || "NGN",
    total_amount: (input.items || []).reduce(
      (sum, item) => sum + Number(item.amount || 0) * Number(item.quantity || 1),
      0
    ),
    data: {
      purpose: input.purpose || undefined,
      due_date: input.dueDate || undefined,
      category_id: input.categoryId || undefined,
      project_name: input.projectName || undefined,
      project_id: input.projectId || undefined,
      fund_id: input.fundId || undefined,
      grant_id: input.grantId || undefined,
      team_id: input.teamId || undefined,
      organization_id: input.organizationId || undefined,
    },
    approvals: input.approvals || [],
    items: (input.items || []).map((item: any) => ({
      description: item.description,
      amount: Number(item.amount || 0),
      quantity: Number(item.quantity || 1),
      notes: item.notes,
      file_id: item.file_ids[0]?.id || undefined,
      file_ids: item.file_ids.length ? item.file_ids.map((f: FileRef) => f.id) : undefined,
    })),
    disbursements: (input.disbursements || [])
      .filter((entry) => Number(entry.amount) > 0)
      .map((entry) => {
        const deductions = (entry.deductions || []).filter((d) => d.deduction_type_id && d.deduction_amount > 0);
        const pvNet = Number(entry.amount);
        const firstDedGross = deductions[0]?.gross_amount ?? pvNet;
        return {
          voucher_number: entry.voucher_number,
          amount: pvNet,
          gross_amount: deductions.length > 0 ? firstDedGross : undefined,
          net_amount: deductions.length > 0 ? pvNet : undefined,
          paid_from_account_id: entry.paid_from_account_id || undefined,
          method: entry.method || undefined,
          transaction_ref: entry.transaction_ref || undefined,
          note: entry.note || undefined,
          disbursed_at: entry.disbursed_at || undefined,
          evidence_file_ids: entry.evidence_file_ids.length ? entry.evidence_file_ids.map((f) => f.id) : undefined,
          retired_amount: Number(entry.retired_amount || 0),
          retirement_status: entry.retirement_status || undefined,
          retirement_file_ids: entry.retirement_file_ids.map((f) => f.id),
          contact_id: entry.contact_id || undefined,
          deductions: deductions.length > 0 ? deductions : undefined,
          refund_amount: entry.refund_amount ? Number(entry.refund_amount) : undefined,
          refund_method: entry.refund_method || undefined,
          refund_reference: entry.refund_reference || undefined,
          refund_date: entry.refund_date || undefined,
        };
      }),
  });

  const downloadBatchTemplate = () => {
    const workbook = XLSX.utils.book_new();
    const requestSheet = XLSX.utils.json_to_sheet([
      {
        request_id: 3001,
        request_type: "Operational Request",
        staff_email_or_name: "staff@stanforteedge.com",
        team: "Finance",
        organization: "Stanforte Edge",
        status: "completed",
        created_at: "2026-03-24",
        currency: "NGN",
        purpose: "Legacy expense import",
        due_date: "2026-03-24",
        category: "Operations",
        project: "",
        fund: "",
        grant: "",
      },
    ]);
    const itemSheet = XLSX.utils.json_to_sheet([
      { request_id: 3001, description: "Internet subscription", amount: 50000, quantity: 1, notes: "" },
    ]);
    const approvalSheet = XLSX.utils.json_to_sheet([
      { request_id: 3001, role: "team_lead", name: "Jane Doe", date: "2026-03-24", done: true },
      { request_id: 3001, role: "accountant", name: "John Doe", date: "2026-03-24", done: true },
    ]);
    const voucherSheet = XLSX.utils.json_to_sheet([
      {
        request_id: 3001,
        voucher_number: 3001,
        amount: 50000,
        paid_from_account: "GESP",
        method: "bank_transfer",
        transaction_ref: "",
        note: "",
        disbursed_at: "2026-03-24",
        retired_amount: 0,
        retirement_status: "not_retired",
      },
    ]);
    XLSX.utils.book_append_sheet(workbook, requestSheet, "Requests");
    XLSX.utils.book_append_sheet(workbook, itemSheet, "Items");
    XLSX.utils.book_append_sheet(workbook, approvalSheet, "Approvals");
    XLSX.utils.book_append_sheet(workbook, voucherSheet, "Vouchers");
    XLSX.writeFile(workbook, "manual-request-import-template.xlsx");
  };

  const buildImportPreviewRows = async (workbook: XLSX.WorkBook) => {
    const requestSheet = workbook.Sheets.Requests || workbook.Sheets[workbook.SheetNames[0]];
    const requests = XLSX.utils.sheet_to_json<Record<string, unknown>>(requestSheet, { defval: "" });
    const itemsSheet = workbook.Sheets.Items
      ? XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets.Items, { defval: "" })
      : [];
    const approvalsSheet = workbook.Sheets.Approvals
      ? XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets.Approvals, { defval: "" })
      : [];
    const vouchersSheet = workbook.Sheets.Vouchers
      ? XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets.Vouchers, { defval: "" })
      : [];

    const itemsByRequest = new Map<string, Record<string, unknown>[]>();
    const approvalsByRequest = new Map<string, Record<string, unknown>[]>();
    const vouchersByRequest = new Map<string, Record<string, unknown>[]>();
    itemsSheet.forEach((row: any) => {
      const key = normalizeRequestIdValue(row.request_id);
      if (!key) return;
      itemsByRequest.set(key, [...(itemsByRequest.get(key) || []), row]);
    });
    approvalsSheet.forEach((row: any) => {
      const key = normalizeRequestIdValue(row.request_id);
      if (!key) return;
      approvalsByRequest.set(key, [...(approvalsByRequest.get(key) || []), row]);
    });
    vouchersSheet.forEach((row: any) => {
      const key = normalizeRequestIdValue(row.request_id);
      if (!key) return;
      vouchersByRequest.set(key, [...(vouchersByRequest.get(key) || []), row]);
    });

    const previewRows = await Promise.all(
      requests
        .filter((row: any) => normalizeRequestIdValue(row.request_id))
        .map(async (row: any) => {
          const requestIdText = normalizeRequestIdValue(row.request_id);
          const requestTypeText = normalizeText(row.request_type);
          const staffText = normalizeText(row.staff_email_or_name || row.staff || row.staff_email);
          const issues: string[] = [];

          const requestType = requestTypeLookup.get(normalizeKey(requestTypeText));
          if (!requestType) issues.push(`Unknown request type: ${requestTypeText}`);
          const staff = staffLookup.get(normalizeKey(staffText));
          if (!staff) issues.push(`Unknown staff: ${staffText}`);
          const team = normalizeText(row.team) ? teamLookup.get(normalizeKey(row.team)) : undefined;
          if (normalizeText(row.team) && !team) issues.push(`Unknown team: ${normalizeText(row.team)}`);
          const organization = normalizeText(row.organization)
            ? organizationLookup.get(normalizeKey(row.organization))
            : undefined;
          if (normalizeText(row.organization) && !organization) {
            issues.push(`Unknown organization: ${normalizeText(row.organization)}`);
          }
          const project = normalizeText(row.project) ? projectLookup.get(normalizeKey(row.project)) : undefined;
          if (normalizeText(row.project) && !project) issues.push(`Unknown project: ${normalizeText(row.project)}`);
          const fund = normalizeText(row.fund) ? fundLookup.get(normalizeKey(row.fund)) : undefined;
          if (normalizeText(row.fund) && !fund) issues.push(`Unknown fund: ${normalizeText(row.fund)}`);
          const grant = normalizeText(row.grant) ? grantLookup.get(normalizeKey(row.grant)) : undefined;
          if (normalizeText(row.grant) && !grant) issues.push(`Unknown grant: ${normalizeText(row.grant)}`);

          const taxonomyTerm = normalizeText(row.category)
            ? taxonomyTermLookup.get(normalizeKey(row.category))
            : undefined;
          if (normalizeText(row.category) && !taxonomyTerm) issues.push(`Unknown category: ${normalizeText(row.category)}`);

          let existingRequestId: string | null = null;
          if (/^\d+$/.test(requestIdText) && requestType?.id) {
            const check = await requestApi.checkManualRequestNumber(requestIdText, { request_type_id: requestType.id });
            existingRequestId = check.exists ? check.request_id : null;
          } else {
            issues.push("request_id must be digits only");
          }

          const voucherRows = (vouchersByRequest.get(requestIdText) || []).map((entry) => {
            const voucherNumber = normalizeText(entry.voucher_number);
            return {
              voucher_number: voucherNumber,
              amount: Number(entry.amount || 0),
              paid_from_account_id: normalizeText(entry.paid_from_account)
                ? accountLookup.get(normalizeKey(entry.paid_from_account))?.id
                : undefined,
              method: normalizeText(entry.method) || "bank_transfer",
              transaction_ref: normalizeText(entry.transaction_ref) || "",
              note: normalizeText(entry.note) || "",
              disbursed_at: parseSpreadsheetDate(entry.disbursed_at),
              retired_amount: Number(entry.retired_amount || 0),
              retirement_status: normalizeText(entry.retirement_status) || "not_retired",
              evidence_file_ids: [],
              retirement_file_ids: [],
              contact_id: "",
              deductions: [],
              refund_amount: "",
              refund_method: "bank_transfer",
              refund_reference: "",
              refund_date: "",
              certificate_staff_name: "",
              certificate_amount: "",
              certificate_declaration: "",
              certificate_reason: "",
            } as ManualDisbursement;
          });

          for (const voucherRow of vouchersByRequest.get(requestIdText) || []) {
            const voucherNumber = normalizeText(voucherRow.voucher_number);
            if (!voucherNumber) continue;
            if (!/^\d+$/.test(voucherNumber)) {
              issues.push(`Invalid voucher_number: ${voucherNumber}`);
              continue;
            }
            const voucherCheck = await requestApi.checkManualVoucherNumber(voucherNumber);
            if (voucherCheck.exists && voucherCheck.request_id !== existingRequestId) {
              issues.push(`Voucher ${voucherNumber} already exists on request ${voucherCheck.request_id}`);
            }
          }

          if ((vouchersByRequest.get(requestIdText) || []).some((entry) => normalizeText(entry.paid_from_account) && !accountLookup.get(normalizeKey(entry.paid_from_account)))) {
            issues.push("One or more paid_from_account values could not be matched");
          }

          const payload =
            requestType && staff
              ? buildManualPayload({
                  requestTypeId: requestType.id,
                  staffId: staff.id,
                  requestId: requestIdText,
                  teamId: team?.id,
                  organizationId: organization?.id,
                  status: normalizeText(row.status) || "completed",
                  createdAt: parseSpreadsheetDate(row.created_at),
                  currency: normalizeText(row.currency) || "NGN",
                  purpose: normalizeText(row.purpose),
                  dueDate: parseSpreadsheetDate(row.due_date),
                  categoryId: taxonomyTerm?.id,
                  projectId: project?.id,
                  projectName: project?.name,
                  fundId: fund?.id,
                  grantId: grant?.id,
                  approvals: (approvalsByRequest.get(requestIdText) || []).map((entry) => ({
                    role: normalizeText(entry.role),
                    name: normalizeText(entry.name) || undefined,
                    date: parseSpreadsheetDate(entry.date) || undefined,
                    done: ["true", "1", "yes"].includes(normalizeKey(entry.done)),
                  })),
                  items: (itemsByRequest.get(requestIdText) || []).map((entry) => ({
                    description: normalizeText(entry.description),
                    amount: Number(entry.amount || 0),
                    quantity: Number(entry.quantity || 1),
                    notes: normalizeText(entry.notes) || "",
                    file_ids: [] as FileRef[],
                  })),
                  disbursements: voucherRows,
                })
              : null;

          const actionOptions: ImportAction[] = existingRequestId ? ["update", "skip"] : ["create", "skip"];
          return {
            rowKey: requestIdText,
            requestIdText,
            requestTypeText,
            staffText,
            action: existingRequestId ? "update" : "create",
            actionOptions,
            existingRequestId,
            issues,
            payload,
            ready: issues.length === 0 && Boolean(payload),
          } satisfies ImportPreviewRow;
        })
    );

    return previewRows;
  };

  const handleBatchImportFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      setImportingPreview(true);
      setNotice(null);
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: "array" });
      if (!workbook.SheetNames.length) {
        throw new Error("The import file does not contain any worksheet.");
      }
      const previewRows = await buildImportPreviewRows(workbook);
      setImportRows(previewRows);
      setShowImportDialog(true);
      setNotice({
        tone: previewRows.some((row: any) => row.ready) ? "success" : "warning",
        message: `Loaded ${previewRows.length} import row(s). Review actions before commit.`,
      });
    } catch (error: any) {
      setNotice({ tone: "error", message: error?.message || "Unable to parse import file." });
    } finally {
      setImportingPreview(false);
      event.target.value = "";
    }
  };

  const commitBatchImport = async () => {
    const actionableRows = importRows.filter((row: any) => row.action !== "skip");
    if (!actionableRows.length) {
      setNotice({ tone: "warning", message: "No rows selected for import." });
      return;
    }
    try {
      setImportingCommit(true);
      const results: string[] = [];
      let successCount = 0;
      for (const row of actionableRows) {
        if (!row.payload) {
          results.push(`Request ${row.requestIdText}: missing payload`);
          continue;
        }
        try {
          if (row.action === "update" && row.existingRequestId) {
            await requestApi.updateManualRequestEntry(row.existingRequestId, row.payload);
          } else {
            await requestApi.createManualRequestEntry(row.payload);
          }
          successCount += 1;
        } catch (error: any) {
          results.push(
            `Request ${row.requestIdText}: ${
              error?.response?.data?.error?.message || error?.message || "Import failed"
            }`
          );
        }
      }
      setShowImportDialog(false);
      setImportRows([]);
      setNotice({
        tone: results.length ? "warning" : "success",
        message: results.length
          ? `Imported ${successCount} row(s). ${results.slice(0, 3).join(" | ")}${results.length > 3 ? " ..." : ""}`
          : `Imported ${successCount} row(s) successfully.`,
      });
    } finally {
      setImportingCommit(false);
    }
  };

  const saveManualRequest = async (disbursementsOverride?: typeof disbursements) => {
    const dibs = disbursementsOverride ?? disbursements;
    if (!form.request_type_id || !form.staff_id) {
      setNotice({ tone: "warning", message: "Request type and staff are required." });
      return;
    }
    if (form.request_id && !/^\d+$/.test(form.request_id)) {
      setNotice({ tone: "warning", message: "Request ID must be digits only (e.g. 25)." });
      return;
    }
    if (numberExists.exists && numberExists.requestId && numberExists.requestId !== editingId) {
      setNotice({ tone: "warning", message: `Request ID already exists (Request ID ${numberExists.requestId}).` });
      return;
    }
    const voucherRows = dibs
      .map((row, index) => ({ row, index }))
      .filter(({ row }) => String(row.voucher_number || "").trim().length > 0);
    for (const { row, index } of voucherRows) {
      const rawVoucherNumber = String(row.voucher_number || "").trim();
      const exists = await requestApi.checkManualVoucherNumber(rawVoucherNumber, {
        exclude_request_id: editingId || undefined,
      });
      if (exists.exists) {
        setNotice({
          tone: "warning",
          message: `PV voucher ID ${rawVoucherNumber} already exists on request ${exists.request_id}.`,
        });
        return;
      }
    }
    try {
      setSaving(true);
      setNotice(null);
      const defaultDate = form.created_at || undefined;
      const approvals = [
        { role: "team_lead", name: form.approvals.team_lead_name, date: form.approvals.team_lead_date || defaultDate, done: !!form.approvals.team_lead_name, comment: form.approvals.team_lead_comment || undefined },
        { role: "accountant", name: form.approvals.accountant_name, date: form.approvals.accountant_date || defaultDate, done: !!form.approvals.accountant_name, comment: form.approvals.accountant_comment || undefined },
        { role: "coo", name: form.approvals.coo_name, date: form.approvals.coo_date || defaultDate, done: !!form.approvals.coo_name, comment: form.approvals.coo_comment || undefined },
        ...(form.approvals.include_ed
          ? [{ role: "ed", name: form.approvals.ed_name, date: form.approvals.ed_date || defaultDate, done: !!form.approvals.ed_name, comment: form.approvals.ed_comment || undefined }]
          : []),
      ];
      const selectedProjectName =
        projectOptions.find((project) => project.id === form.project_id)?.name || undefined;

      const payload = {
        request_type_id: form.request_type_id,
        staff_id: form.staff_id,
        request_id: form.request_id || undefined,
        team_id: form.team_id || undefined,
        organization_id: form.organization_id || undefined,
        status: form.status,
        created_at: form.created_at || undefined,
        currency: form.currency,
        total_amount: itemsTotal,
        data: {
          purpose: form.purpose || undefined,
          submission_comment: form.submission_comment || undefined,
          due_date: form.due_date || undefined,
          category_id: form.category_id || undefined,
          project_name: selectedProjectName,
          project_id: form.project_id || undefined,
          fund_id: form.fund_id || undefined,
          grant_id: form.grant_id || undefined,
          team_id: form.team_id || undefined,
          organization_id: form.organization_id || undefined,
        },
        approvals,
        items: items.map((item: any) => ({
          description: item.description,
          amount: Number(item.amount || 0),
          quantity: Number(item.quantity || 1),
          notes: item.notes,
          file_id: item.file_ids?.[0]?.id || undefined,
          file_ids: item.file_ids?.length ? item.file_ids.map((file: FileRef) => file.id) : undefined,
        })),
        disbursements: dibs
          .filter((d) => d.voucher_number && Number(d.amount) > 0)
          .map((d) => {
            const deductions = (d.deductions || []).filter((dl) => dl.deduction_type_id && dl.deduction_amount > 0);
            const pvNet = Number(d.amount);
            const firstDedGross = deductions[0]?.gross_amount ?? pvNet;
            return {
              voucher_number: d.voucher_number,
              amount: pvNet,
              gross_amount: deductions.length > 0 ? firstDedGross : undefined,
              net_amount: deductions.length > 0 ? pvNet : undefined,
              paid_from_account_id: d.paid_from_account_id || undefined,
              method: d.method || undefined,
              transaction_ref: d.transaction_ref || undefined,
              note: d.note || undefined,
              disbursed_at: d.disbursed_at || undefined,
              evidence_file_ids: d.evidence_file_ids.length ? d.evidence_file_ids.map((f) => f.id) : undefined,
              retired_amount: Number(d.retired_amount || 0),
              retirement_status: d.retirement_status || undefined,
              retirement_file_ids: d.retirement_file_ids.map((f) => f.id),
              contact_id: d.contact_id || undefined,
              deductions: deductions.length > 0 ? deductions : undefined,
              refund_amount: d.refund_amount ? Number(d.refund_amount) : undefined,
              refund_method: d.refund_method || undefined,
              refund_reference: d.refund_reference || undefined,
              refund_date: d.refund_date || undefined,
            };
          }),
      };
      const created = editingId
        ? await requestApi.updateManualRequestEntry(editingId, payload)
        : await requestApi.createManualRequestEntry(payload);

      setRequestId(created.id);
      setEditingId(created.id);
      const firstVoucher = (created as any)?.payment_vouchers?.[0]?.id || "";
      setVoucherId(firstVoucher);
      setNotice({ tone: "success", message: editingId ? "Manual request updated successfully." : "Manual request saved successfully." });
    } catch (error: any) {
      setNotice({ tone: "error", message: error?.response?.data?.error?.message || "Unable to save manual request." });
    } finally {
      setSaving(false);
    }
  };

  const checkVoucherNumberAtIndex = async (index: number) => {
    const rawVoucherNumber = String(disbursements[index]?.voucher_number || "").trim();
    if (!rawVoucherNumber) {
      setVoucherExistsByIndex((prev) => ({ ...prev, [index]: null }));
      return;
    }
    try {
      setCheckingVoucherIndex(index);
      const exists = await requestApi.checkManualVoucherNumber(rawVoucherNumber, {
        exclude_request_id: editingId || undefined,
      });
      setVoucherExistsByIndex((prev) => ({
        ...prev,
        [index]: exists.exists ? `Already exists on request ${exists.request_id}.` : null,
      }));
    } catch {
      setVoucherExistsByIndex((prev) => ({ ...prev, [index]: null }));
    } finally {
      setCheckingVoucherIndex((current) => (current === index ? null : current));
    }
  };

  const loadForEdit = async () => {
    if (!lookupId.trim()) return;
    try {
      setLoading(true);
      const req = await httpRequest<any>(`/requests/${lookupId}`);
      const pvsResponse = await financeApi.listPaymentVouchers({ request_id: lookupId }).catch(() => ({ result: [] }));
      const pvs = Array.isArray((pvsResponse as any)?.result) ? (pvsResponse as any).result : [];
      const data = (req.data || {}) as Record<string, any>;
      const manualApprovals = Array.isArray(data.manual_approvals) ? data.manual_approvals : [];
      const findApproval = (role: string) =>
        manualApprovals.find((row: any) => String(row.role || "").toLowerCase() === role);

      setEditingId(req.id);
      setRequestId(req.id);
      setForm((prev) => ({
        ...prev,
        request_type_id: req.request_type?.id || "",
        staff_id: req.creator?.id || "",
        request_id: String(req.id || "").trim(),
        team_id: String(data.team_id || ""),
        organization_id: String(data.organization_id || ""),
        project_id: String(data.project_id || ""),
        fund_id: String(data.fund_id || ""),
        grant_id: String(data.grant_id || ""),
        category_id: String(data.category_id || ""),
        status: req.status || "completed",
        created_at: req.created_at ? String(req.created_at).slice(0, 10) : "",
        due_date: data.due_date ? String(data.due_date).slice(0, 10) : "",
        purpose: String(data.purpose || ""),
        submission_comment: data.submission_comment ? String(data.submission_comment) : (data.purpose ? `Please make payment for the listed items. ${data.purpose}.` : "Please make payment for the listed items."),
        currency: req.currency || "NGN",
        approvals: {
          team_lead_name: findApproval("team_lead")?.name || "",
          team_lead_date: findApproval("team_lead")?.date ? String(findApproval("team_lead").date).slice(0, 10) : (req.created_at ? String(req.created_at).slice(0, 10) : ""),
          team_lead_comment: findApproval("team_lead")?.comment || "Approved.",
          accountant_name: findApproval("accountant")?.name || signatoryDefaults.prepared_by.name,
          accountant_date: findApproval("accountant")?.date ? String(findApproval("accountant").date).slice(0, 10) : (req.created_at ? String(req.created_at).slice(0, 10) : ""),
          accountant_comment: findApproval("accountant")?.comment || "Cleared.",
          coo_name: findApproval("coo")?.name || signatoryDefaults.reviewed_by.name,
          coo_date: findApproval("coo")?.date ? String(findApproval("coo").date).slice(0, 10) : (req.created_at ? String(req.created_at).slice(0, 10) : ""),
          coo_comment: findApproval("coo")?.comment || "Approved.",
          ed_name: findApproval("ed")?.name || signatoryDefaults.approved_by.name,
          ed_date: findApproval("ed")?.date ? String(findApproval("ed").date).slice(0, 10) : (req.created_at ? String(req.created_at).slice(0, 10) : ""),
          ed_comment: findApproval("ed")?.comment || "Approved.",
          include_ed: Boolean(findApproval("ed")),
        },
      }));

      setItems(
        (req.items || []).map((item: any) => ({
          description: item.description,
          amount: Number(item.amount || 0),
          quantity: Number(item.quantity || 1),
          notes: item.notes || "",
          file_ids: (item.files || item.item_files || []).map((f: any) => ({ id: String(f.id || f.file_id || f.fileId || ""), name: String(f.file_name || f.fileName || f.name || f.id || "") })).filter((f: FileRef) => f.id),
        }))
      );
      setDisbursements(
        pvs.map((pv: any) => ({
          voucher_number: pv.voucher_number,
          amount: Number(pv.amount || 0),
          paid_from_account_id: pv.paid_from_account?.id || "",
          method: pv.method || "bank_transfer",
          transaction_ref: pv.transaction_ref || "",
          note: pv.note || "",
          disbursed_at: pv.disbursed_at ? String(pv.disbursed_at).slice(0, 10) : "",
          evidence_file_ids: (pv.evidence_files || (pv.evidence_file ? [pv.evidence_file] : [])).map((f: any) => ({ id: String(f.id || ""), name: String(f.file_name || f.fileName || f.name || f.id || "") })).filter((f: FileRef) => f.id),
          retired_amount: Number(pv.retired_amount || 0),
          retirement_status: pv.retirement_status || "not_retired",
          retirement_file_ids: (pv.retirement_files || []).map((f: any) => ({ id: String(f.id || ""), name: String(f.file_name || f.fileName || f.name || f.id || "") })).filter((f: FileRef) => f.id),
          contact_id: "",
          deductions: (pv.deductions || []).map((d: any) => ({
            deduction_type_id: d.deduction_type_id ?? d.deductionTypeId ?? "",
            rate: Number(d.rate ?? 0),
            gross_amount: Number(d.gross_amount ?? d.grossAmount ?? 0),
            deduction_amount: Number(d.deduction_amount ?? d.deductionAmount ?? 0),
          })),
          refund_amount: "",
          refund_method: "bank_transfer",
          refund_reference: "",
          refund_date: "",
          certificate_staff_name: formatPersonName(req.creator),
          certificate_amount: "",
          certificate_declaration: "",
          certificate_reason: "",
        }))
      );
      setRequestCreatorName(formatPersonName(req.creator));
      setDeductionsOpenByIndex(
        Object.fromEntries(pvs.map((pv: any, i: number) => [i, (pv.deductions || []).length > 0]))
      );
      const deductionRes = await financeApi.listRequestDeductions({ request_id: String(req.id), per_page: 200 })
        .catch(() => ({ items: [] as FinanceRequestDeductionRecord[] }));
      setRequestDeductions(deductionRes.items);
      setNotice({ tone: "success", message: `Loaded request ${req.id} for edit.` });
    } catch (error: any) {
      setNotice({ tone: "error", message: error?.response?.data?.error?.message || "Unable to find request by ID." });
    } finally {
      setLoading(false);
    }
  };

  const onDeleteManual = async () => {
    if (!editingId) return;
    const ok = window.confirm(`Delete manual request ${editingId}? This cannot be undone.`);
    if (!ok) return;
    try {
      setSaving(true);
      await requestApi.deleteManualRequestEntry(editingId);
      setNotice({ tone: "success", message: "Manual request deleted." });
      setEditingId("");
      setRequestId("");
      setLookupId("");
    } catch (error: any) {
      setNotice({ tone: "error", message: error?.response?.data?.error?.message || "Unable to delete request." });
    } finally {
      setSaving(false);
    }
  };

  const selectedMediaIds = mediaPickerTarget
    ? mediaPickerTarget.kind === "item"
      ? items[mediaPickerTarget.index]?.file_ids.map((f) => f.id) ?? []
      : mediaPickerTarget.kind === "pv"
        ? disbursements[mediaPickerTarget.index]?.evidence_file_ids.map((f) => f.id) ?? []
        : disbursements[mediaPickerTarget.index]?.retirement_file_ids.map((f) => f.id) ?? []
    : [];

  const applySelectedMedia = (target: ManualEntryPickerTarget, fileRefs: FileRef[]) => {
    if (target.kind === "item") {
      setItems((prev) => prev.map((row, index) => {
        if (index !== target.index) return row;
        const existingIds = new Set(row.file_ids.map((f) => f.id));
        return { ...row, file_ids: [...row.file_ids, ...fileRefs.filter((f) => !existingIds.has(f.id))] };
      }));
      return;
    }
    if (target.kind === "pv") {
      setDisbursements((prev) => prev.map((row, index) => {
        if (index !== target.index) return row;
        const existingIds = new Set(row.evidence_file_ids.map((f) => f.id));
        return { ...row, evidence_file_ids: [...row.evidence_file_ids, ...fileRefs.filter((f) => !existingIds.has(f.id))] };
      }));
      return;
    }
    setDisbursements((prev) =>
      prev.map((row, index) => {
        if (index !== target.index) return row;
        const existingIds = new Set(row.retirement_file_ids.map((f) => f.id));
        const merged = [...row.retirement_file_ids, ...fileRefs.filter((f) => !existingIds.has(f.id))];
        return { ...row, retirement_file_ids: merged };
      })
    );
  };

  const mediaUploadSource = mediaPickerTarget?.kind === "item"
    ? "manual_request_item"
    : mediaPickerTarget?.kind === "pv"
      ? "manual_pv_evidence"
      : "manual_retirement_file";

  if (!allowed) {
    return (
      <div className="mt-8">
        
      </div>
    );
  }

  const userName = `${user?.first_name || ""} ${user?.last_name || ""}`.trim() || user?.email || "Staff";

  return (
    <AppShell
      navigation={buildRequestsNavigation()}
      activeLabel="finance-legacy-manual-entry"
      user={{ name: userName, role: "Finance" }}
      mobileNav={buildAppMobileNav("Finance")}
    >
      <PageHeader
        eyebrow="Finance"
        breadcrumbs={[{ label: "Finance", path: "/finance" }, { label: "Legacy Manual Entry" }]}
        title="Legacy Manual Entry"
        description="Manually create and manage requests with full control over all fields."
      />

      <input
        ref={importInputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        className="hidden"
        onChange={(e) => void handleBatchImportFile(e)}
      />
      <div className="flex items-center mt-8 intro-y">
        <h2 className="mr-auto text-lg font-medium">Legacy Manual Entry</h2>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={downloadBatchTemplate}>
            <Icon name="FileText" className="w-4 h-4 mr-1" />
            Template
          </Button>
          <Button variant="secondary" onClick={() => importInputRef.current?.click()} disabled={importingPreview}>
            <Icon name="FileText" className="w-4 h-4 mr-1" />
            {importingPreview ? "Reading..." : "Batch Import"}
          </Button>
          <Button variant="secondary" onClick={() => navigate("/appOld/finance")}>
            <Icon name="ChevronLeft" className="w-4 h-4 mr-1" />
            Back
          </Button>
        </div>
      </div>
      <div className="box mt-5 p-5 space-y-6">
        <div className="grid grid-cols-12 gap-3 rounded-md border p-3">
          <div className="col-span-12 md:col-span-6">
            <label>Search Existing Request by ID</label>
            <TextField
 label=""              value={lookupId}
              onChange={(e) => setLookupId(e.target.value.replace(/[^\d]/g, ""))}
              placeholder="e.g. 3001"
            />
          </div>
          <div className="col-span-12 md:col-span-6 flex items-end gap-2">
            <Button variant="secondary" onClick={() => void loadForEdit()} disabled={!lookupId || loading}>
              Search & Load
            </Button>
            {editingId ? (
              <Button variant="danger" onClick={() => void onDeleteManual()} disabled={saving}>
                Delete
              </Button>
            ) : null}
          </div>
        </div>

        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-12 md:col-span-4"><label>Request Type</label><SelectField label="" value={form.request_type_id} onChange={(e) => setForm((p) => ({ ...p, request_type_id: e.target.value }))}><option value="">Select</option>{typeOptions.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</SelectField></div>
          <div className="col-span-12 md:col-span-4"><label>Staff</label><SelectField label="" value={form.staff_id} onChange={(e) => setForm((p) => ({ ...p, staff_id: e.target.value }))}><option value="">Select</option>{staffOptions.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</SelectField></div>
          <div className="col-span-12 md:col-span-4">
            <label>Request ID (Digits)</label>
            <TextField
 label=""              type="number"
              value={form.request_id}
              onChange={(e) => setForm((p) => ({ ...p, request_id: e.target.value.replace(/[^\d]/g, "") }))}
              placeholder="25"
            />
            <div className="mt-1 text-xs text-slate-500">
              {checkingNumber
                ? "Checking number..."
                : numberExists.exists
                  ? numberExists.requestId
                    ? `Already exists (Request ID ${numberExists.requestId})`
                    : "Invalid request number"
                  : "Available"}
            </div>
          </div>
          <div className="col-span-12 md:col-span-3"><label>Status</label><SelectField label="" value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}><option value="completed">Completed</option><option value="retired">Retired</option><option value="confirmed">Confirmed</option><option value="disbursed">Disbursed</option><option value="cleared">Cleared</option><option value="approval">Approval</option></SelectField></div>
          <div className="col-span-12 md:col-span-3"><label>Created At</label><TextField label="" type="date" value={form.created_at} onChange={(e) => setForm((p) => ({ ...p, created_at: e.target.value }))} /></div>
          <div className="col-span-12 md:col-span-3"><label>Due Date</label><TextField label="" type="date" value={form.due_date} onChange={(e) => setForm((p) => ({ ...p, due_date: e.target.value }))} /></div>
          <div className="col-span-12 md:col-span-3"><label>Currency</label><TextField label="" value={form.currency} onChange={(e) => setForm((p) => ({ ...p, currency: e.target.value.toUpperCase() }))} /></div>
          <div className="col-span-12 md:col-span-4"><label>Organization</label><SelectField label="" value={form.organization_id} onChange={(e) => setForm((p) => ({ ...p, organization_id: e.target.value }))}><option value="">Select</option>{organizationOptions.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</SelectField></div>
          <div className="col-span-12 md:col-span-4"><label>Department / Team</label><SelectField label="" value={form.team_id} onChange={(e) => setForm((p) => ({ ...p, team_id: e.target.value }))}><option value="">Select</option>{teamOptions.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</SelectField></div>
          <div className="col-span-12 md:col-span-4"><label>Project</label><SelectField label="" value={form.project_id} onChange={(e) => setForm((p) => ({ ...p, project_id: e.target.value }))}><option value="">Select</option>{projectOptions.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</SelectField></div>
          <div className="col-span-12 md:col-span-4"><label>Fund</label><SelectField label="" value={form.fund_id} onChange={(e) => setForm((p) => ({ ...p, fund_id: e.target.value, grant_id: "" }))}><option value="">No specific fund</option>{fundOptions.map((x) => <option key={x.id} value={x.id}>{x.code ? `${x.code} - ` : ""}{x.name}</option>)}</SelectField></div>
          <div className="col-span-12 md:col-span-4"><label>Grant / Donor Line</label><SelectField label="" value={form.grant_id} onChange={(e) => setForm((p) => ({ ...p, grant_id: e.target.value }))}><option value="">No specific grant</option>{filteredGrantOptions.map((x) => <option key={x.id} value={x.id}>{x.code ? `${x.code} - ` : ""}{x.name}</option>)}</SelectField></div>
          <div className="col-span-12 md:col-span-4"><label>Category</label><SelectField label="" value={form.category_id} onChange={(e) => setForm((p) => ({ ...p, category_id: e.target.value }))}><option value="">Select</option>{categoryOptions.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</SelectField></div>
          <div className="col-span-12 md:col-span-8"><label>Purpose</label><TextAreaField label="" rows={2} value={form.purpose} onChange={(e) => setForm((p) => ({ ...p, purpose: e.target.value }))} /></div>
          <div className="col-span-12"><label>Submission Note <span className="text-xs font-normal text-slate-400">(requester comment)</span></label><TextAreaField label="" rows={2} value={form.submission_comment} onChange={(e) => setForm((p) => ({ ...p, submission_comment: e.target.value }))} placeholder="Please make payment for the listed items." /></div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2"><h4 className="font-medium">Items</h4><Button variant="secondary" onClick={() => setItems((p) => [...p, { description: "", amount: 0, quantity: 1, notes: "", file_ids: [] }])}>Add Item</Button></div>
          {items.map((item, idx) => (
            <div key={`item-${idx}`} className="grid grid-cols-12 gap-3 mb-3">
              <div className="col-span-12 md:col-span-4"><TextField label="" placeholder="Item" value={item.description} onChange={(e) => setItems((p) => p.map((row, i) => i === idx ? { ...row, description: e.target.value } : row))} /></div>
              <div className="col-span-6 md:col-span-2"><TextField label="" type="number" placeholder="Qty" value={item.quantity as number} onChange={(e) => setItems((p) => p.map((row, i) => i === idx ? { ...row, quantity: Number(e.target.value || 1) } : row))} /></div>
              <div className="col-span-6 md:col-span-2"><TextField label="" type="number" placeholder="Price" value={item.amount} onChange={(e) => setItems((p) => p.map((row, i) => i === idx ? { ...row, amount: Number(e.target.value || 0) } : row))} /></div>
              <div className="col-span-12 md:col-span-3">
                <div className="flex flex-wrap gap-1 mb-1">
                  {item.file_ids.map((f) => (
                    <span key={f.id} className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 rounded text-xs text-slate-700">
                      {f.name || f.id}
                      <button type="button" className="ml-1 text-slate-400 hover:text-red-500" onClick={() => setItems((p) => p.map((row, i) => i === idx ? { ...row, file_ids: row.file_ids.filter((x) => x.id !== f.id) } : row))}>×</button>
                    </span>
                  ))}
                </div>
                <Button variant="secondary" onClick={() => setMediaPickerTarget({ kind: "item", index: idx })}>
                  Add Files
                </Button>
              </div>
              <div className="col-span-12 md:col-span-1"><Button variant="danger" onClick={() => setItems((p) => p.filter((_, i) => i !== idx))}>×</Button></div>
            </div>
          ))}
          <div className="text-right font-medium">Items Total: {formatCurrency(itemsTotal, form.currency || "NGN")}</div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2"><h4 className="font-medium">Disbursement / Retirement</h4><Button variant="secondary" onClick={() => setDisbursements((p) => [...p, { voucher_number: "", amount: 0, paid_from_account_id: "", method: "bank_transfer", transaction_ref: "", note: "", disbursed_at: "", evidence_file_ids: [], retired_amount: 0, retirement_status: "not_retired", retirement_file_ids: [], contact_id: "", deductions: [], refund_amount: "", refund_method: "bank_transfer", refund_reference: "", refund_date: "", certificate_staff_name: requestCreatorName, certificate_amount: "", certificate_declaration: "", certificate_reason: "" }])}>Add PV</Button></div>
          {disbursements.map((row, idx) => (
            <div key={`pv-${idx}`} className="grid grid-cols-12 gap-3 mb-4 p-3 border rounded">
              <div className="col-span-12 md:col-span-3">
                <label>Voucher ID</label>
                <TextField
 label=""                  value={row.voucher_number}
                  onChange={(e) => {
                    const next = e.target.value;
                    setDisbursements((p) => p.map((x, i) => i === idx ? { ...x, voucher_number: next } : x));
                    setVoucherExistsByIndex((prev) => ({ ...prev, [idx]: null }));
                  }}
                  onBlur={() => void checkVoucherNumberAtIndex(idx)}
                />
                <div className="mt-1 text-xs text-slate-500">
                  {checkingVoucherIndex === idx
                    ? "Checking voucher..."
                    : voucherExistsByIndex[idx] || " "}
                </div>
              </div>
              <div className="col-span-6 md:col-span-2"><label>Amount</label><TextField label="" type="number" value={row.amount} onChange={(e) => setDisbursements((p) => p.map((x, i) => i === idx ? { ...x, amount: Number(e.target.value || 0) } : x))} /></div>
              <div className="col-span-12 md:col-span-3"><label>Paid From Account</label><SelectField label="" value={row.paid_from_account_id || ""} onChange={(e) => setDisbursements((p) => p.map((x, i) => i === idx ? { ...x, paid_from_account_id: e.target.value } : x))}><option value="">Select account</option>{financeAccounts.map((acc) => <option key={acc.id} value={acc.id}>{acc.name}{acc.code ? ` (${acc.code})` : ""}</option>)}</SelectField></div>
              <div className="col-span-6 md:col-span-2"><label>Method</label><SelectField label="" value={row.method} onChange={(e) => setDisbursements((p) => p.map((x, i) => i === idx ? { ...x, method: e.target.value } : x))}><option value="bank_transfer">Bank Transfer</option><option value="cash">Cash</option><option value="mobile_money">Mobile Money</option><option value="cheque">Cheque</option><option value="other">Other</option></SelectField></div>
              <div className="col-span-12 md:col-span-3"><label>Transaction Ref</label><TextField label="" value={row.transaction_ref} onChange={(e) => setDisbursements((p) => p.map((x, i) => i === idx ? { ...x, transaction_ref: e.target.value } : x))} /></div>
              <div className="col-span-12 md:col-span-2"><label>Date</label><TextField label="" type="date" value={row.disbursed_at} onChange={(e) => setDisbursements((p) => p.map((x, i) => i === idx ? { ...x, disbursed_at: e.target.value } : x))} /></div>
              <div className="col-span-12 md:col-span-3"><label>Vendor / Payee</label><SelectField label="" value={row.contact_id || ""} onChange={(e) => setDisbursements((p) => p.map((x, i) => i === idx ? { ...x, contact_id: e.target.value } : x))}><option value="">— None —</option>{vendorOptions.map((v) => <option key={v.id} value={v.id}>{v.name}{v.company_name ? ` — ${v.company_name}` : ""}</option>)}</SelectField></div>
              <div className="col-span-12 md:col-span-3"><label>PV Evidence</label>
                <div className="flex flex-wrap gap-1 mb-1">
                  {row.evidence_file_ids.map((f) => (
                    <span key={f.id} className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 rounded text-xs text-slate-700">
                      {f.name || f.id}
                      <button type="button" className="ml-1 text-slate-400 hover:text-red-500" onClick={() => setDisbursements((p) => p.map((x, i) => i === idx ? { ...x, evidence_file_ids: x.evidence_file_ids.filter((e) => e.id !== f.id) } : x))}>×</button>
                    </span>
                  ))}
                </div>
                <Button variant="secondary" onClick={() => setMediaPickerTarget({ kind: "pv", index: idx })}>
                  Add Files
                </Button>
              </div>

              {/* Per-PV Statutory Deduction */}
              <div className="col-span-12">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-slate-600 uppercase tracking-wide">Statutory Deduction</label>
                  <Button variant="secondary" onClick={() => {
                    const alreadyOpen = deductionsOpenByIndex[idx];
                    setDeductionsOpenByIndex((p) => ({ ...p, [idx]: !alreadyOpen }));
                    if (!alreadyOpen && !(row.deductions?.length)) {
                      setDisbursements((p) => p.map((x, i) => i === idx ? { ...x, deductions: [{ deduction_type_id: "", rate: 0, gross_amount: 0, deduction_amount: 0 }] } : x));
                    }
                  }}>
                    {deductionsOpenByIndex[idx] ? "Hide" : "Add Deduction"}
                  </Button>
                </div>
                {deductionsOpenByIndex[idx] && (
                  <div className="border rounded p-3 bg-slate-50 space-y-2">
                    {(row.deductions || []).map((ded, di) => (
                      <div key={di} className="grid grid-cols-12 gap-2 items-end">
                        <div className="col-span-12 md:col-span-4">
                          <label className="text-xs text-slate-500">Deduction Type</label>
                          <SelectField label="" value={ded.deduction_type_id} onChange={(e) => {
                            const type = deductionTypeOptions.find((t) => t.id === e.target.value);
                            const rate = type?.rate ?? ded.rate;
                            const deductionAmount = Math.round(ded.gross_amount * rate * 100) / 100;
                            setDisbursements((p) => p.map((x, i) => i !== idx ? x : { ...x, deductions: (x.deductions || []).map((d, j) => j !== di ? d : { ...d, deduction_type_id: e.target.value, rate, deduction_amount: deductionAmount }) }));
                          }}>
                            <option value="">Select type</option>
                            {deductionTypeOptions.map((t) => <option key={t.id} value={t.id}>{t.name} ({(t.rate * 100).toFixed(1)}%)</option>)}
                          </SelectField>
                        </div>
                        <div className="col-span-6 md:col-span-3">
                          <label className="text-xs text-slate-500">Invoice Gross</label>
                          <TextField label="" type="number" value={ded.gross_amount || ""} onChange={(e) => {
                            const gross = Number(e.target.value || 0);
                            const deductionAmount = Math.round(gross * ded.rate * 100) / 100;
                            setDisbursements((p) => p.map((x, i) => i !== idx ? x : { ...x, deductions: (x.deductions || []).map((d, j) => j !== di ? d : { ...d, gross_amount: gross, deduction_amount: deductionAmount }) }));
                          }} placeholder="Invoice total before deduction" />
                        </div>
                        <div className="col-span-4 md:col-span-2">
                          <label className="text-xs text-slate-500">Rate</label>
                          <TextField label="" type="number" step="0.001" min="0" max="1" value={ded.rate} onChange={(e) => {
                            const rate = Number(e.target.value || 0);
                            const deductionAmount = Math.round(ded.gross_amount * rate * 100) / 100;
                            setDisbursements((p) => p.map((x, i) => i !== idx ? x : { ...x, deductions: (x.deductions || []).map((d, j) => j !== di ? d : { ...d, rate, deduction_amount: deductionAmount }) }));
                          }} />
                        </div>
                        <div className="col-span-4 md:col-span-2">
                          <label className="text-xs text-slate-500">Withheld</label>
                          <TextField label="" type="number" value={ded.deduction_amount || ""} onChange={(e) => setDisbursements((p) => p.map((x, i) => i !== idx ? x : { ...x, deductions: (x.deductions || []).map((d, j) => j !== di ? d : { ...d, deduction_amount: Number(e.target.value || 0) }) }))} />
                        </div>
                        <div className="col-span-4 md:col-span-1 flex items-end">
                          <Button variant="danger" onClick={() => setDisbursements((p) => p.map((x, i) => i !== idx ? x : { ...x, deductions: (x.deductions || []).filter((_, j) => j !== di) }))}>×</Button>
                        </div>
                      </div>
                    ))}
                    <Button variant="secondary" onClick={() => setDisbursements((p) => p.map((x, i) => i !== idx ? x : { ...x, deductions: [...(x.deductions || []), { deduction_type_id: "", rate: 0, gross_amount: 0, deduction_amount: 0 }] }))}>+ Add Line</Button>
                    {(row.deductions || []).filter((d) => d.deduction_amount > 0).length > 0 && (() => {
                      const totalDeducted = (row.deductions || []).reduce((s, d) => s + d.deduction_amount, 0);
                      return (
                        <div className="rounded bg-slate-100 px-3 py-2 text-xs space-y-0.5 mt-2">
                          <div className="flex justify-between text-red-600 font-medium"><span>Total Withheld</span><span>− {formatCurrency(totalDeducted, form.currency)}</span></div>
                          <div className="flex justify-between text-slate-600 border-t pt-1"><span>Net Paid (PV Amount)</span><span>{formatCurrency(Number(row.amount), form.currency)}</span></div>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>

              <div className="col-span-6 md:col-span-2"><label>Retired Amount</label><TextField label="" type="number" value={row.retired_amount || 0} onChange={(e) => setDisbursements((p) => p.map((x, i) => i === idx ? { ...x, retired_amount: Number(e.target.value || 0) } : x))} /></div>
              <div className="col-span-6 md:col-span-2"><label>Retirement Status</label><SelectField label="" value={row.retirement_status || "not_retired"} onChange={(e) => setDisbursements((p) => p.map((x, i) => i === idx ? { ...x, retirement_status: e.target.value } : x))}><option value="not_retired">Pending</option><option value="partial">Partial</option><option value="retired">Retired</option><option value="verified">Confirmed</option></SelectField></div>
              <div className="col-span-12 md:col-span-5"><label>Retirement Files</label>
                <div className="flex flex-wrap gap-1 mb-1">
                  {row.retirement_file_ids.map((f) => (
                    <span key={f.id} className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 rounded text-xs text-slate-700">
                      {f.name || f.id}
                      <button type="button" className="ml-1 text-slate-400 hover:text-red-500" onClick={() => setDisbursements((p) => p.map((x, i) => i === idx ? { ...x, retirement_file_ids: x.retirement_file_ids.filter((r) => r.id !== f.id) } : x))}>×</button>
                    </span>
                  ))}
                </div>
                <Button variant="secondary" onClick={() => setMediaPickerTarget({ kind: "retirement", index: idx })}>
                  Add Files
                </Button>
              </div>

              {/* Refund section — shown when retired < disbursed */}
              {Number(row.retired_amount || 0) > 0 && Number(row.retired_amount || 0) < Number(row.amount) && (
                <div className="col-span-12 border border-amber-200 bg-amber-50 rounded-lg p-3">
                  <p className="text-sm font-semibold text-amber-900 mb-2">
                    Refund Required: {formatCurrency(Number(row.amount) - Number(row.retired_amount || 0), form.currency)}
                  </p>
                  <div className="grid grid-cols-12 gap-3">
                    <div className="col-span-6 md:col-span-3"><label className="text-xs">Refund Amount</label><TextField label="" type="number" value={row.refund_amount || ""} onChange={(e) => setDisbursements((p) => p.map((x, i) => i === idx ? { ...x, refund_amount: e.target.value } : x))} /></div>
                    <div className="col-span-6 md:col-span-3"><label className="text-xs">Refund Method</label><SelectField label="" value={row.refund_method || "bank_transfer"} onChange={(e) => setDisbursements((p) => p.map((x, i) => i === idx ? { ...x, refund_method: e.target.value } : x))}><option value="bank_transfer">Bank Transfer</option><option value="cash_deposit">Cash Deposit</option><option value="cash_handin">Cash Hand-in</option></SelectField></div>
                    <div className="col-span-6 md:col-span-3"><label className="text-xs">Refund Reference</label><TextField label="" value={row.refund_reference || ""} onChange={(e) => setDisbursements((p) => p.map((x, i) => i === idx ? { ...x, refund_reference: e.target.value } : x))} placeholder="Txn ref / teller" /></div>
                    <div className="col-span-6 md:col-span-3"><label className="text-xs">Refund Date</label><TextField label="" type="date" value={row.refund_date || ""} onChange={(e) => setDisbursements((p) => p.map((x, i) => i === idx ? { ...x, refund_date: e.target.value } : x))} /></div>
                  </div>
                </div>
              )}

              {/* Certificate of Honor */}
              <div className="col-span-12 border border-blue-200 bg-blue-50 rounded-lg overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2">
                  <div>
                    <p className="text-sm font-semibold text-blue-900">Certificate of Honor</p>
                    <p className="text-xs text-blue-700">Use when receipts are unavailable — generate and attach to retirement files.</p>
                  </div>
                  <Button variant="secondary" onClick={() => setCertOpenByIndex((prev) => ({ ...prev, [idx]: !prev[idx] }))}>
                    {certOpenByIndex[idx] ? "Hide" : "Add Certificate"}
                  </Button>
                </div>
                {certOpenByIndex[idx] && (
                  <div className="border-t border-blue-200 p-4 space-y-3">
                    <TextField label="Staff Name (on certificate)" value={row.certificate_staff_name || ""} onChange={(e) => setDisbursements((p) => p.map((x, i) => i === idx ? { ...x, certificate_staff_name: e.target.value } : x))} helpText="Defaults to request owner. Override if needed." />
                    <TextField label="Amount (on certificate)" value={row.certificate_amount || ""} onChange={(e) => setDisbursements((p) => p.map((x, i) => i === idx ? { ...x, certificate_amount: e.target.value } : x))} helpText={`Shortfall: ${formatCertificateCurrency(Math.max(0, Number(row.amount || 0) - Number(row.retired_amount || 0)), form.currency)}. Leave blank to use this shortfall.`} />
                    <TextAreaField label="Declaration" rows={3} value={row.certificate_declaration || ""} onChange={(e) => setDisbursements((p) => p.map((x, i) => i === idx ? { ...x, certificate_declaration: e.target.value } : x))} helpText="Statement to be printed in the certificate." />
                    <TextAreaField label="Reason (why receipts are unavailable)" rows={3} value={row.certificate_reason || ""} onChange={(e) => setDisbursements((p) => p.map((x, i) => i === idx ? { ...x, certificate_reason: e.target.value } : x))} helpText="Explain the cash-advance, missing receipt, or other reason." />
                    <Button
                      variant="secondary"
                      disabled={!editingId || generatingCertIndex === idx}
                      onClick={() => {
                        if (!editingId) { setNotice({ tone: "warning", message: "Save the request first before generating a certificate." }); return; }
                        void (async () => {
                          try {
                            setGeneratingCertIndex(idx);
                            const shortfall = Math.max(0, Number(row.amount || 0) - Number(row.retired_amount || 0));
                            const certAmount = row.certificate_amount?.trim() ? Number(row.certificate_amount) : shortfall;
                            const certFile = await buildCertificateOfHonorPdf({
                              requestId: editingId,
                              requestLabel: `Request ${editingId}`,
                              voucherNumber: row.voucher_number || `PV-${idx + 1}`,
                              staffName: row.certificate_staff_name?.trim() || requestCreatorName || formatPersonName(user),
                              amountLabel: formatCertificateCurrency(certAmount, form.currency),
                              declaration: row.certificate_declaration?.trim() || "",
                              reason: row.certificate_reason?.trim() || "",
                              issuedAt: new Date().toISOString().slice(0, 10),
                              signatureFileId: (user as any)?.signature_file_id ?? undefined,
                            });
                            const previewUrl = URL.createObjectURL(certFile);
                            const asset = await resourceApi.uploadFile(certFile, { metadata: { source: "manual_retirement_certificate", request_id: editingId } });
                            const newDisbursements = disbursements.map((x, i) => {
                              if (i !== idx) return x;
                              const alreadyHas = x.retirement_file_ids.some((r) => r.id === asset.id);
                              if (alreadyHas) return x;
                              return { ...x, retirement_file_ids: [...x.retirement_file_ids, { id: asset.id, name: asset.file_name }] };
                            });
                            setDisbursements(newDisbursements);
                            setCertAssetsByIndex((prev) => ({
                              ...prev,
                              [idx]: [...(prev[idx] ?? []), { id: asset.id, file_name: asset.file_name, previewUrl: asset.public_url ?? previewUrl }],
                            }));
                            await saveManualRequest(newDisbursements);
                            setNotice({ tone: "success", message: "Certificate generated and attached to request." });
                          } catch (err: any) {
                            setNotice({ tone: "error", message: err?.message || "Failed to generate certificate." });
                          } finally {
                            setGeneratingCertIndex(null);
                          }
                        })();
                      }}
                    >
                      {generatingCertIndex === idx ? "Generating..." : "Generate & Attach Certificate"}
                    </Button>
                    {!editingId && <p className="text-xs text-amber-700">Save the request first to enable certificate generation.</p>}
                    {(certAssetsByIndex[idx] ?? []).length > 0 && (
                      <div className="mt-2 space-y-1">
                        {(certAssetsByIndex[idx] ?? []).map((cert) => (
                          <a key={cert.id} href={cert.previewUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-blue-600 underline">
                            <Icon name="FileText" className="w-3 h-3" />{cert.file_name}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="col-span-12 md:col-span-12"><label>Note</label><TextField label="" value={row.note} onChange={(e) => setDisbursements((p) => p.map((x, i) => i === idx ? { ...x, note: e.target.value } : x))} /></div>
            </div>
          ))}
        </div>

        {requestDeductions.length > 0 && (
          <div className="mt-4">
            <h4 className="font-medium text-slate-700 mb-2">Statutory Deductions on this Request</h4>
            <table className="w-full text-sm border rounded overflow-hidden">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-3 py-2 text-left">Type</th>
                  <th className="px-3 py-2 text-right">Gross</th>
                  <th className="px-3 py-2 text-right">Withheld</th>
                  <th className="px-3 py-2 text-left">Status</th>
                  <th className="px-3 py-2 text-left">Reference</th>
                </tr>
              </thead>
              <tbody>
                {requestDeductions.map((d) => (
                  <tr key={d.id} className="border-t">
                    <td className="px-3 py-2">{d.deduction_type_name} <span className="text-xs text-slate-400">({d.deduction_type_code})</span></td>
                    <td className="px-3 py-2 text-right">{Number(d.gross_amount).toLocaleString()}</td>
                    <td className="px-3 py-2 text-right">{Number(d.amount).toLocaleString()}</td>
                    <td className="px-3 py-2">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${d.status === "remitted" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                        {d.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-slate-500">{d.remittance_ref ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div>
          <h4 className="font-medium mb-2">Manual Approvals</h4>
          <div className="grid grid-cols-12 gap-3">
            {/* Team Lead */}
            <div className="col-span-6 md:col-span-3"><label>Team Lead Name</label><SelectField label="" value={form.approvals.team_lead_name} onChange={(e) => setForm((p) => ({ ...p, approvals: { ...p.approvals, team_lead_name: e.target.value } }))}><option value="">Select name</option>{form.approvals.team_lead_name && !approvalNameOptions.includes(form.approvals.team_lead_name) ? <option value={form.approvals.team_lead_name}>{form.approvals.team_lead_name}</option> : null}{approvalNameOptions.map((name) => <option key={`approval-team-lead-${name}`} value={name}>{name}</option>)}</SelectField></div>
            <div className="col-span-6 md:col-span-3"><label>Team Lead Date</label><TextField label="" type="date" value={form.approvals.team_lead_date} onChange={(e) => setForm((p) => ({ ...p, approvals: { ...p.approvals, team_lead_date: e.target.value } }))} /></div>
            <div className="col-span-12 md:col-span-6"><TextAreaField label="Team Lead Comment" rows={1} value={form.approvals.team_lead_comment} onChange={(e) => setForm((p) => ({ ...p, approvals: { ...p.approvals, team_lead_comment: e.target.value } }))} placeholder="Approved." /></div>
            {/* Accountant */}
            <div className="col-span-6 md:col-span-3"><label>Accountant Name</label><SelectField label="" value={form.approvals.accountant_name} onChange={(e) => setForm((p) => ({ ...p, approvals: { ...p.approvals, accountant_name: e.target.value } }))}><option value="">Select name</option>{form.approvals.accountant_name && !approvalNameOptions.includes(form.approvals.accountant_name) ? <option value={form.approvals.accountant_name}>{form.approvals.accountant_name}</option> : null}{approvalNameOptions.map((name) => <option key={`approval-accountant-${name}`} value={name}>{name}</option>)}</SelectField></div>
            <div className="col-span-6 md:col-span-3"><label>Accountant Date</label><TextField label="" type="date" value={form.approvals.accountant_date} onChange={(e) => setForm((p) => ({ ...p, approvals: { ...p.approvals, accountant_date: e.target.value } }))} /></div>
            <div className="col-span-12 md:col-span-6"><TextAreaField label="Accountant Comment" rows={1} value={form.approvals.accountant_comment} onChange={(e) => setForm((p) => ({ ...p, approvals: { ...p.approvals, accountant_comment: e.target.value } }))} placeholder="Cleared." /></div>
            {/* COO */}
            <div className="col-span-6 md:col-span-3"><label>COO Name</label><SelectField label="" value={form.approvals.coo_name} onChange={(e) => setForm((p) => ({ ...p, approvals: { ...p.approvals, coo_name: e.target.value } }))}><option value="">Select name</option>{form.approvals.coo_name && !approvalNameOptions.includes(form.approvals.coo_name) ? <option value={form.approvals.coo_name}>{form.approvals.coo_name}</option> : null}{approvalNameOptions.map((name) => <option key={`approval-coo-${name}`} value={name}>{name}</option>)}</SelectField></div>
            <div className="col-span-6 md:col-span-3"><label>COO Date</label><TextField label="" type="date" value={form.approvals.coo_date} onChange={(e) => setForm((p) => ({ ...p, approvals: { ...p.approvals, coo_date: e.target.value } }))} /></div>
            <div className="col-span-12 md:col-span-6"><TextAreaField label="COO Comment" rows={1} value={form.approvals.coo_comment} onChange={(e) => setForm((p) => ({ ...p, approvals: { ...p.approvals, coo_comment: e.target.value } }))} placeholder="Approved." /></div>
            <div className="col-span-12 md:col-span-3 flex items-end"><label className="inline-flex items-center gap-2"><input type="checkbox" checked={form.approvals.include_ed} onChange={(e) => setForm((p) => ({ ...p, approvals: { ...p.approvals, include_ed: e.target.checked } }))} /><span>Include ED</span></label></div>
            {form.approvals.include_ed ? (
              <>
                <div className="col-span-6 md:col-span-3"><label>ED Name</label><SelectField label="" value={form.approvals.ed_name} onChange={(e) => setForm((p) => ({ ...p, approvals: { ...p.approvals, ed_name: e.target.value } }))}><option value="">Select name</option>{form.approvals.ed_name && !approvalNameOptions.includes(form.approvals.ed_name) ? <option value={form.approvals.ed_name}>{form.approvals.ed_name}</option> : null}{approvalNameOptions.map((name) => <option key={`approval-ed-${name}`} value={name}>{name}</option>)}</SelectField></div>
                <div className="col-span-6 md:col-span-3"><label>ED Date</label><TextField label="" type="date" value={form.approvals.ed_date} onChange={(e) => setForm((p) => ({ ...p, approvals: { ...p.approvals, ed_date: e.target.value } }))} /></div>
                <div className="col-span-12 md:col-span-6"><TextAreaField label="ED Comment" rows={1} value={form.approvals.ed_comment} onChange={(e) => setForm((p) => ({ ...p, approvals: { ...p.approvals, ed_comment: e.target.value } }))} placeholder="Approved." /></div>
              </>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button
            variant="secondary"
            onClick={() => {
              resetManualForm();
              setNotice({ tone: "success", message: "Form cleared." });
            }}
          >
            Refresh
          </Button>
          <Button disabled={loading || saving} onClick={() => void saveManualRequest()}>
            {saving ? "Saving..." : editingId ? "Update Manual Request" : "Save Manual Request"}
          </Button>
          <Button variant="secondary" disabled={!requestId} onClick={async () => {
            if (!requestId) return;
            try {
              const file = await downloadRequestArtifact(requestId, { action: "request_pdf" });
              downloadBase64File(file.file_name, file.mime_type, file.content_base64);
            } catch (err: any) {
              alert(err?.message || "Failed to download");
            }
          }}>
            Download Request PDF
          </Button>
          <Button variant="secondary" disabled={!requestId} onClick={async () => {
            if (!requestId) return;
            try {
              const file = await downloadRequestArtifact(requestId, { action: "pv_pdf" });
              downloadBase64File(file.file_name, file.mime_type, file.content_base64);
            } catch (err: any) {
              alert(err?.message || "Failed to download");
            }
          }}>
            Download PV PDF
          </Button>
          <Button variant="secondary" disabled={!requestId} onClick={async () => {
            if (!requestId) return;
            try {
              const file = await downloadRequestArtifact(requestId, { action: "request_with_attachments" });
              downloadBase64File(file.file_name, file.mime_type, file.content_base64);
            } catch (err: any) {
              alert(err?.message || "Failed to download");
            }
          }}>
            Request + Attachments
          </Button>
          <Button variant="secondary" disabled={!requestId || !voucherId} onClick={async () => {
            if (!requestId || !voucherId) return;
            try {
              const file = await downloadRequestArtifact(requestId, { action: "pv_with_attachments", voucher_id: voucherId });
              downloadBase64File(file.file_name, file.mime_type, file.content_base64);
            } catch (err: any) {
              alert(err?.message || "Failed to download");
            }
          }}>
            PV + Retirement Attachments
          </Button>
          <Button variant="secondary" disabled={!requestId} onClick={async () => {
            if (!requestId) return;
            try {
              const file = await downloadRequestArtifact(requestId, { action: "full_package" });
              if (file.content_base64 && file.mime_type) {
                downloadBase64File(file.file_name, file.mime_type, file.content_base64);
              }
            } catch (err: any) {
              alert(err?.message || "Failed to download");
            }
          }}>
            Full Package ZIP
          </Button>
        </div>
        {requestId ? <div className="text-slate-600 text-sm">Saved Request ID: {requestId}. For PV attachment ZIP, enter a voucher id below if needed.</div> : null}
        {requestId ? (
          <div className="max-w-md">
            <label>Voucher ID (for PV ZIP download)</label>
            <TextField label="" value={voucherId} onChange={(e) => setVoucherId(e.target.value)} placeholder="Paste voucher UUID" />
          </div>
        ) : null}

      </div>

      <SlideOver open={showImportDialog} onClose={() => setShowImportDialog(false)} size="xl">
        <div className="p-5 flex flex-col h-full bg-white">
          <h2 className="mr-auto text-base font-medium mb-4">Batch Manual Import</h2>
          <div className="mb-4 text-sm text-slate-500">
            Review each row before import. Existing request IDs default to <strong>Update</strong>. New ones default to <strong>Create</strong>. Conflict rows should be set to <strong>Skip</strong>.
          </div>
          <div className="max-h-[60vh] overflow-auto border rounded-md">
            <DataTable
              columns={[
                { header: "Request ID", cell: (row) => row.requestIdText },
                { header: "Type", cell: (row) => row.requestTypeText || "-" },
                { header: "Staff", cell: (row) => row.staffText || "-" },
                { header: "Existing", cell: (row) => row.existingRequestId || "-" },
                {
                  header: "Action",
                  cell: (row) => {
                    const index = importRows.findIndex(r => r === row);
                    return (
                      <SelectField
                        label=""
                        value={row.action}
                        onChange={(e) =>
                          setImportRows((prev) =>
                            prev.map((entry, entryIndex) =>
                              entryIndex === index ? { ...entry, action: e.target.value as ImportAction } : entry
                            )
                          )
                        }
                      >
                        {row.actionOptions.map((option: any) => (
                          <option key={option} value={option}>
                            {option === "create" ? "Create" : option === "update" ? "Update" : "Skip"}
                          </option>
                        ))}
                      </SelectField>
                    );
                  }
                },
                {
                  header: "Issues",
                  cell: (row) => row.issues.length ? (
                    <div className="text-xs text-red-500">
                      {row.issues.map((issue, issueIndex) => (
                        <div key={`${row.rowKey}-issue-${issueIndex}`}>{issue}</div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-green-500">Ready</div>
                  )
                }
              ]}
              data={importRows}
            />
          </div>
          <div className="mt-8 flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowImportDialog(false)} className="mr-2">
              Cancel
            </Button>
            <Button variant="primary" onClick={() => void commitBatchImport()} disabled={importingCommit}>
              <Icon name="FileText" className="w-4 h-4 mr-1" />
              {importingCommit ? "Importing..." : "Commit Import"}
            </Button>
          </div>
        </div>
      </SlideOver>

      <MediaPickerModal
        open={mediaPickerTarget !== null}
        onClose={() => setMediaPickerTarget(null)}
        deleteFile={deleteFileAsset}
        title={
          mediaPickerTarget?.kind === "item"
            ? "Select Item Invoice"
            : mediaPickerTarget?.kind === "pv"
              ? "Select PV Evidence"
              : "Select Retirement Files"
        }
        multiple
        selectedIds={selectedMediaIds}
        loadFiles={async (search) =>
          listFileAssets({
            include_usage: true,
            per_page: 200,
            search,
            uploaded_by: currentUserId,
          })
        }
        uploadFiles={async (files, onProgress) => {
          if (!mediaPickerTarget) return;
          const total = files.length;
          let uploadedCount = 0;
          const uploadedIds: string[] = [];

          for (const file of Array.from(files)) {
            onProgress?.({
              uploaded: uploadedCount,
              total,
              current_file_name: file.name,
            });
            const uploaded = await uploadFileAsset(file, {
              organization_id: form.organization_id || undefined,
              metadata: {
                source: mediaUploadSource,
                ...(editingId ? { request_id: editingId } : {}),
              },
            });
            uploadedCount += 1;
            uploadedIds.push(uploaded.id);
            onProgress?.({
              uploaded: uploadedCount,
              total,
              current_file_name: file.name,
            });
          }

          const uploadedRefs: FileRef[] = uploadedIds.map((id, i) => ({ id, name: (Array.from(files as FileList)[i] as File)?.name || id }));
          const nextRefs = uploadedRefs;
          applySelectedMedia(mediaPickerTarget, nextRefs);
        }}
        onSelect={(fileRecords) => {
          if (!mediaPickerTarget) return;
          applySelectedMedia(mediaPickerTarget, (fileRecords as any[]).map((file) => ({ id: file.id, name: file.file_name || file.fileName || file.name || file.id })));
        }}
      />
    </AppShell>
  );
}

export default FinanceManualEntryPage;
