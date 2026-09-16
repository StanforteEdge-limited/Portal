import { Module } from '@nestjs/common';
import { ProcurementController } from './procurement.controller';
import { ProcurementService } from './procurement.service';
import { WorkflowModule } from '$modules/hrm/workflow/workflow.module';
import { NotificationsModule } from '$modules/hrm/notifications/notifications.module';
import { MailModule } from '$common/mail/mail.module';
import { PdfModule } from '$common/pdf/pdf.module';
import { StorageModule } from '$modules/storage/storage.module';
import { ProcurementDocumentFacadeService } from '$modules/finance/procurement/documents/procurement-document-facade.service';
import { BackgroundJobsService } from '$modules/background-jobs/background-jobs.service';
import { StorageService } from '$modules/storage/storage.service';

@Module({
  imports: [
    WorkflowModule,
    NotificationsModule,
    MailModule,
    PdfModule,
    StorageModule,
  ],
  controllers: [ProcurementController],
  providers: [
    ProcurementService,
    ProcurementDocumentFacadeService,
    {
      provide: 'PROCUREMENT_JOB_HANDLERS',
      inject: [BackgroundJobsService, ProcurementService, StorageService],
      useFactory: (jobs: BackgroundJobsService, service: ProcurementService, storage: StorageService) => {
        jobs.register('procurement.po-download', async (input: any, ctx) => {
          const output = await service.downloadPo(String(input.poId), ctx.actorId ?? '');
          const stored = await storage.storeGeneratedFile(ctx.actorId, output);
          return { ...stored, po_id: input.poId ?? null };
        });
      },
    },
  ],
})
export class ProcurementModule {}
