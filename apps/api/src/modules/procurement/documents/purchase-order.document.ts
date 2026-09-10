import { DocumentGeneratorService } from '../../../common/documents/document-generator.service';
import { Document, DocumentIds, DocumentOutput } from '../../../common/documents/document.types';

export type PoLineItem = {
  description: string;
  qty: number;
  unit: string;
  unitCost: number;
  totalCost: number;
};

export type PurchaseOrderContext = {
  poNumber: string;
  date: string;
  vendor: { name: string; address?: string; email?: string };
  preparedBy: string;
  deliveryAddress?: string;
  deliveryDate?: string;
  paymentTerms?: string;
  paymentPattern: string;
  items: PoLineItem[];
  totalAmount: number;
  currency: string;
  orgName: string;
  orgAddress?: string;
};

export class PurchaseOrderDocument implements Document<PurchaseOrderContext> {
  constructor(private readonly engine: DocumentGeneratorService) {}

  async fetchContext(ids: DocumentIds): Promise<PurchaseOrderContext> {
    const poId = ids.options?.poId as string;
    if (!poId) throw new Error('poId option required');

    const po = await this.engine.prisma.procurementOrder.findUnique({
      where: { id: poId },
      include: {
        vendor: true,
        preparer: true,
        organization: true,
      },
    });
    if (!po) throw new Error('Purchase Order not found');

    const items = (po.items as any[]) || [];
    const formattedItems: PoLineItem[] = items.map((i: any) => ({
      description: String(i.description || ''),
      qty: Number(i.qty || 0),
      unit: String(i.unit || 'unit'),
      unitCost: Number(i.unitCost || 0),
      totalCost: Number(i.totalCost || (i.qty * i.unitCost) || 0),
    }));

    const preparedBy = `${po.preparer.firstName ?? ''} ${po.preparer.lastName ?? ''}`.trim() || po.preparer.username || po.preparer.email;

    return {
      poNumber: po.poNumber,
      date: po.createdAt.toLocaleDateString(),
      vendor: {
        name: po.vendor.name,
        address: po.vendor.address ?? undefined,
        email: po.vendor.email ?? undefined,
      },
      preparedBy,
      deliveryAddress: po.deliveryAddress ?? undefined,
      deliveryDate: po.deliveryDate ? po.deliveryDate.toLocaleDateString() : undefined,
      paymentTerms: po.paymentTerms ?? undefined,
      paymentPattern: po.paymentPattern,
      items: formattedItems,
      totalAmount: Number(po.totalAmount),
      currency: '₦',
      orgName: po.organization?.name ?? 'Stanforte Edge',
      orgAddress: po.organization?.metadata ? String((po.organization.metadata as any).address ?? '') : undefined,
    };
  }

  async render(ctx: PurchaseOrderContext): Promise<DocumentOutput> {
    const html = this.buildHtml(ctx);
    const buffer = await this.engine.renderPdfFromHtml(html, [
      `PURCHASE ORDER ${ctx.poNumber}`,
      `Vendor: ${ctx.vendor.name}`,
      `Amount: ${ctx.currency} ${ctx.totalAmount.toLocaleString()}`,
      `Date: ${ctx.date}`,
    ]);
    return {
      buffer,
      mimeType: 'application/pdf',
      fileName: `${ctx.poNumber.toLowerCase()}.pdf`,
      artifactType: 'purchase_order',
    };
  }

  getTitle(ctx: PurchaseOrderContext): string {
    return `Purchase Order — ${ctx.poNumber}`;
  }

  buildHtml(ctx: PurchaseOrderContext): string {
    const rows = ctx.items.map(i => `
      <tr>
        <td>${i.description}</td>
        <td style="text-align:center">${i.qty}</td>
        <td style="text-align:center">${i.unit}</td>
        <td style="text-align:right">${ctx.currency} ${i.unitCost.toLocaleString()}</td>
        <td style="text-align:right">${ctx.currency} ${i.totalCost.toLocaleString()}</td>
      </tr>`).join('');

    return `<!DOCTYPE html><html><head><style>
      body { font-family: Arial, sans-serif; font-size: 12px; }
      table { width: 100%; border-collapse: collapse; margin-top: 16px; }
      th, td { border: 1px solid #ccc; padding: 6px 10px; }
      th { background: #f5f5f5; }
      .header { display: flex; justify-content: space-between; margin-bottom: 24px; }
      .label { color: #666; font-size: 11px; }
      .total { font-weight: bold; text-align: right; margin-top: 8px; }
    </style></head><body>
      <div class="header">
        <div><strong>${ctx.orgName}</strong><br/>${ctx.orgAddress ?? ''}</div>
        <div style="text-align:right">
          <h2 style="margin:0">PURCHASE ORDER</h2>
          <div>${ctx.poNumber}</div>
          <div class="label">Date: ${ctx.date}</div>
        </div>
      </div>
      <div style="margin-bottom:16px">
        <div class="label">VENDOR</div>
        <div><strong>${ctx.vendor.name}</strong></div>
        ${ctx.vendor.address ? `<div>${ctx.vendor.address}</div>` : ''}
        ${ctx.vendor.email ? `<div>${ctx.vendor.email}</div>` : ''}
      </div>
      <div style="display:flex;gap:40px;margin-bottom:16px">
        <div><span class="label">Delivery Address</span><br/>${ctx.deliveryAddress ?? '—'}</div>
        <div><span class="label">Expected Delivery</span><br/>${ctx.deliveryDate ?? '—'}</div>
        <div><span class="label">Payment Terms</span><br/>${ctx.paymentTerms ?? '—'}</div>
        <div><span class="label">Payment Pattern</span><br/>${ctx.paymentPattern}</div>
      </div>
      <table>
        <thead><tr><th>Description</th><th>Qty</th><th>Unit</th><th>Unit Cost</th><th>Total</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <div class="total">Total: ${ctx.currency} ${ctx.totalAmount.toLocaleString()}</div>
      <div style="margin-top:40px">
        <div class="label">Prepared by</div>
        <div>${ctx.preparedBy}</div>
      </div>
    </body></html>`;
  }
}
