import { downloadRequestArtifact } from "@/pages/requests/requests-api";

export function formatCertificateCurrency(
  amount: number,
  currency?: string | null,
) {
  const value = Number.isFinite(amount) ? amount : 0;
  const formatted = new Intl.NumberFormat("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
  const prefix = currency ? String(currency).toUpperCase() : "NGN";
  return `${prefix} ${formatted}`;
}

/**
 * Generates the Certificate of Honor by calling the API (server-side Puppeteer renderer),
 * then returns a File object compatible with the existing upload flow in RetireDialog.
 */
export async function buildCertificateOfHonorPdf(input: {
  requestId: string;
  requestLabel: string;
  voucherNumber: string;
  staffName: string;
  amountLabel: string;
  declaration: string;
  reason: string;
  issuedAt: string;
  signatureFileId?: string;
}): Promise<File> {
  const result = await downloadRequestArtifact(input.requestId, {
    action: "certificate_of_honor_pdf",
    staff_name: input.staffName,
    request_label: input.requestLabel,
    voucher_number: input.voucherNumber,
    amount_label: input.amountLabel,
    declaration: input.declaration,
    reason: input.reason,
    issued_at: input.issuedAt,
    signature_file_id: input.signatureFileId,
  });

  // Convert base64 → ArrayBuffer → File
  const binary = atob(result.content_base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new File(
    [bytes.buffer],
    result.file_name ||
      `Certificate_of_Honor_${input.requestLabel.replace(/[\\/]+/g, "-")}.pdf`,
    { type: "application/pdf" },
  );
}
