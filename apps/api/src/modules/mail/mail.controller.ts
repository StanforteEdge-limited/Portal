import {
  Controller, Get, Post, Delete, Patch,
  Param, Body, Query, Req, Res, UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { PrismaService } from '../../common/prisma/prisma.service';
import { MailAccountService } from './mail-account.service';
import { MailSyncService } from './mail-sync.service';
import { MailImapService } from './mail-imap.service';
import { MailSmtpService } from './mail-smtp.service';
import { SendMessageDto } from './dto/send-message.dto';
import type { Response } from 'express';

@ApiTags('Mail')
@Controller('mail')
export class MailController {
  constructor(
    private readonly accountService: MailAccountService,
    private readonly syncService: MailSyncService,
    private readonly imapService: MailImapService,
    private readonly smtpService: MailSmtpService,
    private readonly prisma: PrismaService,
  ) {}

  // ── OAuth — NOT guarded (callback comes from Google/Microsoft redirect) ─────

  @Get('auth/google/url')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  getGoogleUrl(@Req() req: any) {
    return { url: this.accountService.getGoogleAuthUrl(BigInt(req.user.id)) };
  }

  @Get('auth/microsoft/url')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  getMicrosoftUrl(@Req() req: any) {
    return { url: this.accountService.getMicrosoftAuthUrl(BigInt(req.user.id)) };
  }

  @Get('auth/google/callback')
  async googleCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response,
  ) {
    await this.accountService.handleGoogleCallback(code, state);
    const appUrl = process.env.APP_BASE_URL ?? 'http://localhost:5173';
    res.redirect(`${appUrl}/mail`);
  }

  @Get('auth/microsoft/callback')
  async microsoftCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response,
  ) {
    await this.accountService.handleMicrosoftCallback(code, state);
    const appUrl = process.env.APP_BASE_URL ?? 'http://localhost:5173';
    res.redirect(`${appUrl}/mail`);
  }

  // ── Accounts ─────────────────────────────────────────────────────────────────

  @Get('accounts')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  listAccounts(@Req() req: any) {
    return this.accountService.listAccounts(BigInt(req.user.id));
  }

  @Delete('accounts/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  deleteAccount(@Param('id') id: string, @Req() req: any) {
    return this.accountService.deleteAccount(BigInt(id), BigInt(req.user.id));
  }

  // ── Sync ──────────────────────────────────────────────────────────────────────

  @Post('sync')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  syncAll(@Req() req: any) {
    return this.syncService.syncAllAccounts(BigInt(req.user.id));
  }

  @Post(':accountId/sync')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  async syncOne(
    @Param('accountId') accountId: string,
    @Query('folder') folder: string | undefined,
    @Req() req: any,
  ) {
    const account = await this.accountService.findAccountForUser(BigInt(accountId), BigInt(req.user.id));
    return this.syncService.syncAccount(account, folder);
  }

  // ── Headers ───────────────────────────────────────────────────────────────────

  @Get(':accountId/headers')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiQuery({ name: 'folder', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async listHeaders(
    @Param('accountId') accountId: string,
    @Query('folder') folder: string = 'INBOX',
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '50',
    @Req() req: any,
  ) {
    await this.accountService.findAccountForUser(BigInt(accountId), BigInt(req.user.id));
    const skip = (Number(page) - 1) * Number(limit);
    const data = await this.prisma.mailHeader.findMany({
      where: { accountId: BigInt(accountId), folder },
      orderBy: { date: 'desc' },
      skip,
      take: Number(limit),
    });
    return { data };
  }

  // ── Folders ───────────────────────────────────────────────────────────────────

  @Get(':accountId/folders')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  async listFolders(@Param('accountId') accountId: string, @Req() req: any) {
    const account = await this.accountService.findAccountForUser(BigInt(accountId), BigInt(req.user.id));
    const accessToken = await this.accountService.getDecryptedAccessToken(account);
    return this.imapService.listFolders(account, accessToken);
  }

  // ── Message body ──────────────────────────────────────────────────────────────

  @Get(':accountId/message/:uid')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  async getMessage(
    @Param('accountId') accountId: string,
    @Param('uid') uid: string,
    @Query('folder') folder: string = 'INBOX',
    @Req() req: any,
  ) {
    const account = await this.accountService.findAccountForUser(BigInt(accountId), BigInt(req.user.id));
    const accessToken = await this.accountService.getDecryptedAccessToken(account);
    return this.imapService.fetchBody(account, accessToken, folder, uid);
  }

  // ── Message actions ───────────────────────────────────────────────────────────

  @Patch(':accountId/message/:uid/read')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  async markRead(
    @Param('accountId') accountId: string,
    @Param('uid') uid: string,
    @Query('folder') folder: string = 'INBOX',
    @Query('isRead') isRead: string = 'true',
    @Req() req: any,
  ) {
    const account = await this.accountService.findAccountForUser(BigInt(accountId), BigInt(req.user.id));
    const accessToken = await this.accountService.getDecryptedAccessToken(account);
    const read = isRead !== 'false';
    await this.imapService.markRead(account, accessToken, folder, uid, read);
    await this.prisma.mailHeader.updateMany({
      where: { accountId: account.id, folder, uid },
      data: { isRead: read },
    }).catch(() => null);
    return { ok: true };
  }

  @Delete(':accountId/message/:uid')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  async trashMessage(
    @Param('accountId') accountId: string,
    @Param('uid') uid: string,
    @Query('folder') folder: string = 'INBOX',
    @Req() req: any,
  ) {
    const account = await this.accountService.findAccountForUser(BigInt(accountId), BigInt(req.user.id));
    const accessToken = await this.accountService.getDecryptedAccessToken(account);
    await this.imapService.trashMessage(account, accessToken, folder, uid);
    return { ok: true };
  }

  // ── Send ──────────────────────────────────────────────────────────────────────

  @Post(':accountId/send')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  async sendMessage(
    @Param('accountId') accountId: string,
    @Body() dto: SendMessageDto,
    @Req() req: any,
  ) {
    const account = await this.accountService.findAccountForUser(BigInt(accountId), BigInt(req.user.id));
    const accessToken = await this.accountService.getDecryptedAccessToken(account);
    await this.smtpService.send(account, accessToken, dto);
    return { ok: true };
  }

  @Post(':accountId/reply')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  async replyMessage(
    @Param('accountId') accountId: string,
    @Body() dto: SendMessageDto,
    @Req() req: any,
  ) {
    const account = await this.accountService.findAccountForUser(BigInt(accountId), BigInt(req.user.id));
    const accessToken = await this.accountService.getDecryptedAccessToken(account);
    await this.smtpService.reply(account, accessToken, dto);
    return { ok: true };
  }

  @Post(':accountId/forward')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  async forwardMessage(
    @Param('accountId') accountId: string,
    @Body() dto: SendMessageDto,
    @Req() req: any,
  ) {
    const account = await this.accountService.findAccountForUser(BigInt(accountId), BigInt(req.user.id));
    const accessToken = await this.accountService.getDecryptedAccessToken(account);
    await this.smtpService.forward(account, accessToken, dto);
    return { ok: true };
  }

  @Patch('accounts/:accountId/signature')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  async saveSignature(
    @Param('accountId') accountId: string,
    @Body('signature') signature: string | null,
    @Req() req: any,
  ) {
    await this.accountService.updateSignature(BigInt(accountId), BigInt(req.user.id), signature);
    return { ok: true };
  }

  @Get('accounts/:accountId/processed-signature')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  async getProcessedSignature(
    @Param('accountId') accountId: string,
    @Req() req: any,
  ) {
    const account = await this.accountService.findAccountForUser(BigInt(accountId), BigInt(req.user.id));
    const profile = await this.prisma.profile.findUnique({
      where: { id: account.profileId },
      include: {
        primaryOrganization: true,
        employeeProfile: true,
        organizations: {
          include: {
            organization: true,
          },
        },
      },
    });

    if (!profile) return { html: '' };

    const emailDomain = account.emailAddress.split('@')[1]?.toLowerCase().trim();
    let matchedOrg = profile.primaryOrganization;

    if (emailDomain && profile.organizations && profile.organizations.length > 0) {
      for (const membership of profile.organizations) {
        const org = membership.organization;
        if (!org) continue;
        const meta = (org.metadata && typeof org.metadata === 'object') ? (org.metadata as any) : {};
        const configDomain = meta.domain ? String(meta.domain).toLowerCase().trim() : null;
        let webDomain = null;
        if (meta.website) {
          try {
            webDomain = meta.website.replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0].toLowerCase().trim();
          } catch (e) {
            // ignore
          }
        }
        if (
          configDomain === emailDomain ||
          webDomain === emailDomain ||
          org.code?.toLowerCase().trim() === emailDomain
        ) {
          matchedOrg = org;
          break;
        }
      }
    }

    const orgMetadata = (matchedOrg?.metadata && typeof matchedOrg.metadata === 'object')
      ? (matchedOrg.metadata as any)
      : {};

    const vars: Record<string, string> = {
      firstName: profile.firstName ?? '',
      lastName: profile.lastName ?? '',
      email: account.emailAddress ?? profile.email ?? '',
      phone: profile.phone ?? '',
      title: profile.employeeProfile?.jobTitle ?? profile.occupation ?? 'Staff Member',
      companyName: matchedOrg?.name ?? orgMetadata.company_name ?? 'The Organisation',
      logoUrl: orgMetadata.logo_url ?? '',
      website: orgMetadata.website ?? '',
      address: orgMetadata.address ?? '',
    };

    const defaultTemplate = `
<table cellpadding="0" cellspacing="0" style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 13px; color: #334155; line-height: 1.6; margin-top: 24px; border-collapse: collapse; border-top: 1px solid #e2e8f0; padding-top: 16px; width: 100%; max-width: 500px;">
  <tr>
    {{#logoUrl}}
    <td style="vertical-align: top; padding-right: 16px; padding-top: 8px; width: 80px;">
      <img src="{{logoUrl}}" alt="{{companyName}}" style="width: 70px; height: 70px; border-radius: 8px; object-fit: contain; display: block;" />
    </td>
    <td style="vertical-align: top; padding-left: 16px; border-left: 2px solid #034785; padding-top: 4px;">
    {{/logoUrl}}
    {{^logoUrl}}
    <td style="vertical-align: top; border-left: 3px solid #034785; padding-left: 16px; padding-top: 4px;">
    {{/logoUrl}}
      <div style="font-size: 15px; font-weight: 700; color: #0f172a; letter-spacing: -0.01em;">{{firstName}} {{lastName}}</div>
      <div style="font-size: 11px; color: #64748b; font-weight: 600; margin-top: 2px; text-transform: uppercase; letter-spacing: 0.05em;">{{title}}</div>
      <div style="font-size: 13px; color: #034785; font-weight: 600; margin-top: 4px;">{{companyName}}</div>
      
      <table cellpadding="0" cellspacing="0" style="font-size: 12px; color: #475569; margin-top: 8px; border-collapse: collapse;">
        {{#phone}}
        <tr>
          <td style="padding: 1px 0; color: #64748b; font-weight: 600; width: 18px; vertical-align: middle;">P:</td>
          <td style="padding: 1px 0; vertical-align: middle;"><a href="tel:{{phone}}" style="color: #475569; text-decoration: none;">{{phone}}</a></td>
        </tr>
        {{/phone}}
        <tr>
          <td style="padding: 1px 0; color: #64748b; font-weight: 600; width: 18px; vertical-align: middle;">E:</td>
          <td style="padding: 1px 0; vertical-align: middle;"><a href="mailto:{{email}}" style="color: #034785; text-decoration: none; font-weight: 500;">{{email}}</a></td>
        </tr>
        {{#website}}
        <tr>
          <td style="padding: 1px 0; color: #64748b; font-weight: 600; width: 18px; vertical-align: middle;">W:</td>
          <td style="padding: 1px 0; vertical-align: middle;"><a href="{{website}}" target="_blank" style="color: #475569; text-decoration: none;">{{website}}</a></td>
        </tr>
        {{/website}}
        {{#address}}
        <tr>
          <td style="padding: 1px 0; color: #64748b; font-weight: 600; width: 18px; vertical-align: top; padding-top: 3px;">A:</td>
          <td style="padding: 1px 0; color: #475569; line-height: 1.4; vertical-align: top; padding-top: 2px;">{{address}}</td>
        </tr>
        {{/address}}
      </table>
    </td>
  </tr>
</table>
    `.trim();

    const rawTemplate = orgMetadata.signature_template ?? account.signature ?? defaultTemplate;

    let result = rawTemplate;
    for (const [key, val] of Object.entries(vars)) {
      result = result.replace(new RegExp(`{{\\s*${key}\\s*}}`, 'g'), val);
      if (val) {
        result = result.replace(new RegExp(`{{\\s*#${key}\\s*}}([\\s\\S]*?){{\\s*\\/${key}\\s*}}`, 'g'), '$1');
      } else {
        result = result.replace(new RegExp(`{{\\s*#${key}\\s*}}([\\s\\S]*?){{\\s*\\/${key}\\s*}}`, 'g'), '');
      }
    }

    result = result.replace(/{{\s*#.*?\s*}}([\s\S]*?){{\s*\/.*?\s*}}/g, '');
    result = result.replace(/{{\s*.*?\s*}}/g, '');

    return { html: result };
  }

  @Post('webhooks/gmail')
  async handleGmailWebhook(@Body() body: any) {
    if (!body?.message?.data) return { ok: true };
    try {
      const decodedString = Buffer.from(body.message.data, 'base64').toString('utf-8');
      const data = JSON.parse(decodedString);
      const emailAddress = data.emailAddress;
      if (emailAddress) {
        const account = await this.prisma.mailAccount.findFirst({
          where: { emailAddress, provider: 'GOOGLE' },
        });
        if (account) {
          await this.syncService.syncAccount(account);
        }
      }
    } catch (err) {
      console.error('Failed to handle Gmail webhook', err);
    }
    return { ok: true };
  }

  @Post('webhooks/outlook')
  async handleOutlookWebhook(
    @Query('validationToken') validationToken: string,
    @Body() body: any,
    @Res() res: any,
  ) {
    if (validationToken) {
      res.status(200).header('Content-Type', 'text/plain').send(validationToken);
      return;
    }

    if (body?.value && Array.isArray(body.value)) {
      for (const notification of body.value) {
        const subscriptionId = notification.subscriptionId;
        if (subscriptionId) {
          const account = await this.prisma.mailAccount.findFirst({
            where: { outlookSubscriptionId: subscriptionId },
          });
          if (account) {
            await this.syncService.syncAccount(account);
          }
        }
      }
    }

    res.status(202).send();
  }
}
