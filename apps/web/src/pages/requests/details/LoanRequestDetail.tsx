import { useRequestDetails } from "./context";
import { LoanRequestBody } from "../bodies/LoanRequestBody";
import { SummarySection, type SummaryCard } from "./shared/SummarySection";
import { formatCurrency, formatDisplayDate } from "@stanforte/shared";

export function LoanRequestDetail() {
  const { request, requestData, teamName, organizationName } = useRequestDetails();

  if (!request) return null;

  const loanAmount = Number(request.total_amount || requestData?.loan_amount || 0);
  const repaymentPeriod = Number(requestData?.repayment_period_months || requestData?.repayment_months || 0);
  const monthlyInstallment = repaymentPeriod > 0 ? loanAmount / repaymentPeriod : 0;
  const disbursedAt = requestData?.disbursed_at as string | undefined;

  const cards: SummaryCard[] = [
    { label: "Loan Amount", value: formatCurrency(loanAmount, request.currency), tone: "neutral" },
    {
      label: "Repayment Period",
      value: repaymentPeriod > 0 ? `${repaymentPeriod} month${repaymentPeriod === 1 ? "" : "s"}` : "-",
      tone: "neutral",
    },
    {
      label: "Monthly Installment",
      value: monthlyInstallment > 0 ? formatCurrency(monthlyInstallment, request.currency) : "-",
      tone: "neutral",
    },
    {
      label: disbursedAt ? "Disbursed On" : "Disbursement",
      value: disbursedAt ? formatDisplayDate(disbursedAt) : "Pending",
      tone: disbursedAt ? "success" : "pending",
    },
  ];

  return (
    <>
      <SummarySection cards={cards} />
      <LoanRequestBody
        request={request}
        requestData={requestData}
        teamName={teamName}
        organizationName={organizationName}
      />
    </>
  );
}
