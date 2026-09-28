import { Document, DocumentIds, DocumentOutput } from '$core/documents';
import type { PoLineItem, PurchaseOrderContext } from './model';


type PurchaseOrderDocumentEngine = {
  fetchPurchaseOrder(id: string): Promise<any | null>;
  formatDate(value: Date | string | null | undefined): string;
  formatMoney(amount: number, currency?: string): string;
  renderDocumentTemplate(name: string, ctx: Record<string, unknown>): string;
  renderPdfFromHtml(html: string, fallbackLines?: string[]): Promise<Buffer>;
};

export class PurchaseOrderDocument implements Document<PurchaseOrderContext> {
  constructor(private readonly engine: PurchaseOrderDocumentEngine) {}

  async fetchContext(ids: DocumentIds): Promise<PurchaseOrderContext> {
    const poId = ids.options?.poId as string;
    if (!poId) throw new Error('poId option required');

    const po = await this.engine.fetchPurchaseOrder(poId);
    if (!po) throw new Error('Purchase Order not found');

    const items = (po.items as any[]) || [];
    const formattedItems: PoLineItem[] = items.map((item: any) => ({
      description: String(item.description || ''),
      qty: Number(item.qty || 0),
      unit: String(item.unit || 'unit'),
      unitCost: Number(item.unitCost || 0),
      totalCost: Number(item.totalCost || item.qty * item.unitCost || 0),
    }));

    const preparedBy =
      `${po.preparer.firstName ?? ''} ${po.preparer.lastName ?? ''}`.trim() ||
      po.preparer.username ||
      po.preparer.email;

    return {
      poNumber: po.poNumber,
      date: this.engine.formatDate(po.createdAt),
      vendor: {
        name: po.vendor.name,
        address: po.vendor.address ?? undefined,
        email: po.vendor.email ?? undefined,
      },
      preparedBy,
      deliveryAddress: po.deliveryAddress ?? undefined,
      deliveryDate: po.deliveryDate ? this.engine.formatDate(po.deliveryDate) : undefined,
      paymentTerms: po.paymentTerms ?? undefined,
      paymentPattern: po.paymentPattern,
      items: formattedItems,
      totalAmount: Number(po.totalAmount),
      currency: 'NGN',
      orgName: po.organization?.name ?? 'Stanforte Edge',
      orgAddress: po.organization?.metadata
        ? String((po.organization.metadata as any).address ?? '')
        : undefined,
    };
  }

  async render(ctx: PurchaseOrderContext): Promise<DocumentOutput> {
    const html = this.buildHtml(ctx);
    const buffer = await this.engine.renderPdfFromHtml(html, [
      `PURCHASE ORDER ${ctx.poNumber}`,
      `Vendor: ${ctx.vendor.name}`,
      `Amount: ${this.engine.formatMoney(ctx.totalAmount, ctx.currency)}`,
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
    return `Purchase Order - ${ctx.poNumber}`;
  }

  buildHtml(ctx: PurchaseOrderContext): string {
    return this.engine.renderDocumentTemplate('purchase-order', {
      ...ctx,
      orgAddress: ctx.orgAddress || '',
      deliveryAddress: ctx.deliveryAddress || '-',
      deliveryDate: ctx.deliveryDate || '-',
      paymentTerms: ctx.paymentTerms || '-',
      totalAmountLabel: this.engine.formatMoney(ctx.totalAmount, ctx.currency),
      items: ctx.items.map((item) => ({
        ...item,
        unitCostLabel: this.engine.formatMoney(item.unitCost, ctx.currency),
        totalCostLabel: this.engine.formatMoney(item.totalCost, ctx.currency),
      })),
    });
  }
}
