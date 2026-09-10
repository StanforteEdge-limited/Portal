import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ProcurementController } from './procurement.controller';
import { ProcurementService } from './procurement.service';
import { VendorPortalController } from './vendor-portal.controller';
import { VendorPortalService } from './vendor-portal.service';
import { WorkflowModule } from '../workflow/workflow.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { MailModule } from '../../common/mail/mail.module';
import { PdfModule } from '../../common/pdf/pdf.module';
import { DocumentGeneratorService } from '../../common/documents/document-generator.service';

@Module({
  imports: [
    WorkflowModule,
    NotificationsModule,
    MailModule,
    PdfModule,
    JwtModule.register({ secret: process.env.JWT_SECRET || 'fallback-secret' }),
  ],
  controllers: [ProcurementController, VendorPortalController],
  providers: [ProcurementService, VendorPortalService, DocumentGeneratorService],
})
export class ProcurementModule {}
