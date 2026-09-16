import { Module } from '@nestjs/common';
import { RequestsController } from './requests.controller';
import { RequestsService } from './requests.service';
import { WorkflowModule } from '$modules/hrm/workflow/workflow.module';
import { FormsModule } from '$modules/hrm/forms/forms.module';
import { NotificationsModule } from '$modules/hrm/notifications/notifications.module';
import { MailModule } from '$common/mail/mail.module';
import { PdfModule } from '$common/pdf/pdf.module';
import { FinanceModule } from '$modules/finance/finance/finance.module';
import { StorageModule } from '$modules/storage/storage.module';
import { RequestDocumentFacadeService } from '$modules/hrm/requests/documents/request-document-facade.service';
import { BackgroundJobsService } from '$modules/background-jobs/background-jobs.service';
import { StorageService } from '$modules/storage/storage.service';

@Module({
  imports: [WorkflowModule, FormsModule, NotificationsModule, MailModule, PdfModule, FinanceModule, StorageModule],
  controllers: [RequestsController],
  providers: [
    RequestsService,
    RequestDocumentFacadeService,
    {
      provide: 'REQUESTS_JOB_HANDLERS',
      inject: [BackgroundJobsService, RequestsService, StorageService],
      useFactory: (jobs: BackgroundJobsService, service: RequestsService, storage: StorageService) => {
        jobs.register('requests.document-generate', async (input: any, ctx) => {
          const output = await service.downloadByAction(
            String(input.requestId),
            ctx.actorId ?? '',
            input.download ?? {},
          );
          if (
            output &&
            typeof output === 'object' &&
            'content_base64' in output &&
            (output as any).content_base64
          ) {
            const stored = await storage.storeGeneratedFile(ctx.actorId, output as any);
            return {
              ...stored,
              request_id: input.requestId ?? null,
              action: (input.download ?? {}).action ?? 'request_pdf',
            };
          }
          return output;
        });
      },
    },
  ],
  exports: [RequestDocumentFacadeService],
})
export class RequestsModule {}
