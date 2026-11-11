export type TaskStatus = "planned" | "in_progress" | "blocked" | "completed";
export type TaskPriority = "low" | "medium" | "high" | "critical";

export interface TaskAssignee {
  id: string;
  name: string;
  avatar?: string;
  email?: string;
  role?: string;
}

export interface TaskUpdate {
  id: string;
  author: string;
  avatar?: string;
  text: string;
  created_at: string;
}

export interface TaskItem {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  due_date?: string;
  created_at?: string;
  owner_id?: string;
  owner_name?: string;
  assignees: TaskAssignee[];
  tags: string[];
  project_name?: string;
  updates: TaskUpdate[];
}

export const SAMPLE_TEAM_MEMBERS: TaskAssignee[] = [
  { id: "usr-1", name: "Amina Yusuf", avatar: "AY", email: "amina.y@stanforteedge.com", role: "Product Design" },
  { id: "usr-2", name: "Emeka Okafor", avatar: "EO", email: "emeka.o@stanforteedge.com", role: "Enterprise Sales" },
  { id: "usr-3", name: "Folake Adeleke", avatar: "FA", email: "folake.a@stanforteedge.com", role: "Cloud & DevOps" },
  { id: "usr-4", name: "Chinedu Eze", avatar: "CE", email: "chinedu.e@stanforteedge.com", role: "Frontend Lead" },
  { id: "usr-5", name: "Zainab Bello", avatar: "ZB", email: "zainab.b@stanforteedge.com", role: "Product Manager" },
  { id: "usr-6", name: "Tunde Bakare", avatar: "TB", email: "tunde.b@stanforteedge.com", role: "Infrastructure" },
  { id: "usr-7", name: "Kemi Adebayo", avatar: "KA", email: "kemi.a@stanforteedge.com", role: "UI/UX Designer" },
];

export const INITIAL_TASKS: TaskItem[] = [
  {
    id: "task-101",
    title: "Implement Fastify authentication token rotation & secure cookie RFC",
    description: "Upgrade OAuth2 token exchange and session refresh pipeline with Redis blacklist for enterprise compliance.",
    status: "in_progress",
    priority: "critical",
    due_date: "2026-11-14",
    created_at: "2026-11-09T10:00:00Z",
    owner_name: "Folake Adeleke",
    assignees: [
      { id: "usr-3", name: "Folake Adeleke", avatar: "FA", role: "Cloud & DevOps" },
      { id: "usr-4", name: "Chinedu Eze", avatar: "CE", role: "Frontend Lead" },
    ],
    tags: ["Backend", "Security", "Sprint 44"],
    project_name: "Portal Modernization",
    updates: [
      {
        id: "upd-1",
        author: "Folake Adeleke",
        avatar: "FA",
        text: "Redis blacklist connection established on port 6379 with automatic retry policy.",
        created_at: "Yesterday at 4:15 PM",
      },
      {
        id: "upd-2",
        author: "Chinedu Eze",
        avatar: "CE",
        text: "Tested token refresh on staging client. Works smoothly without redirect loop.",
        created_at: "Today at 10:20 AM",
      },
    ],
  },
  {
    id: "task-102",
    title: "Modernize Payment Voucher detail slide-over with WHT statutory deductions",
    description: "Provide interactive breakdown for withholding tax (WHT) and source bank verification before disbursement.",
    status: "completed",
    priority: "high",
    due_date: "2026-11-12",
    created_at: "2026-11-08T09:30:00Z",
    owner_name: "Emeka Okafor",
    assignees: [
      { id: "usr-2", name: "Emeka Okafor", avatar: "EO", role: "Enterprise Sales" },
      { id: "usr-1", name: "Amina Yusuf", avatar: "AY", role: "Product Design" },
    ],
    tags: ["Finance", "Vouchers", "UI"],
    project_name: "ERP Treasury",
    updates: [
      {
        id: "upd-3",
        author: "Emeka Okafor",
        avatar: "EO",
        text: "Added 5% and 10% statutory tax deduction options in compliance with FIRS guidelines.",
        created_at: "Nov 10 at 2:00 PM",
      },
    ],
  },
  {
    id: "task-103",
    title: "Produce Q4 departmental budget variance & forecast projections",
    description: "Aggregate fiscal budget allocations across HR, Engineering, and Sales to evaluate burn rate before annual audit.",
    status: "in_progress",
    priority: "high",
    due_date: "2026-11-18",
    created_at: "2026-11-09T14:00:00Z",
    owner_name: "Zainab Bello",
    assignees: [
      { id: "usr-5", name: "Zainab Bello", avatar: "ZB", role: "Product Manager" },
    ],
    tags: ["Finance", "Audits", "Planning"],
    project_name: "Fiscal Planning 2026",
    updates: [
      {
        id: "upd-4",
        author: "Zainab Bello",
        avatar: "ZB",
        text: "Awaiting final travel expenditure figures from Sales operations.",
        created_at: "Today at 9:00 AM",
      },
    ],
  },
  {
    id: "task-104",
    title: "Draft employee security policy & quarterly compliance assessment",
    description: "Update the corporate handbook with remote device encryption rules and ISO 27001 guidelines.",
    status: "planned",
    priority: "medium",
    due_date: "2026-11-20",
    created_at: "2026-11-10T11:00:00Z",
    owner_name: "Tunde Bakare",
    assignees: [
      { id: "usr-6", name: "Tunde Bakare", avatar: "TB", role: "Infrastructure" },
      { id: "usr-5", name: "Zainab Bello", avatar: "ZB", role: "Product Manager" },
    ],
    tags: ["HR", "Policy", "Compliance"],
    project_name: "Governance",
    updates: [],
  },
  {
    id: "task-105",
    title: "Database schema migration for attendance geofencing radius & beacon tracking",
    description: "Add geo_radius_meters and beacon_uuid fields to sta_office_locations table with PostGIS indices.",
    status: "blocked",
    priority: "critical",
    due_date: "2026-11-13",
    created_at: "2026-11-07T12:00:00Z",
    owner_name: "Chinedu Eze",
    assignees: [
      { id: "usr-4", name: "Chinedu Eze", avatar: "CE", role: "Frontend Lead" },
      { id: "usr-3", name: "Folake Adeleke", avatar: "FA", role: "Cloud & DevOps" },
    ],
    tags: ["Attendance", "Database", "GIS"],
    project_name: "Lagos HQ Tracking",
    updates: [
      {
        id: "upd-5",
        author: "Chinedu Eze",
        avatar: "CE",
        text: "Blocked: PostGIS extension requires superuser elevation in staging PostgreSQL container.",
        created_at: "Yesterday at 11:45 AM",
      },
    ],
  },
  {
    id: "task-106",
    title: "Redesign staff time tracking and daily standup logger interface",
    description: "Build interactive timeline with instant project hour attribution, break deductions, and client billing tags.",
    status: "planned",
    priority: "low",
    due_date: "2026-11-25",
    created_at: "2026-11-10T15:00:00Z",
    owner_name: "Kemi Adebayo",
    assignees: [
      { id: "usr-7", name: "Kemi Adebayo", avatar: "KA", role: "UI/UX Designer" },
    ],
    tags: ["UI/UX", "Timesheets"],
    project_name: "Portal Modernization",
    updates: [],
  },
];
