import { Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DbService } from '$common/db/db.service';
import { PdfService } from '$common/pdf/pdf.service';
import { MailQueueService } from '$common/mail/mail-queue.service';
import { DocumentGeneratorService } from '$common/documents/document-generator.service';
import { profile } from '$modules/identity/users/model';
import { organization } from '$modules/directory/organizations/model';
import { financeContact } from '$modules/finance/finance/model';
import { procurementOrder } from '$modules/finance/procurement/model';

@Injectable()
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
