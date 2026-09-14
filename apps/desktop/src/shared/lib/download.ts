import { createJobsApi, waitForBackgroundJob } from "@stanforte/shared";
import { httpRequest } from "@/shared/lib/core";

export function downloadBase64File(
  fileName: string,
  mimeType: string,
  contentBase64: string,
) {
  const bytes = atob(contentBase64);
  const arr = new Uint8Array(bytes.length);
  for (let index = 0; index < bytes.length; index += 1) {
    arr[index] = bytes.charCodeAt(index);
  }
  const blob = new Blob([arr], { type: mimeType });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

export async function fetchJobFile(
  jobId: string,
): Promise<{ bytes: Uint8Array; file_name: string }> {
  const jobs = createJobsApi(httpRequest);
  const job = await waitForBackgroundJob(jobs, jobId);
  const info = await jobs.getDownload(jobId);
  const fileName = info.file_name || `download-${jobId}.pdf`;
  const response = await fetch(info.download_url);
  if (!response.ok) {
    throw new Error(`Failed to download generated file for job ${jobId}.`);
  }
  const bytes = new Uint8Array(await response.arrayBuffer());
  return { bytes, file_name: fileName };
}

export async function downloadBackgroundJob(jobId: string): Promise<string> {
  const { bytes, file_name } = await fetchJobFile(jobId);
  const url = window.URL.createObjectURL(new Blob([bytes]));
  const link = document.createElement("a");
  link.href = url;
  link.download = file_name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
  return file_name;
}