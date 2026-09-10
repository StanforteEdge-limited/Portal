import { Module } from '@nestjs/common';
import { MailController } from './mail.controller';
import { MailAccountService } from './mail-account.service';
import { MailImapService } from './mail-imap.service';
import { MailSyncService } from './mail-sync.service';
import { MailSmtpService } from './mail-smtp.service';
import { MailCryptoService } from './mail-crypto.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [MailController],
  providers: [
    MailAccountService,
    MailImapService,
    MailSyncService,
    MailSmtpService,
    MailCryptoService,
  ],
})
export class MailModule {}
