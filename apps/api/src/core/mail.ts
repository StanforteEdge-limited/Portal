import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import nodemailer from 'nodemailer';
import Handlebars from 'handlebars';
import { Logger } from '$core/logger';

const SUPPORTED_TEMPLATE_FILES: Record<string, string> = {
  layout: 'layout.hbs',
  invitation: 'invitation.hbs',
  welcome: 'welcome.hbs',
  reset_password: 'reset-password.hbs',
};

export type SendMailInput = {
  to: string;
  subject: string;
  text: string;
  html?: string;
  template?: string;
  templateContext?: Record<string, unknown>;
  portalUrl?: string;
  ctaLabel?: string;
  threadKey?: string;
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentType?: string;
    encoding?: string;
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

function paragraph(html: string): string {
  return `<p style="margin:0; color:#1f2937; line-height:1.7;">${html}</p>`;
}

export class MailTemplatesService {
  private readonly logger = new Logger(MailTemplatesService.name);
  private readonly engine = Handlebars.create();
  private readonly registry = new Map<string, Handlebars.TemplateDelegate>();

  private static readonly DEFAULTS = {
    year: () => String(new Date().getFullYear()),
    siteName: () => process.env.MAIL_FROM_NAME?.trim() || 'Stanforte Edge Portal',
    supportEmail: () => process.env.MAIL_SUPPORT_EMAIL || 'support@stanforteedge.com',
  };

  constructor() {
    const dir = this.resolveTemplatesDir();
    this.engine.registerHelper('escape', (value: unknown) => this.escapeHTML(value));
    this.engine.registerHelper('url', (href: unknown, label: unknown) =>
      new this.engine.SafeString(`<a href="${this.escapeAttr(href)}">${this.escapeHTML(label)}</a>`),
    );

    for (const [name, file] of Object.entries(SUPPORTED_TEMPLATE_FILES)) {
      const abs = join(dir, file);
      if (!existsSync(abs)) {
        this.logger.warn(`Mail template "${file}" not found in ${dir}; ${name} will fall back to inline`);
        continue;
      }
      try {
        this.registry.set(name, this.engine.compile(readFileSync(abs, 'utf8')));
      } catch (error) {
        this.logger.error(
          `Failed to compile mail template "${name}" from ${abs}`,
          error instanceof Error ? error.stack : String(error),
        );
      }
    }

    if (!this.registry.size) {
      this.logger.warn('No mail templates loaded; all sends will fall back to inline HTML');
    }
  }

  render(name: string, ctx: Record<string, unknown> = {}): string | null {
    const compiled = this.registry.get(name);
    if (!compiled) {
      this.logger.warn(`Mail template "${name}" not registered; fall back to inline`);
      return null;
    }
    const body = compiled({ ...ctx });
    return name === 'layout' ? body : this.renderLayout(body, ctx);
  }

  renderLayout(body: string, ctx: Record<string, unknown> = {}): string {
    const layout = this.registry.get('layout');
    if (!layout) return body;
    return layout({
      ...MailTemplatesService.DEFAULTS,
      ...ctx,
      body: new this.engine.SafeString(body),
    });
  }

  private resolveTemplatesDir(): string {
    const candidates = [
      process.env.EMAIL_TEMPLATES_DIR,
      join(__dirname, '../templates/emails'),
      resolve(process.cwd(), 'src/templates/emails'),
      resolve(process.cwd(), 'dist/templates/emails'),
    ].filter((path): path is string => Boolean(path));

    for (const candidate of candidates) {
      try {
        if (existsSync(candidate) && existsSync(join(candidate, SUPPORTED_TEMPLATE_FILES.layout))) {
          return candidate;
        }
      } catch {
        // continue to next candidate
      }
    }

    this.logger.warn(`No mail template directory found; tried: ${candidates.join(', ')}`);
    return candidates[0] ?? resolve(process.cwd(), 'src/templates/emails');
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

export class MailService {
  constructor(private readonly templates: MailTemplatesService) {}

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
      auth: { user, pass },
    });
  }

  canSend() {
    return Boolean(this.transporter && process.env.MAIL_FROM);
  }

  private renderEmailHtml(input: SendMailInput): string {
    if (input.template) {
      const rendered = this.templates.render(input.template, input.templateContext ?? {});
      if (rendered) return rendered;
    }

    const appUrl = process.env.APP_BASE_URL || 'http://localhost:3000';
    const defaultPortalUrl = appUrl.replace(/\/$/, '');
    const portalUrl = String(input.portalUrl ?? defaultPortalUrl).trim() || defaultPortalUrl;
    const safePortalUrl = escapeHtml(portalUrl);
    const safeCtaLabel = escapeHtml(String(input.ctaLabel ?? 'Open Portal').trim() || 'Open Portal');
    const body = input.html?.trim() || paragraph(escapeHtml(input.text).replace(/\n/g, '<br />'));
    const cta = `<p style="margin:22px 0 0;"><a href="${safePortalUrl}" style="display:inline-block; background:#FC2621; color:#ffffff; text-decoration:none; font-weight:600; font-size:14px; padding:10px 14px; border-radius:8px;">${safeCtaLabel}</a></p>`;

    return this.templates.renderLayout(`${body}${cta}`, { subject: input.subject });
  }

  async send(input: SendMailInput) {
    const renderedHtml = this.renderEmailHtml(input);
    if (!this.transporter || !process.env.MAIL_FROM) {
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
        references: [rootThreadMessageId],
      });


      return { sent: true as const, messageId: info.messageId };
    } catch (error: any) {
      return { sent: false as const, reason: 'send_failed' as const };
    }
  }

}
