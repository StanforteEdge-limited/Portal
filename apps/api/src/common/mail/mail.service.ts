import { Injectable } from '@nestjs/common';
import nodemailer from 'nodemailer';
import { PrismaService } from '../prisma/prisma.service';
import { toBigInt } from '../utils/ids';

type SendMailInput = {
  to: string;
  subject: string;
  text: string;
  html?: string;
  portalUrl?: string;
  ctaLabel?: string;
  threadKey?: string;
  userId?: string | bigint;
  notifiableType?: string;
  notifiableId?: string | number | bigint;
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }>;
};

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

@Injectable()
export class MailService {
  constructor(private readonly prisma: PrismaService) {}

  private transporter = this.buildTransporter();

  private buildTransporter() {
    const host = process.env.SMTP_HOST;
    const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (!host || !user || !pass) return null;

    return nodemailer.createTransport({
      host,
      port,
      secure: String(process.env.SMTP_SECURE || '').toLowerCase() === 'true',
      auth: {
        user,
        pass
      }
    });
  }

  canSend() {
    return Boolean(this.transporter && process.env.MAIL_FROM);
  }

  private renderEmailHtml(input: SendMailInput): string {
    const appUrl = process.env.APP_BASE_URL || 'http://localhost:3000';
    const defaultPortalUrl = appUrl.replace(/\/$/, '');
    const portalUrl = String(input.portalUrl ?? defaultPortalUrl).trim() || defaultPortalUrl;
    const safePortalUrl = escapeHtml(portalUrl);
    const safeCtaLabel = escapeHtml(String(input.ctaLabel ?? 'Open Portal').trim() || 'Open Portal');
    const supportEmail = process.env.MAIL_SUPPORT_EMAIL || 'support@stanforteedge.com';
    const year = new Date().getFullYear();
    const logoUrl = process.env.MAIL_LOGO_URL || '';
    const safeSubject = escapeHtml(input.subject);
    const safeTextAsHtml = escapeHtml(input.text).replace(/\n/g, '<br />');
    const bodyContent =
      input.html && input.html.trim().length > 0
        ? input.html
        : `<p style="margin:0; color:#1f2937; line-height:1.7;">${safeTextAsHtml}</p>`;

    return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${safeSubject}</title>
</head>
<body style="margin:0; padding:0; background:#f3f6fb; font-family:Segoe UI, Arial, Helvetica, sans-serif;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#f3f6fb; padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:640px; background:#ffffff; border-radius:12px; overflow:hidden; border:1px solid #e5e7eb;">
          <tr>
            <td style="background:#034785; padding:24px;">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td style="vertical-align:middle;">
                    ${logoUrl ? `<img src="${logoUrl}" alt="Stanforte Edge" style="height:36px; max-width:220px; display:block;" />` : `<div style="color:#ffffff; font-size:22px; font-weight:700;">Stanforte Edge Portal</div>`}
                    <div style="margin-top:6px; color:#dbeafe; font-size:13px;">Creating Shared Prosperity</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 24px 18px;">
              <h1 style="margin:0 0 8px; font-size:22px; line-height:1.3; color:#0f172a;">${safeSubject}</h1>
              <p style="margin:0; font-size:14px; color:#64748b;">Notification from your Stanforte Edge Portal</p>
            </td>
          </tr>
          <tr>
            <td style="padding:0 24px 24px;">
              <div style="font-size:15px; color:#111827; line-height:1.7;">
                ${bodyContent}
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:0 24px 24px;">
              <a href="${safePortalUrl}" style="display:inline-block; background:#FC2621; color:#ffffff; text-decoration:none; font-weight:600; font-size:14px; padding:10px 14px; border-radius:8px;">${safeCtaLabel}</a>
            </td>
          </tr>
          <tr>
            <td style="background:#f8fafc; padding:18px 24px; border-top:1px solid #e5e7eb;">
              <div style="font-size:12px; color:#6b7280; line-height:1.6;">
                This email was sent by Stanforte Edge Portal. For support contact <a href="mailto:${supportEmail}" style="color:#034785; text-decoration:none;">${supportEmail}</a>.
              </div>
              <div style="margin-top:6px; font-size:12px; color:#9ca3af;">&copy; ${year} Stanforte Edge. All rights reserved.</div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }

  async send(input: SendMailInput) {
    const renderedHtml = this.renderEmailHtml(input);
    if (!this.transporter || !process.env.MAIL_FROM) {
      try {
        await this.prisma.emailLog.create({
          data: {
            userId: input.userId !== undefined ? toBigInt(input.userId) : null,
            toEmail: input.to,
            subject: input.subject,
            bodyText: input.text,
            bodyHtml: renderedHtml,
            threadKey: input.threadKey ?? null,
            provider: 'smtp',
            status: 'skipped',
            errorMessage: 'smtp_not_configured',
            notifiableType: input.notifiableType ?? null,
            notifiableId: input.notifiableId !== undefined ? toBigInt(input.notifiableId) : null
          }
        });
      } catch (error) {
        void error;
      }
      return { sent: false, reason: 'smtp_not_configured' as const };
    }

    const domain = process.env.MAIL_MESSAGE_ID_DOMAIN || 'stanforteedge.local';
    const normalizedThread = (input.threadKey || 'general').replace(/[^a-zA-Z0-9_.-]/g, '-').toLowerCase();
    const rootThreadMessageId = `<thread-${normalizedThread}@${domain}>`;
    const messageId = `<thread-${normalizedThread}-${Date.now()}-${Math.random().toString(16).slice(2)}@${domain}>`;

    try {
      const fromName = (process.env.MAIL_FROM_NAME || '').trim();
      const fromAddress = process.env.MAIL_FROM;
      const from = fromName ? `"${fromName.replace(/"/g, '\\"')}" <${fromAddress}>` : fromAddress;

      const info = await this.transporter.sendMail({
        from,
        to: input.to,
        subject: input.subject,
        text: input.text,
        html: renderedHtml,
        attachments: input.attachments,
        messageId,
        inReplyTo: rootThreadMessageId,
        references: [rootThreadMessageId]
      });

      try {
        await this.prisma.emailLog.create({
          data: {
            userId: input.userId !== undefined ? toBigInt(input.userId) : null,
            toEmail: input.to,
            subject: input.subject,
            bodyText: input.text,
            bodyHtml: renderedHtml,
            threadKey: input.threadKey ?? null,
            provider: 'smtp',
            status: 'sent',
            messageId: info.messageId ?? messageId,
            notifiableType: input.notifiableType ?? null,
            notifiableId: input.notifiableId !== undefined ? toBigInt(input.notifiableId) : null
          }
        });
      } catch (error) {
        void error;
      }

      return {
        sent: true as const,
        messageId: info.messageId
      };
    } catch (error: any) {
      try {
        await this.prisma.emailLog.create({
          data: {
            userId: input.userId !== undefined ? toBigInt(input.userId) : null,
            toEmail: input.to,
            subject: input.subject,
            bodyText: input.text,
            bodyHtml: renderedHtml,
            threadKey: input.threadKey ?? null,
            provider: 'smtp',
            status: 'failed',
            errorMessage: error?.message ? String(error.message) : 'send_failed',
            notifiableType: input.notifiableType ?? null,
            notifiableId: input.notifiableId !== undefined ? toBigInt(input.notifiableId) : null
          }
        });
      } catch (logError) {
        void logError;
      }
      return { sent: false as const, reason: 'send_failed' as const };
    }
  }
}
