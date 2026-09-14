import type { HttpRequest } from "../auth/http-client";

export type BackgroundJobResponse = {
  job_id: string;
};

export type BackgroundJobStatus = Record<string, unknown> & {
  id: string;
  type: string;
  status: "queued" | "processing" | "completed" | "failed";
  progress: number;
  error: string | null;
  result: unknown;
};

export type BackgroundJobDownload = {
  file_name: string | null;
  download_url: string;
};

export function createJobsApi(httpRequest: HttpRequest) {
  return {
    getJob: (jobId: string) =>
      httpRequest<BackgroundJobStatus>(`/background-jobs/${jobId}`),
    getDownload: (jobId: string) =>
      httpRequest<BackgroundJobDownload>(`/background-jobs/${jobId}/download`),
  };
}

export type JobsApi = ReturnType<typeof createJobsApi>;

export async function waitForBackgroundJob(
  jobs: JobsApi,
  jobId: string,
  options: { intervalMs?: number; maxAttempts?: number } = {},
): Promise<BackgroundJobStatus> {
  const intervalMs = options.intervalMs ?? 1500;
  const maxAttempts = options.maxAttempts ?? 160;
  let lastStatus: BackgroundJobStatus | null = null;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const job = await jobs.getJob(String(jobId));
    lastStatus = job;
    if (job.status === "completed") return job;
    if (job.status === "failed") {
      throw new Error(
        (job.error ? `${job.error} ` : "") + `Background job ${jobId} failed.`,
      );
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  throw new Error(`Background job ${jobId} timed out.`);
}