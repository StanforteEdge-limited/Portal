import { Module } from '@nestjs/common';
import { MailController } from './mail.controller';
import { MailAccountService } from './mail-account.service';
import { MailImapService } from './mail-imap.service';
import { MailSyncService } from './mail-sync.service';
import { MailSmtpService } from './mail-smtp.service';
import { MailCryptoService } from './mail-crypto.service';
import { NotificationsModule } from '$modules/hrm/notifications/notifications.module';
import { BackgroundJobsService } from '$modules/background-jobs/background-jobs.service';
import { DbService } from '$common/db/db.service';
import { toBigInt } from '$common/utils/ids';
import { eq } from 'drizzle-orm';
import { mailAccount } from './model';

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
      inject: [BackgroundJobsService, MailSyncService, DbService],
      useFactory: (
        jobs: BackgroundJobsService,
        syncService: MailSyncService,
        db: DbService,
      ) => {
        jobs.register('mail.sync-all', async (input: any) => {
          await syncService.syncAllAccounts(toBigInt(String(input.profileId)));
          return { profile_id: input.profileId, synced_at: new Date().toISOString() };
        });
        jobs.register('mail.sync-account', async (input: any) => {
          const [account] = await db.client
            .select()
            .from(mailAccount)
            .where(eq(mailAccount.id, toBigInt(String(input.accountId))))
            .limit(1);
          if (!account) return { error: 'account_not_found' };
          await syncService.syncAccount(account, input.folder);
          return { account_id: input.accountId, folder: input.folder ?? 'INBOX', synced_at: new Date().toISOString() };
        });
      },
    },
  ],
})
export class MailModule {}
