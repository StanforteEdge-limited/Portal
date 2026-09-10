import { Module } from '@nestjs/common';
import { FinanceController } from './finance.controller';
import { FinanceService } from './finance.service';
import { DeductionService } from './deduction.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { MailModule } from '../../common/mail/mail.module';
import { PayrollModule } from '../payroll/payroll.module';
import { PdfModule } from '../../common/pdf/pdf.module';

@Module({
  imports: [NotificationsModule, MailModule, PayrollModule, PdfModule],
  controllers: [FinanceController],
  providers: [FinanceService, DeductionService],
  exports: [DeductionService]
})
export class FinanceModule {}
