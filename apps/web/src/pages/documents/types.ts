export type DocumentCategory = "policy" | "wiki" | "handbook" | "general";

export interface DocumentSharedRecord {
  id: string;
  recipient_name: string;
  recipient_email: string;
  recipient_avatar?: string;
  recipient_role?: string;
  shared_at: string;
  sender_name: string;
  message?: string;
  channels: ("email" | "chat")[];
}

export interface DocumentItem {
  id: string;
  title: string;
  slug?: string;
  category: DocumentCategory;
  status: "published" | "draft" | "archived";
  version: string;
  effective_date?: string;
  created_at: string;
  updated_at?: string;
  content_html?: string;
  link_url?: string;
  file_id?: string;
  require_acknowledgement: boolean;
  author_name?: string;
  author_email?: string;
  file?: {
    id: string;
    file_name: string;
    file_size: number;
    mime_type: string;
    public_url?: string;
    storage_path?: string;
  } | null;
  acknowledgements?: Array<{
    id: string;
    user_name: string;
    acknowledged_at: string;
    version: string;
  }>;
  shares?: DocumentSharedRecord[];
}

export const INITIAL_DOCUMENTS: DocumentItem[] = [
  {
    id: "doc-1",
    title: "Stanforte Code of Business Conduct & Ethics 2026",
    slug: "stanforte-code-of-conduct-2026",
    category: "policy",
    status: "published",
    version: "v2.1",
    effective_date: "2026-01-01",
    created_at: "2026-01-15T09:00:00Z",
    require_acknowledgement: true,
    author_name: "People & Governance Committee",
    content_html: `
      <h2>1. Purpose & Core Values</h2>
      <p>This Code of Conduct outlines the ethical boundaries and fiduciary duties expected of all staff, contractors, and partners acting on behalf of Stanforte Edge.</p>
      <h3>2. Anti-Bribery & Fair Dealing</h3>
      <p>Employees are strictly prohibited from soliciting, receiving, or facilitating unlawful inducements, gifts over corporate threshold values, or conflicts of interest.</p>
      <h3>3. Confidentiality & Data Protection</h3>
      <p>All confidential donor, financial, and client materials must remain strictly encrypted and handled in accordance with NDPR and international privacy standards.</p>
    `,
    file: {
      id: "file-code-conduct",
      file_name: "Code_of_Business_Conduct_2026.pdf",
      file_size: 2450000,
      mime_type: "application/pdf",
      storage_path: "documents/policies/Code_of_Business_Conduct_2026.pdf",
    },
    acknowledgements: [
      {
        id: "ack-1",
        user_name: "Amina Yusuf",
        acknowledged_at: "2026-02-01T14:30:00Z",
        version: "v2.1",
      },
    ],
    shares: [
      {
        id: "sh-1",
        recipient_name: "Amina Yusuf",
        recipient_email: "amina.y@stanforteedge.com",
        recipient_avatar: "AY",
        recipient_role: "Product Design",
        shared_at: "2026-02-01T10:00:00Z",
        sender_name: "HR Operations",
        message: "Please read and sign before next Monday's all-hands meeting.",
        channels: ["email", "chat"],
      },
    ],
  },
  {
    id: "doc-2",
    title: "Employee Workplace Handbook & Benefits SOP",
    slug: "employee-workplace-handbook",
    category: "handbook",
    status: "published",
    version: "v3.0",
    effective_date: "2026-01-10",
    created_at: "2026-01-12T11:00:00Z",
    require_acknowledgement: true,
    author_name: "HR Operations",
    content_html: `
      <h2>Workplace Operating Procedures</h2>
      <p>Comprehensive guide covering working hours, remote-work eligibility, HMO healthcare benefits, annual leave cycles, and disciplinary procedures.</p>
    `,
    file: {
      id: "file-handbook",
      file_name: "Employee_Handbook_2026_Final.pdf",
      file_size: 3820000,
      mime_type: "application/pdf",
      storage_path: "documents/handbooks/Employee_Handbook_2026.pdf",
    },
    acknowledgements: [],
    shares: [],
  },
  {
    id: "doc-3",
    title: "Cloud Infrastructure CI/CD & Deployment SOP",
    slug: "devops-cicd-deployment-guide",
    category: "wiki",
    status: "published",
    version: "v1.4",
    effective_date: "2026-02-15",
    created_at: "2026-02-18T16:20:00Z",
    require_acknowledgement: false,
    author_name: "DevOps & Engineering",
    content_html: `
      <h2>Automated Pipelines & Deployment Rules</h2>
      <p>Step-by-step instructions for container builds, blue/green deployments, environment variables encryption, and automated rollback triggers.</p>
    `,
    shares: [],
  },
  {
    id: "doc-4",
    title: "Travel & Operational Expense Reimbursement Policy",
    slug: "travel-expense-reimbursement-policy",
    category: "policy",
    status: "published",
    version: "v1.8",
    effective_date: "2026-01-05",
    created_at: "2026-01-08T08:15:00Z",
    require_acknowledgement: false,
    author_name: "Finance & Treasury",
    content_html: `
      <h2>Expense Claims & Per Diem Allowances</h2>
      <p>Policies governing domestic and international flight bookings, daily travel per diems, receipt retention guidelines, and payment approval workflows.</p>
    `,
    file: {
      id: "file-travel-policy",
      file_name: "Travel_Expense_Policy_v1.8.pdf",
      file_size: 1120000,
      mime_type: "application/pdf",
      storage_path: "documents/policies/Travel_Expense_Policy.pdf",
    },
    shares: [],
  },
];
