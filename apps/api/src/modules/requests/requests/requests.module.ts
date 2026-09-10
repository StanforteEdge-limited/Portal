import { Module } from '@nestjs/common';
import { RequestsController } from './requests.controller';
import { RequestsService } from './requests.service';
import { WorkflowModule } from '$modules/requests/workflow/workflow.module';
import { FormsModule } from '$modules/requests/forms/forms.module';
import { NotificationsModule } from '$modules/platform/notifications/notifications.module';
import { MailModule } from '$common/mail/mail.module';
import { PdfModule } from '$common/pdf/pdf.module';
import { FinanceModule } from '$modules/finance/finance/finance.module';
import { DocumentGeneratorService } from '$common/documents/document-generator.service';

@Module({
  imports: [WorkflowModule, FormsModule, NotificationsModule, MailModule, PdfModule, FinanceModule],
  controllers: [RequestsController],
  providers: [RequestsService, DocumentGeneratorService],
  exports: [DocumentGeneratorService],
})
export class RequestsModule {}
