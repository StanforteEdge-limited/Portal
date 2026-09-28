import { eq } from 'drizzle-orm';
import { DbService } from '$core/db';
import { PdfService } from '$core/pdf';
import { MailQueueService } from '$app/jobs/queues';
import { DocumentGeneratorService } from '$app/jobs/documents';
import { profile } from '$apps/identity/users/model';
import { organization } from '$apps/hr/organizations/model';
import { financeContact } from '$apps/finance/accounting/model';
import { procurementOrder } from '$apps/finance/procurement/model';

export class ProcurementDocumentFacadeService extends DocumentGeneratorService {
  constructor(
    private readonly db: DbService,
    pdfService: PdfService,
    mailQueue: MailQueueService,
  ) {
    super(pdfService, mailQueue);
  }

  private profileSelect() {
    return {
      id: profile.id,
      username: profile.username,
      email: profile.email,
      firstName: profile.firstName,
      lastName: profile.lastName,
    };
  }
  async fetchPurchaseOrder(id: string): Promise<any | null> {
    const [po] = await this.db.client
      .select()
      .from(procurementOrder)
      .where(eq(procurementOrder.id, id))
      .limit(1);
    if (!po) return null;

    const [vendor, preparer, org] = await Promise.all([
      this.db.client
        .select()
        .from(financeContact)
        .where(eq(financeContact.id, po.vendorId))
        .limit(1)
        .then((rows) => rows[0] ?? null),
      this.db.client
        .select(this.profileSelect())
        .from(profile)
        .where(eq(profile.id, po.preparedBy))
        .limit(1)
        .then((rows) => rows[0] ?? null),
      po.organizationId
        ? this.db.client
            .select()
            .from(organization)
            .where(eq(organization.id, po.organizationId))
            .limit(1)
            .then((rows) => rows[0] ?? null)
        : Promise.resolve(null),
    ]);

    return {
      ...po,
      vendor,
      preparer,
      organization: org,
    };
  }
}
