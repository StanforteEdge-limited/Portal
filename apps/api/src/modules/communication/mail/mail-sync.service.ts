import { Injectable } from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';
import { DbService } from '$common/db/db.service';
import { MailAccountService } from './mail-account.service';
import { MailImapService } from './mail-imap.service';
import { NotificationsService } from '$modules/notifications/notifications.service';
import { mailAccount, MailAccount, mailHeader } from './model';
import type { SyncResultDto } from './dto/sync-result.dto';

const DEFAULT_FOLDERS: Record<string, string[]> = {
  GOOGLE: ['INBOX', '[Gmail]/Sent Mail', '[Gmail]/Drafts', '[Gmail]/Spam', '[Gmail]/Trash'],
  MICROSOFT: ['INBOX', 'Sent Items', 'Drafts', 'Junk Email', 'Deleted Items'],
};

@Injectable()
export class MailSyncService {
  constructor(
    private readonly db: DbService,
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

    await this.db.client.update(mailAccount).set({ lastSyncedAt: new Date() }).where(eq(mailAccount.id, account.id));

    return results;
  }

  private async syncFolder(account: MailAccount, accessToken: string, folder: string): Promise<SyncResultDto> {
    const [latest] = await this.db.client
      .select({ uid: mailHeader.uid })
      .from(mailHeader)
      .where(and(eq(mailHeader.accountId, account.id), eq(mailHeader.folder, folder)))
      .orderBy(desc(mailHeader.uid))
      .limit(1);
    const sinceUid = latest ? Number(latest.uid) + 1 : 1;

    const headers = await this.imapService.fetchNewHeaders(account, accessToken, folder, sinceUid);
    if (headers.length === 0) return { accountId: String(account.id), folder, newCount: 0 };

    await this.db.client.transaction(async (tx) => {
      for (const h of headers) {
        await tx.insert(mailHeader)
          .values({
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
          })
          .onConflictDoUpdate({
            target: [mailHeader.accountId, mailHeader.folder, mailHeader.uid],
            set: { isRead: h.isRead, subject: h.subject },
          });
      }
    });

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
    const accounts = await this.db.client.select().from(mailAccount).where(eq(mailAccount.profileId, profileId));
    const all: SyncResultDto[] = [];
    for (const account of accounts) {
      all.push(...await this.syncAccount(account));
    }
    return all;
  }
}
