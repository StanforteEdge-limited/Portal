import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { MailAccountService } from './mail-account.service';
import { MailImapService } from './mail-imap.service';
import { NotificationsService } from '../notifications/notifications.service';
import type { MailAccount } from '@prisma/client';
import type { SyncResultDto } from './dto/sync-result.dto';

const DEFAULT_FOLDERS: Record<string, string[]> = {
  GOOGLE: ['INBOX', '[Gmail]/Sent Mail', '[Gmail]/Drafts', '[Gmail]/Spam', '[Gmail]/Trash'],
  MICROSOFT: ['INBOX', 'Sent Items', 'Drafts', 'Junk Email', 'Deleted Items'],
};

@Injectable()
export class MailSyncService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accountService: MailAccountService,
    private readonly imapService: MailImapService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async syncAccount(account: MailAccount, folder?: string): Promise<SyncResultDto[]> {
    let accessToken: string;
    try {
      accessToken = await this.accountService.getDecryptedAccessToken(account);
    } catch {
      return [{ accountId: String(account.id), folder: folder ?? 'INBOX', newCount: 0, error: 'token_refresh_failed' }];
    }

    const foldersToSync = folder
      ? [folder]
      : DEFAULT_FOLDERS[account.provider] ?? ['INBOX'];

    const results: SyncResultDto[] = [];
    for (const f of foldersToSync) {
      try {
        results.push(await this.syncFolder(account, accessToken, f));
      } catch (err: any) {
        results.push({ accountId: String(account.id), folder: f, newCount: 0, error: err?.message ?? 'sync_failed' });
      }
    }

    await this.prisma.mailAccount.update({
      where: { id: account.id },
      data: { lastSyncedAt: new Date() },
    });

    return results;
  }

  private async syncFolder(account: MailAccount, accessToken: string, folder: string): Promise<SyncResultDto> {
    const latest = await this.prisma.mailHeader.findFirst({
      where: { accountId: account.id, folder },
      orderBy: { uid: 'desc' },
      select: { uid: true },
    });
    const sinceUid = latest ? Number(latest.uid) + 1 : 1;

    const headers = await this.imapService.fetchNewHeaders(account, accessToken, folder, sinceUid);
    if (headers.length === 0) return { accountId: String(account.id), folder, newCount: 0 };

    await this.prisma.$transaction(
      headers.map(h =>
        this.prisma.mailHeader.upsert({
          where: { accountId_folder_uid: { accountId: account.id, folder, uid: h.uid } },
          create: {
            accountId: account.id,
            uid: h.uid,
            folder,
            subject: h.subject,
            fromName: h.fromName,
            fromEmail: h.fromEmail,
            date: h.date,
            isRead: h.isRead,
            hasAttachment: h.hasAttachment,
            snippet: h.snippet,
          },
          update: { isRead: h.isRead, subject: h.subject },
        }),
      ),
    );

    // Dispatch system notifications for new unread emails
    for (const h of headers) {
      if (!h.isRead) {
        try {
          await this.notificationsService.create({
            userId: account.profileId,
            type: 'email',
            title: `New email from ${h.fromName || h.fromEmail}`,
            message: h.subject || '(No Subject)',
            link: '/mail',
            sentVia: ['in-app', 'push'],
          });
        } catch (err) {
          console.error('Failed to create system notification for new email', err);
        }
      }
    }

    return { accountId: String(account.id), folder, newCount: headers.length };
  }

  async syncAllAccounts(profileId: bigint): Promise<SyncResultDto[]> {
    const accounts = await this.prisma.mailAccount.findMany({ where: { profileId } });
    const all: SyncResultDto[] = [];
    for (const account of accounts) {
      all.push(...await this.syncAccount(account));
    }
    return all;
  }
}
