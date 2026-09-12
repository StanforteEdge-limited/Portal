import { Injectable, Logger } from '@nestjs/common';
import Handlebars from 'handlebars';

/**
 * In-memory Handlebar email templates (bulk/leaf rendering engine supplier).
 *
 * - Templates are TS constant strings compiled once at construction — zero
 *   `.hbs`/disk coupling, survives `tsc` → `dist` and container copies.
 * - `render(name, ctx)` returns `null` when the named template is not
 *   registered so callers fail-open to their existing inline HTML (a renamed
 *   template can never drop an email).
 * - Every data interpolation is escaped by default (`{{x}}`) and helpers
 *   exposed for safe URLs / attributes.
 */
@Injectable()
export class MailTemplatesService {
  private readonly logger = new Logger(MailTemplatesService.name);
  private readonly engine = Handlebars.create();
  private readonly registry = new Map<string, Handlebars.TemplateDelegate>();

  private static readonly REGISTRY: Record<string, string> = {
    layout: `<!doctype html>
<html lang="en">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /></head>
<body style="margin:0; padding:0; background:#f3f6fb; font-family:Segoe UI, Arial, Helvetica, sans-serif;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
    <tr><td align="center" style="padding:32px 12px;">
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:620px;">
        <tr><td style="background:#ffffff; border-radius:12px; overflow:hidden; border:1px solid #e5e7eb;">
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#034785;">
            <tr><td style="padding:24px 26px;">
              <div style="color:#ffffff; font-size:20px; font-weight:700;">{{siteName}}</div>
              <div style="margin-top:4px; color:#dbeafe; font-size:13px;">Creating Shared Prosperity</div>
            </td></tr>
          </table>
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
            <tr><td style="padding:26px 26px;">{{{body}}}</td></tr>
          </table>
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#f8fafc; border-top:1px solid #e5e7eb;">
            <tr><td style="padding:18px 26px;">
              <div style="font-size:12px; color:#64748b;">Sent by Stanforte Edge Portal · Contact <a href="mailto:{{supportEmail}}" style="color:#034785;">{{supportEmail}}</a></div>
              <div style="margin-top:6px; font-size:12px; color:#94a3b8;">&copy; {{year}} Stanforte Edge. All rights reserved.</div>
            </td></tr>
          </table>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,

    reset_password: `<p style="margin:0 0 18px; font-size:15px; color:#111827; line-height:1.7;">Hello {{displayName}},</p>
<p style="margin:0 0 22px; font-size:15px; color:#111827; line-height:1.7;">We received a request to reset your Stanforte Edge Portal password. Tap the button below to choose a new one. This link is valid for 15 minutes.</p>
<p style="margin:0 0 22px;"><a href="{{resetUrl}}" style="display:inline-block; background:#FC2621; color:#ffffff; text-decoration:none; font-weight:600; font-size:15px; padding:12px 28px; border-radius:8px;">Reset password</a></p>
<p style="margin:0 0 22px; font-size:13px; color:#64748b;">If the button doesn't work, paste this link into your browser:</p>
<p style="margin:0 0 6px; font-size:13px; color:#0f172a; word-break:break-all;"><a href="{{resetUrl}}">{{resetUrl}}</a></p>
<p style="margin:0; font-size:13px; color:#64748b;">If you didn't request a password reset, you can safely ignore this email.</p>`,

    invitation: `<p style="margin:0 0 18px; font-size:15px; color:#111827; line-height:1.7;">Hello {{displayName}},</p>
<p style="margin:0 0 22px; font-size:15px; color:#111827; line-height:1.7;">You have been invited to Stanforte Edge Portal. Tap the button below to set up your password and get started.</p>
<p style="margin:0 0 18px;"><a href="{{inviteUrl}}" style="display:inline-block; background:#FC2621; color:#ffffff; text-decoration:none; font-weight:600; font-size:15px; padding:12px 28px; border-radius:8px;">Accept invitation</a></p>
<p style="margin:0 0 6px; font-size:13px; color:#64748b;">If the button doesn't work, paste this link into your browser:</p>
<p style="margin:0 0 18px; font-size:13px; color:#0f172a; word-break:break-all;"><a href="{{inviteUrl}}">{{inviteUrl}}</a></p>
<p style="margin:0; font-size:13px; color:#64748b;">This invitation expires on {{expiresOn}}.</p>`,

    welcome: `<p style="margin:0 0 18px; font-size:15px; color:#111827; line-height:1.7;">Hello {{displayName}},</p>
<p style="margin:0 0 22px; font-size:15px; color:#111827; line-height:1.7;">Your account has been created on Stanforte Edge Portal. Tap the button below to sign in.</p>
<p style="margin:0 0 18px;"><a href="{{portalUrl}}" style="display:inline-block; background:#FC2621; color:#ffffff; text-decoration:none; font-weight:600; font-size:15px; padding:12px 28px; border-radius:8px;">Sign in</a></p>
<p style="margin:0; font-size:13px; color:#64748b;">If the button doesn't work, paste this link into your browser:</p>
<p style="margin:0; font-size:13px; color:#0f172a; word-break:break-all;"><a href="{{portalUrl}}">{{portalUrl}}</a></p>`
  };

  private static readonly DEFAULTS = {
    year: () => String(new Date().getFullYear()),
    siteName: () => process.env.MAIL_FROM_NAME?.trim() || 'Stanforte Edge Portal',
    supportEmail: () => process.env.MAIL_SUPPORT_EMAIL || 'support@stanforteedge.com',
  };

  constructor() {
    this.engine.registerHelper('escape', (value: unknown) =>
      this.escapeHTML(value),
    );
    this.engine.registerHelper('url', (href: unknown, label: unknown) =>
      new this.engine.SafeString(
        `<a href="${this.escapeAttr(href)}">${this.escapeHTML(label)}</a>`,
      ),
    );
    for (const [name, source] of Object.entries(MailTemplatesService.REGISTRY)) {
      this.registry.set(name, this.engine.compile(source));
    }
  }

  /**
   * Render `name` with `ctx` wrapped in the shared layout. Returns `null` when
   * the template is not registered (callers fall back to inline HTML).
   */
  render(name: string, ctx: Record<string, unknown> = {}): string | null {
    const compiled = this.registry.get(name);
    if (!compiled) {
      this.logger.warn(`Mail template "${name}" not registered — fall back to inline`);
      return null;
    }
    const body = compiled({ ...ctx });
    const layout = this.registry.get('layout');
    if (!layout || name === 'layout') return body;
    return layout({
      ...MailTemplatesService.DEFAULTS,
      ...ctx,
      body: new this.engine.SafeString(body)
    });
  }

  private escapeHTML(value: unknown): string {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private escapeAttr(value: unknown): string {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }
}
