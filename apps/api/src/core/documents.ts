import { existsSync, readFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { extname, resolve } from 'node:path';
import JSZip from 'jszip';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { PdfService } from '$core/pdf';

export type DocumentIds = {
  requestId?: string;
  voucherId?: string;
  invoiceId?: string;
  options?: Record<string, unknown>;
};

export type DocumentOutput = {
  buffer: Buffer;
  mimeType: 'application/pdf' | 'application/zip';
  fileName: string;
  artifactType: string;
};

export type DocumentResponse = {
  file_name: string;
  mime_type: string;
  content_base64: string;
  generated_at: string;
  request_id?: string;
};

    const isFinanceRole = (label: string) => {
      const l = label.toLowerCase();
      return (
        l.includes("accountant") ||
        l.includes("finance") ||
        l.includes("cleared")
      );
    };

    const rows = entries
      .map((entry, idx) => {
        const effectiveType =
          entry.type === "approval" && isFinanceRole(entry.role_label)
            ? "clearance"
            : entry.type;
        const cfg = typeConfig[effectiveType] ?? typeConfig.approval;
        const nameAndEmail = entry.actor_email
          ? `${this.escapeHtml(entry.actor_name)} &lt;${this.escapeHtml(entry.actor_email)}&gt;`
          : this.escapeHtml(entry.actor_name);
        const attachmentList =
          entry.attachments && entry.attachments.length > 0
            ? `<div style="margin-top:6px; font-size:11px; color:#475569;"><strong>Attached:</strong> ${entry.attachments.map((a) => this.escapeHtml(a.name)).join(", ")}</div>`
            : "";
        const commentBlock = entry.comment
          ? `<div style="font-size:12px; color:#111; line-height:1.7; margin-top:6px; white-space:pre-wrap;">${this.escapeHtml(entry.comment)}</div>`
          : "";
        return `<div style="border-left:3px solid ${cfg.color}; padding:10px 14px; margin-bottom:10px; background:${idx === 0 ? "#f8fafc" : "#fff"}; border-radius:0 6px 6px 0; border-top:1px solid #f1f5f9; border-right:1px solid #f1f5f9; border-bottom:1px solid #f1f5f9;">
          <div style="display:flex; justify-content:space-between; align-items:baseline; flex-wrap:wrap; gap:4px; margin-bottom:5px;">
            <div>
              <span style="font-weight:700; font-size:12px;">${this.escapeHtml(entry.role_label)}</span>
              <span style="color:#475569; font-size:11px; margin-left:8px;">${nameAndEmail}</span>
            </div>
            <div style="font-size:10px; color:#94a3b8;">${this.formatDateTime(entry.at)}</div>
          </div>
          <span style="display:inline-block; background:${cfg.color}; color:#fff; font-size:10px; font-weight:600; padding:2px 8px; border-radius:9999px; margin-bottom:4px;">${cfg.icon} ${cfg.label}</span>
          ${commentBlock}${attachmentList}
        </div>`;
      })
      .join("");

    return `<div>${rows}</div>`;
  }
}
