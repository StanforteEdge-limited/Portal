import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { MailCryptoService } from './mail-crypto.service';
import { google } from 'googleapis';
import type { MailAccount } from '@prisma/client';

const GOOGLE_SCOPES = ['https://mail.google.com/', 'email', 'profile'];

const MICROSOFT_AUTH_SCOPES = [
  'openid',
  'https://outlook.office365.com/IMAP.AccessAsUser.All',
  'https://outlook.office365.com/SMTP.Send',
  'https://graph.microsoft.com/Mail.Read',
  'offline_access',
  'email',
  'profile',
].join(' ');

const MICROSOFT_IMAP_SCOPES = [
  'openid',
  'https://outlook.office365.com/IMAP.AccessAsUser.All',
  'https://outlook.office365.com/SMTP.Send',
  'offline_access',
  'email',
  'profile',
].join(' ');

@Injectable()
export class MailAccountService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: MailCryptoService,
  ) {}

  // ── State helpers (encode/decode profileId for OAuth state param) ───────────

  encodeState(profileId: bigint): string {
    return this.crypto.encrypt(String(profileId));
  }

  decodeState(state: string): bigint {
    try {
      return BigInt(this.crypto.decrypt(state));
    } catch {
      throw new ForbiddenException('Invalid OAuth state');
    }
  }

  // ── Google ──────────────────────────────────────────────────────────────────

  private googleOAuth2Client() {
    return new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI,
    );
  }

  getGoogleAuthUrl(profileId: bigint): string {
    return this.googleOAuth2Client().generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: GOOGLE_SCOPES,
      state: this.encodeState(profileId),
    });
  }

  async handleGoogleCallback(code: string, state: string): Promise<MailAccount> {
    const profileId = this.decodeState(state);
    const client = this.googleOAuth2Client();
    const { tokens } = await client.getToken(code);

    if (!tokens.access_token || !tokens.refresh_token) {
      throw new Error('Google did not return required tokens — ensure prompt=consent was used.');
    }

    client.setCredentials(tokens);
    const oauth2 = google.oauth2({ version: 'v2', auth: client });
    const { data } = await oauth2.userinfo.get();

    const account = await this.prisma.mailAccount.create({
      data: {
        profileId,
        provider: 'GOOGLE',
        emailAddress: data.email!,
        displayName: data.name ?? null,
        accessToken: this.crypto.encrypt(tokens.access_token),
        refreshToken: this.crypto.encrypt(tokens.refresh_token),
        tokenExpiresAt: new Date(tokens.expiry_date ?? Date.now() + 3_600_000),
      },
    });

    try {
      await this.setupGoogleWatch(account);
    } catch (err) {
      console.error('Failed to setup Google mailbox watch on initial connection', err);
    }

    return account;
  }

  async setupGoogleWatch(account: MailAccount): Promise<void> {
    const accessToken = await this.getDecryptedAccessToken(account);
    const client = this.googleOAuth2Client();
    client.setCredentials({ access_token: accessToken });
    const gmail = google.gmail({ version: 'v1', auth: client });

    await gmail.users.watch({
      userId: 'me',
      requestBody: {
        topicName: 'projects/ste-portal/topics/gmail-notifications',
        labelIds: ['INBOX'],
      },
    });
  }

  // ── Microsoft ───────────────────────────────────────────────────────────────

  getMicrosoftAuthUrl(profileId: bigint): string {
    const tenant = process.env.MICROSOFT_TENANT_ID ?? 'common';
    const params = new URLSearchParams({
      client_id: process.env.MICROSOFT_CLIENT_ID!,
      response_type: 'code',
      redirect_uri: process.env.MICROSOFT_REDIRECT_URI!,
      scope: MICROSOFT_AUTH_SCOPES,
      response_mode: 'query',
      state: this.encodeState(profileId),
    });
    return `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize?${params}`;
  }

  async handleMicrosoftCallback(code: string, state: string): Promise<MailAccount> {
    const profileId = this.decodeState(state);
    const tenant = process.env.MICROSOFT_TENANT_ID ?? 'common';

    const tokenRes = await fetch(
      `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: process.env.MICROSOFT_CLIENT_ID!,
          client_secret: process.env.MICROSOFT_CLIENT_SECRET!,
          code,
          redirect_uri: process.env.MICROSOFT_REDIRECT_URI!,
          grant_type: 'authorization_code',
          scope: MICROSOFT_IMAP_SCOPES,
        }),
      },
    );
    const tokens = await tokenRes.json() as {
      access_token: string;
      refresh_token: string;
      expires_in: number;
      error?: string;
    };
    if (tokens.error) throw new Error(`Microsoft OAuth error: ${tokens.error}`);

    const profileRes = await fetch('https://graph.microsoft.com/v1.0/me', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const profile = await profileRes.json() as {
      mail?: string;
      userPrincipalName?: string;
      displayName?: string;
    };

    const email = profile.mail ?? profile.userPrincipalName ?? '';

    const account = await this.prisma.mailAccount.create({
      data: {
        profileId,
        provider: 'MICROSOFT',
        emailAddress: email,
        displayName: profile.displayName ?? null,
        accessToken: this.crypto.encrypt(tokens.access_token),
        refreshToken: this.crypto.encrypt(tokens.refresh_token),
        tokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1_000),
      },
    });

    try {
      await this.setupMicrosoftWatch(account);
    } catch (err) {
      console.error('Failed to setup Microsoft mailbox subscription watch on link', err);
    }

    return account;
  }

  async getMicrosoftGraphToken(account: MailAccount): Promise<string> {
    const tenant = process.env.MICROSOFT_TENANT_ID ?? 'common';
    const res = await fetch(
      `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: process.env.MICROSOFT_CLIENT_ID!,
          client_secret: process.env.MICROSOFT_CLIENT_SECRET!,
          refresh_token: this.crypto.decrypt(account.refreshToken),
          grant_type: 'refresh_token',
          scope: 'https://graph.microsoft.com/Mail.Read offline_access',
        }),
      },
    );
    const tokens = await res.json() as { access_token: string; error?: string };
    if (tokens.error) throw new Error(`Failed to acquire Graph token: ${tokens.error}`);
    return tokens.access_token;
  }

  async setupMicrosoftWatch(account: MailAccount): Promise<void> {
    let graphToken: string;
    try {
      graphToken = await this.getMicrosoftGraphToken(account);
    } catch (err) {
      console.error('Cannot register Microsoft watch - failed to get Graph token:', err);
      return;
    }
    const expiration = new Date(Date.now() + 4230 * 60 * 1000); // Max 3 days

    try {
      const res = await fetch('https://graph.microsoft.com/v1.0/subscriptions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${graphToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          changeType: 'created',
          notificationUrl: `${process.env.APP_BASE_URL || 'http://localhost:3000'}/mail/webhooks/outlook`,
          resource: 'me/mailFolders/Inbox/messages',
          expirationDateTime: expiration.toISOString(),
          clientState: 'ste-outlook-sync',
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        console.error('Microsoft watch subscription failed:', errText);
        return;
      }

      const data = await res.json() as any;
      if (data?.id) {
        await this.prisma.mailAccount.update({
          where: { id: account.id },
          data: { outlookSubscriptionId: data.id },
        });
      }
    } catch (err) {
      console.error('Failed to setup Microsoft mailbox subscription watch', err);
    }
  }

  async renewMicrosoftSubscriptions(): Promise<void> {
    const accounts = await this.prisma.mailAccount.findMany({
      where: { provider: 'MICROSOFT', outlookSubscriptionId: { not: null } },
    });
    for (const a of accounts) {
      try {
        const graphToken = await this.getMicrosoftGraphToken(a);
        const expiration = new Date(Date.now() + 4230 * 60 * 1000);
        const res = await fetch(`https://graph.microsoft.com/v1.0/subscriptions/${a.outlookSubscriptionId}`, {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${graphToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            expirationDateTime: expiration.toISOString(),
          }),
        });
        if (!res.ok) {
          await this.setupMicrosoftWatch(a);
        }
      } catch {
        await this.setupMicrosoftWatch(a);
      }
    }
  }

  // ── Token refresh ───────────────────────────────────────────────────────────

  async getDecryptedAccessToken(account: MailAccount): Promise<string> {
    const fiveMinutes = 5 * 60 * 1_000;
    if (Date.now() < new Date(account.tokenExpiresAt).getTime() - fiveMinutes) {
      return this.crypto.decrypt(account.accessToken);
    }
    return account.provider === 'GOOGLE'
      ? this.refreshGoogleToken(account)
      : this.refreshMicrosoftToken(account);
  }

  private async refreshGoogleToken(account: MailAccount): Promise<string> {
    const client = this.googleOAuth2Client();
    client.setCredentials({ refresh_token: this.crypto.decrypt(account.refreshToken) });
    const { credentials } = await client.refreshAccessToken();
    await this.prisma.mailAccount.update({
      where: { id: account.id },
      data: {
        accessToken: this.crypto.encrypt(credentials.access_token!),
        tokenExpiresAt: new Date(credentials.expiry_date ?? Date.now() + 3_600_000),
      },
    });
    return credentials.access_token!;
  }

  private async refreshMicrosoftToken(account: MailAccount): Promise<string> {
    const tenant = process.env.MICROSOFT_TENANT_ID ?? 'common';
    const res = await fetch(
      `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: process.env.MICROSOFT_CLIENT_ID!,
          client_secret: process.env.MICROSOFT_CLIENT_SECRET!,
          refresh_token: this.crypto.decrypt(account.refreshToken),
          grant_type: 'refresh_token',
          scope: MICROSOFT_IMAP_SCOPES,
        }),
      },
    );
    const tokens = await res.json() as { access_token: string; expires_in: number; error?: string };
    if (tokens.error) throw new Error(`Microsoft token refresh failed: ${tokens.error}`);

    await this.prisma.mailAccount.update({
      where: { id: account.id },
      data: {
        accessToken: this.crypto.encrypt(tokens.access_token),
        tokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1_000),
      },
    });
    return tokens.access_token;
  }

  // ── CRUD ────────────────────────────────────────────────────────────────────

  listAccounts(profileId: bigint) {
    return this.prisma.mailAccount.findMany({
      where: { profileId },
      select: {
        id: true,
        provider: true,
        emailAddress: true,
        displayName: true,
        isShared: true,
        label: true,
        lastSyncedAt: true,
        createdAt: true,
        profileId: true,
        tokenExpiresAt: true,
        signature: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async updateSignature(id: bigint, profileId: bigint, signature: string | null): Promise<void> {
    const account = await this.findAccountForUser(id, profileId);
    await this.prisma.mailAccount.update({
      where: { id: account.id },
      data: { signature },
    });
  }

  async deleteAccount(id: bigint, profileId: bigint): Promise<void> {
    const account = await this.prisma.mailAccount.findUnique({ where: { id } });
    if (!account) throw new NotFoundException('Account not found');
    if (account.profileId !== profileId) throw new ForbiddenException();
    await this.prisma.mailAccount.delete({ where: { id } });
  }

  async findAccountForUser(accountId: bigint, profileId: bigint): Promise<MailAccount> {
    const account = await this.prisma.mailAccount.findUnique({ where: { id: accountId } });
    if (!account) throw new NotFoundException('Mail account not found');
    if (account.profileId !== profileId) throw new ForbiddenException();
    return account;
  }
}
