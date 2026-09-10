import {
  listRequests,
  listApprovals,
  type RequestRecord,
} from "@/pages/requests/requests-api";
import { workflowTypeFromRecord } from "@/pages/requests/request-helpers";

export type { RequestRecord };

export async function listHrLoanRequests(params?: {
  status?: string;
  user_id?: string;
}): Promise<RequestRecord[]> {
  const query: Record<string, unknown> = { family: "loan" };
  if (params?.status) query.status = params.status;
  if (params?.user_id) query.user_id = params.user_id;
  const requests = await listRequests(query);
  return requests.filter((r) => workflowTypeFromRecord(r) === "loan");
}

export async function listHrLoanApprovals(): Promise<RequestRecord[]> {
  const approvals = await listApprovals({ family: "loan" });
  return approvals.filter((r) => workflowTypeFromRecord(r) === "loan");
}
