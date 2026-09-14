import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ProcurementController } from './procurement.controller';
import { ProcurementService } from './procurement.service';
import { VendorPortalController } from './vendor-portal.controller';
import { VendorPortalService } from './vendor-portal.service';
import { WorkflowModule } from '$modules/requests/workflow/workflow.module';
import { NotificationsModule } from '$modules/notifications/notifications.module';
import { MailModule } from '$common/mail/mail.module';
import { PdfModule } from '$common/pdf/pdf.module';
import { StorageModule } from '$modules/storage/storage.module';
import { DocumentGeneratorService } from '$common/documents/document-generator.service';
import { BackgroundJobsService } from '$modules/background-jobs/background-jobs.service';
import { StorageService } from '$modules/storage/storage.service';

@Module({
  imports: [
    WorkflowModule,
    NotificationsModule,
    MailModule,
    PdfModule,
    StorageModule,
    JwtModule.register({ secret: process.env.JWT_SECRET || 'fallback-secret' }),
  ],
  controllers: [ProcurementController, VendorPortalController],
  providers: [
    ProcurementService,
    VendorPortalService,
    DocumentGeneratorService,
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
