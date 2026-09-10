import { Injectable } from '@nestjs/common';
import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import type { MailAccount } from '@prisma/client';

export type FolderItem = {
  name: string;
  path: string;
  delimiter: string;
  flags: Set<string>;
};

export type HeaderItem = {
  uid: string;
  subject: string | null;
  fromName: string | null;
  fromEmail: string | null;
  date: Date | null;
  isRead: boolean;
  hasAttachment: boolean;
  snippet: string | null;
};

@Injectable()
export class MailImapService {
  private buildClient(account: MailAccount, accessToken: string): ImapFlow {
    return new ImapFlow({
      host: account.provider === 'GOOGLE' ? 'imap.gmail.com' : 'outlook.office365.com',
      port: 993,
      secure: true,
      logger: false,
      auth: {
        user: account.emailAddress,
        accessToken,
      },
    });
  }

  async listFolders(account: MailAccount, accessToken: string): Promise<FolderItem[]> {
    const client = this.buildClient(account, accessToken);
    await client.connect();
    try {
      const list = await client.list();
      return list.map(m => ({
        name: m.name,
        path: m.path,
        delimiter: m.delimiter ?? '/',
        flags: m.flags ?? new Set(),
      }));
    } finally {
      await client.logout();
    }
  }

  async fetchNewHeaders(
    account: MailAccount,
    accessToken: string,
    folder: string,
    sinceUid: number = 1,
  ): Promise<HeaderItem[]> {
    const client = this.buildClient(account, accessToken);
    await client.connect();
    try {
      const lock = await client.getMailboxLock(folder);
      try {
        const results: HeaderItem[] = [];
        for await (const msg of client.fetch(`${sinceUid}:*`, {
          uid: true, flags: true, envelope: true, bodyStructure: true,
        }, { uid: true })) {
          const addr = msg.envelope?.from?.[0];
          results.push({
            uid: String(msg.uid),
            subject: msg.envelope?.subject ?? null,
            fromName: addr?.name ?? null,
            fromEmail: addr?.address ?? null,
            date: msg.envelope?.date ?? null,
            isRead: msg.flags?.has('\\Seen') ?? false,
            hasAttachment: this.hasAttachment(msg.bodyStructure),
            snippet: null,
          });
        }
        return results;
      } finally {
        lock.release();
      }
    } finally {
      await client.logout();
    }
  }

  private hasAttachment(structure: any): boolean {
    if (!structure) return false;
    if (structure.disposition?.toLowerCase() === 'attachment') return true;
    if (Array.isArray(structure.childNodes)) {
      return structure.childNodes.some((c: any) => this.hasAttachment(c));
    }
    return false;
  }

  async fetchBody(
    account: MailAccount,
    accessToken: string,
    folder: string,
    uid: string,
  ): Promise<{ html: string; text: string }> {
    const client = this.buildClient(account, accessToken);
    await client.connect();
    try {
      const lock = await client.getMailboxLock(folder);
      try {
        const message = await client.fetchOne(uid, { source: true }, { uid: true });
        const rawBuffer = (message && typeof message === 'object' && 'source' in message)
          ? (message.source as Buffer | undefined)
          : undefined;
        if (!rawBuffer) return { html: '', text: '' };
        const parsed = await simpleParser(rawBuffer);
        return {
          html: parsed.html || '',
          text: parsed.text || '',
        };
      } finally {
        lock.release();
      }
    } finally {
      await client.logout();
    }
  }

  async markRead(
    account: MailAccount,
    accessToken: string,
    folder: string,
    uid: string,
    isRead: boolean,
  ): Promise<void> {
    const client = this.buildClient(account, accessToken);
    await client.connect();
    try {
      const lock = await client.getMailboxLock(folder);
      try {
        if (isRead) {
          await client.messageFlagsAdd(uid, ['\\Seen'], { uid: true });
        } else {
          await client.messageFlagsRemove(uid, ['\\Seen'], { uid: true });
        }
      } finally {
        lock.release();
      }
    } finally {
      await client.logout();
    }
  }

  async moveMessage(
    account: MailAccount,
    accessToken: string,
    folder: string,
    uid: string,
    targetFolder: string,
  ): Promise<void> {
    const client = this.buildClient(account, accessToken);
    await client.connect();
    try {
      const lock = await client.getMailboxLock(folder);
      try {
        await client.messageMove(uid, targetFolder, { uid: true });
      } finally {
        lock.release();
      }
    } finally {
      await client.logout();
    }
  }

  async trashMessage(
    account: MailAccount,
    accessToken: string,
    folder: string,
    uid: string,
  ): Promise<void> {
    const trashFolder = account.provider === 'GOOGLE' ? '[Gmail]/Trash' : 'Deleted Items';
    await this.moveMessage(account, accessToken, folder, uid, trashFolder);
  }
}
