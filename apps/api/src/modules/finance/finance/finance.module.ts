import { Module } from '@nestjs/common';
import { FinanceController } from './finance.controller';
import { FinanceService } from './finance.service';
import { DeductionService } from './deduction.service';
import { NotificationsModule } from '$modules/notifications/notifications.module';
import { MailModule } from '$common/mail/mail.module';
import { PayrollModule } from '$modules/hr/payroll/payroll.module';
import { PdfModule } from '$common/pdf/pdf.module';
import { StorageModule } from '$modules/storage/storage.module';
import { BackgroundJobsService } from '$modules/background-jobs/background-jobs.service';
import { StorageService } from '$modules/storage/storage.service';

@Module({
  imports: [NotificationsModule, MailModule, PayrollModule, PdfModule, StorageModule],
  controllers: [FinanceController],
  providers: [
    FinanceService,
    DeductionService,
    {
      provide: 'FINANCE_JOB_HANDLERS',
      inject: [BackgroundJobsService, FinanceService, DeductionService, StorageService],
      useFactory: (
        jobs: BackgroundJobsService,
        financeService: FinanceService,
        deductionService: DeductionService,
        storage: StorageService,
      ) => {
        jobs.register('finance.export', async (input: any, ctx) => {
          let output: any;
          if (input.kind === 'requests') {
            output = await financeService.exportRequests(input.query ?? {}, input.format);
          } else if (input.kind === 'ledger') {
            output = await financeService.exportLedger(input.query ?? {}, input.format);
          } else if (input.kind === 'budget') {
            output = await financeService.exportBudget(String(input.id), input.format);
          } else {
            throw new Error('Unknown finance export kind');
          }
          const stored = await storage.storeGeneratedFile(ctx.actorId, output);
          return { ...stored, kind: input.kind };
        });

        jobs.register('finance.pdf', async (input: any, ctx) => {
          let output: any;
          switch (input.kind) {
            case 'invoice':
              output = await financeService.generateSalesInvoicePdf(String(input.id));
              break;
            case 'pledge':
              output = await financeService.generatePledgeAcknowledgmentPdf(String(input.id));
              break;
            case 'receipt':
              output = await financeService.generateFunderReceiptPdf(String(input.id));
              break;
            case 'trm_slip':
              output = await deductionService.generateTrmSlipPdf(String(input.id));
              break;
            case 'wht_certificate':
              output = await deductionService.generateWhtCertificatePdf(String(input.id));
              break;
            default:
              throw new Error('Unknown finance pdf kind');
          }
          const stored = await storage.storeGeneratedFile(ctx.actorId, output);
          return { ...stored, kind: input.kind };
        });
      },
    },
  ],
  exports: [DeductionService]
})
export class FinanceModule {}
