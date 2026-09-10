import { Module } from '@nestjs/common';
import { MailModule } from '../../common/mail/mail.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PdfModule } from '../../common/pdf/pdf.module';
import { PayrollController } from './payroll.controller';
import { PayrollService } from './payroll.service';

@Module({
  imports: [NotificationsModule, MailModule, PdfModule],
  controllers: [PayrollController],
  providers: [PayrollService],
  exports: [PayrollService]
})
export class PayrollModule {}
