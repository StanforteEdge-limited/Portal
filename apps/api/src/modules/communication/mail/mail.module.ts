import { Module } from '@nestjs/common';
import { MailController } from './mail.controller';
import { MailAccountService } from './mail-account.service';
import { MailImapService } from './mail-imap.service';
import { MailSyncService } from './mail-sync.service';
import { MailSmtpService } from './mail-smtp.service';
import { MailCryptoService } from './mail-crypto.service';
import { NotificationsModule } from '$modules/notifications/notifications.module';
import { BackgroundJobsService } from '$modules/background-jobs/background-jobs.service';
import { DrizzleService } from '$common/drizzle/drizzle.service';
import { toBigInt } from '$common/utils/ids';

@Module({
  imports: [NotificationsModule],
  controllers: [MailController],
  providers: [
    MailAccountService,
    MailImapService,
    MailSyncService,
    MailSmtpService,
    MailCryptoService,
    {
      provide: 'MAIL_JOB_HANDLERS',
      inject: [BackgroundJobsService, MailSyncService, DrizzleService],
      useFactory: (
        jobs: BackgroundJobsService,
        syncService: MailSyncService,
        drizzle: DrizzleService,
      ) => {
        jobs.register('mail.sync-all', async (input: any) => {
          await syncService.syncAllAccounts(toBigInt(String(input.profileId)));
          return { profile_id: input.profileId, synced_at: new Date().toISOString() };
        });
        jobs.register('mail.sync-account', async (input: any) => {
          const account = await drizzle.mailAccount.findUnique({
            where: { id: toBigInt(String(input.accountId)) },
          });
          if (!account) return { error: 'account_not_found' };
          await syncService.syncAccount(account, input.folder);
          return { account_id: input.accountId, folder: input.folder ?? 'INBOX', synced_at: new Date().toISOString() };
        });
      },
    },
  ],
})
export class MailModule {}
