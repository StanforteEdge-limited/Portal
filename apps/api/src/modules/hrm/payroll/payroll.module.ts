import { Module } from '@nestjs/common';
import { MailModule } from '$common/mail/mail.module';
import { NotificationsModule } from '$modules/hrm/notifications/notifications.module';
import { PdfModule } from '$common/pdf/pdf.module';
import { StorageModule } from '$modules/storage/storage.module';
import { BackgroundJobsService } from '$modules/background-jobs/background-jobs.service';
import { PayrollController } from './payroll.controller';
import { PayrollService } from './payroll.service';

@Module({
  imports: [NotificationsModule, MailModule, PdfModule, StorageModule],
  controllers: [PayrollController],
  providers: [
    PayrollService,
    {
      provide: 'PAYROLL_JOB_HANDLERS',
      inject: [BackgroundJobsService, PayrollService],
      useFactory: (jobs: BackgroundJobsService, service: PayrollService) => {
        jobs.register('payroll.distribute-payslips', async (input: any, ctx) =>
          service.distributeRunPayslips(String(input.runId), ctx.actorId),
        );
        jobs.register('payroll.generate-payslips-package', async (input: any, ctx) =>
          service.generateRunPayslipsPackageToAsset(String(input.runId), ctx.actorId),
        );
      },
    },
  ],
  exports: [PayrollService]
})
export class PayrollModule {}
