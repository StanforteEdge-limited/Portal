import type { WorkflowStep } from "@/shared";
import { buildAppNavigation, buildAppMobileNav } from "@/shared/navigation";

export type RequestStatusTone = "success" | "warning" | "pending" | "danger" | "neutral";

export type RequestRow = {
  id: string;
  type: string;
  submitted: string;
  status: string;
  tone: RequestStatusTone;
  icon: string;
  summary: string;
  detail: string;
};

export type RequestTypeCard = {
  title: string;
  description: string;
  icon: string;
  cta: string;
  badge?: string;
};

export type SupportCard = {
  title: string;
  description: string;
  cta: string;
  icon: string;
};

export type RequestDetailItem = {
  label: string;
  value: string;
};

export type RequestDocument = {
  name: string;
  meta: string;
  icon: string;
  tone: "blue" | "amber" | "green";
};

export type RequestActivity = {
  title: string;
  description: string;
  time: string;
  tone: RequestStatusTone;
  icon: string;
};

export type RequestLineItem = {
  item: string;
  category: string;
  unitPrice: string;
  qty: string;
  amount: string;
  attachment: string;
  attachmentTone: "success" | "pending" | "neutral";
};

// Re-export navigation helpers for backward compatibility
export const buildRequestsNavigation = buildAppNavigation;
export const requestsMobileNav = buildAppMobileNav("Requests");
export { buildAppMobileNav };

export const listStats = [
  { label: "Total Requests", value: "24", tone: "neutral" as const, note: "" },
  { label: "Pending Action", value: "07", tone: "pending" as const, note: "" },
  { label: "Completed", value: "17", tone: "success" as const, note: "" },
];

export const requestRows: RequestRow[] = [
  {
    id: "REQ-2023-0842",
    type: "Leave (Annual)",
    submitted: "Oct 24, 2023",
    status: "Pending",
    tone: "pending",
    icon: "event_note",
    summary: "Leave Request",
    detail: "Dates Oct 12 – Oct 15, 2023",
  },
  {
    id: "REQ-2023-0811",
    type: "Reimbursement",
    submitted: "Oct 18, 2023",
    status: "Approved",
    tone: "success",
    icon: "payments",
    summary: "Financial Request",
    detail: "Amount $1,240.50",
  },
  {
    id: "REQ-2023-0795",
    type: "Equipment",
    submitted: "Oct 12, 2023",
    status: "Rejected",
    tone: "danger",
    icon: "devices",
    summary: "Financial Request",
    detail: "Date Sep 28, 2023",
  },
  {
    id: "REQ-2023-0762",
    type: "Leave (Sick)",
    submitted: "Oct 05, 2023",
    status: "Approved",
    tone: "success",
    icon: "local_hospital",
    summary: "Leave Request",
    detail: "Dates Oct 5 – Oct 6, 2023",
  },
  {
    id: "REQ-2023-0740",
    type: "Reimbursement",
    submitted: "Sep 28, 2023",
    status: "Pending",
    tone: "pending",
    icon: "receipt_long",
    summary: "Financial Request",
    detail: "Amount $500.00",
  },
];

export const requestTypeCards: RequestTypeCard[] = [
  {
    title: "Financial Request",
    description: "Submit expenses, budget adjustments, or procurement requests for department resources and equipment.",
    icon: "account_balance_wallet",
    cta: "Begin Application",
    badge: "FREQUENT",
  },
  {
    title: "Leave Request",
    description: "Manage your time off, sick leave, or personal holiday. Check your remaining balance and team availability.",
    icon: "event_available",
    cta: "Check Calendar",
  },
];

export const requestTypeSupport: SupportCard[] = [
  {
    title: "Recent Activity",
    description: "View status of your 3 pending requests.",
    cta: "Open Requests",
    icon: "list_alt",
  },
  {
    title: "Submission Guide",
    description: "Learn about approval cycles and SLAs.",
    cta: "Read Guide",
    icon: "menu_book",
  },
  {
    title: "Live Support",
    description: "Get help with complex filing needs.",
    cta: "Contact Support",
    icon: "support_agent",
  },
];

