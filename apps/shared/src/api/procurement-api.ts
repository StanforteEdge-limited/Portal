import type { HttpRequest } from '../auth/http-client';

export type PrItem = { description: string; qty: number; unit: string; estimatedUnitCost: number };
export type PoItem = { description: string; qty: number; unit: string; unitCost: number; totalCost: number };
export type Milestone = { seq: number; description: string; percentage: number; amount: number; trigger: string; status: string };
export type GrnItem = { description: string; qtyOrdered: number; qtyReceived: number; condition: string; notes?: string };

export type PurchaseRequisitionRecord = {
  id: string;
  requisitionNumber: string;
  title: string;
  category: 'goods' | 'services' | 'works';
  paymentPattern: 'post_delivery' | 'pre_payment' | 'milestone';
  status: string;
  estimatedTotal: number;
  items: PrItem[];
  justification?: string;
  createdAt: string;
  requester?: { id: string; firstName?: string; lastName?: string };
};

export type PurchaseOrderRecord = {
  id: string;
  poNumber: string;
  status: string;
  paymentPattern: string;
  totalAmount: number;
  milestones?: Milestone[];
  deliveryDate?: string;
  paymentTerms?: string;
  vendorAcknowledgedAt?: string;
  items: PoItem[];
  vendor?: { id: string; name: string };
  requisition?: { id: string; requisitionNumber: string; title: string };
  createdAt: string;
};

export type GrnRecord = {
  id: string;
  grnNumber: string;
  poId: string;
  status: string;
  overallCondition: string;
  receivedDate: string;
  items: GrnItem[];
  confirmedByOfficer: boolean;
};

export type ProcurementAttachmentRecord = {
  id: string;
  label?: string | null;
  visibility: 'internal' | 'vendor';
  file: {
    id: string;
    file_name: string;
    mime_type: string | null;
    file_size: number | null;
    public_url: string | null;
  };
};

export type ProcurementDocumentDownload = {
  job_id: string;
};

export function createProcurementApi(http: HttpRequest) {
  return {
    // Requisitions
    listPrs: () => http<PurchaseRequisitionRecord[]>('/procurement/requisitions'),
    getPr: (id: string) => http<PurchaseRequisitionRecord>(`/procurement/requisitions/${id}`),
    attachToPr: (id: string, data: { fileId: string; label?: string; visibility: 'internal' | 'vendor' }) =>
      http<ProcurementAttachmentRecord>(`/procurement/requisitions/${id}/attachments`, { method: 'POST', body: data }),
    createPr: (data: Partial<PurchaseRequisitionRecord> & { items: PrItem[] }) =>
      http<any>('/procurement/requisitions', { method: 'POST', body: data }),
    submitPr: (id: string) =>
      http<any>(`/procurement/requisitions/${id}/submit`, { method: 'POST' }),
    approvePr: (id: string, comment?: string) =>
      http<any>(`/procurement/requisitions/${id}/approve`, { method: 'POST', body: comment ? { comment } : undefined }),
    rejectPr: (id: string, comment?: string) =>
      http<any>(`/procurement/requisitions/${id}/reject`, { method: 'POST', body: comment ? { comment } : undefined }),

    // Orders
    listPos: () => http<PurchaseOrderRecord[]>('/procurement/orders'),
    getPo: (id: string) => http<PurchaseOrderRecord>(`/procurement/orders/${id}`),
    downloadPo: (id: string) =>
      http<ProcurementDocumentDownload>(`/procurement/orders/${id}/download`, { method: 'POST' }),
    attachToPo: (id: string, data: { fileId: string; label?: string; visibility: 'internal' | 'vendor' }) =>
      http<ProcurementAttachmentRecord>(`/procurement/orders/${id}/attachments`, { method: 'POST', body: data }),
    createPo: (data: any) =>
      http<any>('/procurement/orders', { method: 'POST', body: data }),
    approvePo: (id: string, comment?: string) =>
      http<any>(`/procurement/orders/${id}/approve`, { method: 'POST', body: comment ? { comment } : undefined }),
    rejectPo: (id: string, comment?: string) =>
      http<any>(`/procurement/orders/${id}/reject`, { method: 'POST', body: comment ? { comment } : undefined }),

    // GRN
    createGrn: (data: any) =>
      http<any>('/procurement/grns', { method: 'POST', body: data }),
    confirmGrn: (id: string, status: 'confirmed' | 'disputed', comment?: string) =>
      http<any>(`/procurement/grns/${id}/confirm`, { method: 'POST', body: { status, comment } }),

    // Procurement Intake
    listIntake: () => http<any[]>('/procurement/intake'),
    createCaseFromRequest: (requestId: string, data?: Record<string, unknown>) =>
      http<any>(`/procurement/intake/${requestId}/create-case`, { method: 'POST', body: data }),

    // Vendor portal (uses separate token)
    vendorLogin: (email: string, password: string) =>
      fetch('/api/vendor-portal/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) }).then(r => r.json()),
    vendorListOrders: (token: string) =>
      fetch('/api/vendor-portal/orders', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
    vendorGetOrder: (token: string, id: string) =>
      fetch(`/api/vendor-portal/orders/${id}`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
    vendorAcknowledge: (token: string, id: string, note?: string) =>
      fetch(`/api/vendor-portal/orders/${id}/acknowledge`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ note }) }).then(r => r.json()),
  };
}
