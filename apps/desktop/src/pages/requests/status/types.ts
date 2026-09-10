export type StatusTone =
  | "success"
  | "warning"
  | "pending"
  | "danger"
  | "neutral";

export type ViewerStatus = {
  label: string;
  hint: string;
  tone: StatusTone;
};

export type PaymentProgress = {
  label: string;
  hint: string;
};

export type LoanProgress = {
  label: string;
  hint: string;
};

/** @deprecated Use PaymentProgress */
export type FinanceProgress = PaymentProgress;
