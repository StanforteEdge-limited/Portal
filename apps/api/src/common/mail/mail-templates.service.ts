import { Injectable, Logger } from '@nestjs/common';
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import Handlebars from 'handlebars';

const SUPPORTED_TEMPLATE_FILES: Record<string, string> = {
  layout: 'layout.hbs',
  invitation: 'invitation.hbs',
  welcome: 'welcome.hbs',
  reset_password: 'reset-password.hbs',
};

/**
 * Handlebars email templates loaded from `.hbs` files on disk.
 *
 * - Template files live in `src/common/mail/templates/` during development and
 *   are copied into `dist/common/mail/templates/` on build so they survive
 *   `tsc` -> `dist` and container copies (see `scripts/copy-email-templates.js`).
 * - The directory is resolved, in order: `EMAIL_TEMPLATES_DIR`, the folder
 *   next to this file, `src/common/mail/templates` relative to CWD,
 *   `<CWD>/email-templates`, `<CWD>/templates`. The first directory that
 *   actually contains `layout.hbs` wins.
 * - `render(name, ctx)` returns `null` when the named template could not be
 *   loaded so callers fail-open to their existing inline HTML (a renamed or
 *   missing template can never drop an email).
 * - Every data interpolation is escaped by default (`{{x}}`) and helpers are
 *   exposed for safe URLs / attributes.
 */
@Injectable()
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
    this.engine.registerHelper('escape', (value: unknown) =>
      this.escapeHTML(value),
    );
    this.engine.registerHelper('url', (href: unknown, label: unknown) =>
      new this.engine.SafeString(
        `<a href="${this.escapeAttr(href)}">${this.escapeHTML(label)}</a>`,
      ),
    );

    for (const [name, file] of Object.entries(SUPPORTED_TEMPLATE_FILES)) {
      const abs = join(dir, file);
      if (!existsSync(abs)) {
        this.logger.warn(`Mail template "${file}" not found in ${dir} — ${name} will fall back to inline`);
        continue;
      }
      try {
        const source = readFileSync(abs, 'utf8');
        this.registry.set(name, this.engine.compile(source));
      } catch (error) {
        this.logger.error(`Failed to compile mail template "${name}" from ${abs}`, error instanceof Error ? error.stack : String(error));
      }
    }

    if (!this.registry.size) {
      this.logger.warn('No mail templates loaded — all sends will fall back to inline HTML');
    }
  }

  private resolveTemplatesDir(): string {
    const candidates = [
      process.env.EMAIL_TEMPLATES_DIR,
      join(__dirname, 'templates'),
      resolve(process.cwd(), 'src/common/mail/templates'),
      resolve(process.cwd(), 'email-templates'),
      resolve(process.cwd(), 'templates'),
    ].filter((path): path is string => Boolean(path));

    for (const candidate of candidates) {
      try {
        if (existsSync(candidate) && existsSync(join(candidate, SUPPORTED_TEMPLATE_FILES.layout))) {
          return candidate;
        }
      } catch {
        // ignore unresolvable candidates and continue
      }
    }

    this.logger.warn(`No mail template directory found — tried: ${candidates.join(', ')}`);
    return candidates[0] ?? resolve(process.cwd(), 'email-templates');
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