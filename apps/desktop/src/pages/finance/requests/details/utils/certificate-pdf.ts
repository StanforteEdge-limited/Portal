import { downloadRequestArtifact } from "@/pages/requests/requests-api";
import { fetchJobFile } from "@/shared/lib/download";

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
  const file = await downloadRequestArtifact(input.requestId, {
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

  // Poll the background job, fetch the generated file, return it as a File
  const { bytes, file_name } = await fetchJobFile(file.job_id);
  return new File(
    [bytes],
    file_name ||
      `Certificate_of_Honor_${input.requestLabel.replace(/[\\/]+/g, "-")}.pdf`,
    { type: "application/pdf" },
  );
}
