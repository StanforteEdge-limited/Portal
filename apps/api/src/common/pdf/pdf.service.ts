import { Injectable, Logger } from '@nestjs/common';
import { existsSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import puppeteer from 'puppeteer';

@Injectable()
export class PdfService {
  private readonly logger = new Logger(PdfService.name);

  /**
   * Single entry point for HTML → PDF rendering across the app. Never throws:
   * on any launch/render failure it returns a plaintext fallback PDF instead,
   * so callers don't each need their own try/catch around Puppeteer.
   */
  async renderPdfFromHtml(html: string, fallbackLines: string[] = []): Promise<Buffer> {
    try {
      return await this.renderWithPuppeteer(html);
    } catch (error: any) {
      const suffix = error?.message ? String(error.message).slice(0, 120) : 'renderer error';
      this.logger.error(`PDF render failed, using fallback: ${suffix}`);
      return this.buildSimplePdfFallback([...fallbackLines, `PDF renderer fallback: ${suffix}`]);
    }
  }

  private async renderWithPuppeteer(html: string): Promise<Buffer> {
    const configuredPath = process.env.PDF_BROWSER_PATH;
    const executablePath = configuredPath && existsSync(configuredPath) ? configuredPath : undefined;
    if (configuredPath && !executablePath) {
      this.logger.warn(`PDF_BROWSER_PATH is set to "${configuredPath}" but no file exists there — ignoring it`);
    }

    const runtimeDir = process.env.PDF_RUNTIME_DIR || join(tmpdir(), 'stanforteedge-pdf');
    const cacheDir = join(runtimeDir, 'cache');
    const configDir = join(runtimeDir, 'config');
    const userDataDir = join(runtimeDir, 'puppeteer');
    for (const dir of [runtimeDir, cacheDir, configDir, userDataDir]) {
      mkdirSync(dir, { recursive: true });
    }

    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      env: {
        ...process.env,
        HOME: process.env.HOME || runtimeDir,
        XDG_CACHE_HOME: process.env.XDG_CACHE_HOME || cacheDir,
        XDG_CONFIG_HOME: process.env.XDG_CONFIG_HOME || configDir,
      },
      userDataDir,
      ...(executablePath ? { executablePath } : {}),
    });

    try {
      const page = await browser.newPage();
      await page.setContent(html);
      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' },
      });
      return Buffer.from(pdf);
    } finally {
      await browser.close();
    }
  }

  private buildSimplePdfFallback(lines: string[]): Buffer {
    const sanitized = lines.map((line) =>
      String(line).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)'),
    );
    const stream = [
      'BT',
      '/F1 11 Tf',
      '50 790 Td',
      '14 TL',
      ...sanitized.map((line, index) => (index === 0 ? `(${line}) Tj` : `T* (${line}) Tj`)),
      'ET',
    ].join('\n');
    const header = '%PDF-1.4\n';
    const objects: string[] = [
      '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
      '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
      '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>\nendobj\n',
      `4 0 obj\n<< /Length ${Buffer.byteLength(stream, 'utf8')} >>\nstream\n${stream}\nendstream\nendobj\n`,
      '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n',
    ];
    const xref: number[] = [0];
    let body = '';
    for (const obj of objects) {
      xref.push(header.length + body.length);
      body += obj;
    }
    const xrefStart = header.length + body.length;
    const xrefLines = ['xref', `0 ${xref.length}`, '0000000000 65535 f '];
    for (let i = 1; i < xref.length; i += 1) {
      xrefLines.push(`${String(xref[i]).padStart(10, '0')} 00000 n `);
    }
    const trailer = [
      'trailer',
      `<< /Size ${xref.length} /Root 1 0 R >>`,
      'startxref',
      String(xrefStart),
      '%%EOF',
    ].join('\n');
    return Buffer.from(`${header}${body}${xrefLines.join('\n')}\n${trailer}\n`, 'utf8');
  }
}