export const requestDetailOverview: RequestDetailItem[] = [
  { label: "Department", value: "Global Marketing Operations" },
  { label: "Budget Category", value: "Software & Subscriptions" },
  { label: "Estimated Value", value: "$14,250.00 USD" },
  { label: "Priority Level", value: "Medium" },
];

export const requestDetailSummaryCards = [
  {
    label: "Estimated Amount",
    value: "$14,250.00",
    delta: "USD",
    hint: "Approved budget allocation",
    tone: "neutral" as const,
  },
  {
    label: "Priority",
    value: "Medium",
    delta: "Queue",
    hint: "Executive review queue",
    tone: "warning" as const,
  },
  {
    label: "Department",
    value: "Marketing Ops",
    delta: "Global",
    hint: "Global marketing operations",
    tone: "neutral" as const,
  },
];

export const requestDetailDocuments: RequestDocument[] = [
  { name: "Vendor_Quote_q4.pdf", meta: "2.4 MB • PDF Document", icon: "description", tone: "blue" },
  { name: "Budget_Projection.xlsx", meta: "1.1 MB • Excel Sheet", icon: "table_chart", tone: "amber" },
];

export const requestDetailLineItems: RequestLineItem[] = [
  {
    item: "Enterprise License Subscription",
    category: "Software & Subscriptions",
    unitPrice: "$2,400.00",
    qty: "1",
    amount: "$2,400.00",
    attachment: "Quote.pdf",
    attachmentTone: "success",
  },
  {
    item: "Premium Analytics Module",
    category: "Reporting",
    unitPrice: "$1,800.00",
    qty: "2",
    amount: "$3,600.00",
    attachment: "Spec.pdf",
    attachmentTone: "pending",
  },
  {
    item: "Implementation & Support",
    category: "Service",
    unitPrice: "$1,375.00",
    qty: "6",
    amount: "$8,250.00",
    attachment: "SOW.pdf",
    attachmentTone: "neutral",
  },
];

export const requestDetailActivity: RequestActivity[] = [
  {
    title: "Review Comment Added",
    description:
      '"Checked the budget alignment with Q4 targets. Looks consistent, please proceed to financial desk."',
    time: "Today, 10:24 AM",
    tone: "neutral",
    icon: "chat",
  },
  {
    title: "Status Updated Under Review",
    description:
      'System automatically transitioned from "Submitted" to "Under Review" after manager validation.',
    time: "Yesterday, 4:15 PM",
    tone: "pending",
    icon: "swap_horiz",
  },
  {
    title: "Request Created",
    description: "Original submission by Sarah Jenkins with 2 attachments.",
    time: "Oct 12, 2:30 PM",
    tone: "success",
    icon: "add_circle",
  },
];

export const requestDetailWorkflow: WorkflowStep[] = [
  {
    label: "Submitted",
    detail: "Submitted on Oct 12, 2023",
    status: "complete",
  },
  {
    label: "Department Validation",
    detail: "Yesterday, 4:15 PM",
    status: "complete",
  },
  {
    label: "Financial Review",
    detail: "Currently Processing",
    status: "current",
  },
  {
    label: "Executive Authorization",
    detail: "Awaiting next step",
    status: "upcoming",
  },
  {
    label: "Procurement Release",
    detail: "Scheduled Final Step",
    status: "upcoming",
  },
];

export const requestDetailMobileWorkflow: WorkflowStep[] = [
  {
    label: "Request Submitted",
    detail: "Submitted on Oct 12, 2023",
    status: "complete",
  },
  {
    label: "Department Review",
    detail: "In progress since Oct 15, 2023",
    status: "current",
  },
  {
    label: "Final Approval",
    detail: "Pending review",
    status: "upcoming",
  },
];

export const financialRequestTags = ["Urgent", "Q4_Budget", "+ Add Tag"];

export const financialRequestItems = [
  { item: "AWS Cloud Services", category: "Infrastructure", unitPrice: "$1,450.00", qty: "1", amount: "$1,450.00", attachment: "invoice.pdf", attachmentTone: "success" as const },
  { item: "Google Tablet Replacement", category: "Field Ops", unitPrice: "$599.00", qty: "3", amount: "$1,798.00", attachment: "receipt.jpg", attachmentTone: "pending" as const },
];

export const financialSummary = {
  total: "$2,248.00",
  note: "This total is ready for submission and approval.",
};
