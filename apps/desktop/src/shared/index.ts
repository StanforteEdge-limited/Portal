// ─── Hooks ──────────────────────────────────────────────────────────────────────
export { usePermission } from "./hooks/usePermission";

// ─── Layout ───────────────────────────────────────────────────────────────────
export { AppShell } from "./components/layout/AppShell";
export { ActivityFeed } from "./components/layout/ActivityFeed";
export type { ActivityItem } from "./components/layout/ActivityFeed";
export { Breadcrumbs } from "./components/layout/Breadcrumbs";
export type { BreadcrumbItem } from "./components/layout/Breadcrumbs";
export { EmptyState } from "./components/layout/EmptyState";
export { FilterBar } from "./components/layout/FilterBar";
export { MobileBottomNav } from "./components/layout/MobileBottomNav";
export { MobileMenuSheet } from "./components/layout/MobileMenuSheet";
export { PageHeader } from "./components/layout/PageHeader";
export { RightRail } from "./components/layout/RightRail";
export { SectionCard } from "./components/layout/SectionCard";
export { Sidebar } from "./components/layout/Sidebar";
export type { SidebarItem } from "./components/layout/Sidebar";
export { Toolbar } from "./components/layout/Toolbar";
export { DesktopTopBar, MobileTopBar } from "./components/layout/TopBar";
export { WorkflowStepper } from "./components/layout/WorkflowStepper";
export type { WorkflowStep, WorkflowStepStatus } from "./components/layout/WorkflowStepper";

// ─── UI ───────────────────────────────────────────────────────────────────────
export { Button } from "./components/ui/Button";
export { Chip } from "./components/ui/Chip";
export { Icon } from "./components/ui/Icon";
export { PaginationControls } from "./components/ui/PaginationControls";
export { StatCard } from "./components/ui/StatCard";
export { StatsGrid } from "./components/ui/StatsGrid";
export {
  Table,
  TableHead,
  TableHeaderRow,
  TableHeaderCell,
  TableBody,
  TableRow,
  TableCell,
} from "./components/ui/Table";
export { TextField, SelectField, Select, TextAreaField } from "./components/ui/fields";
export { TextInput } from "./components/ui/TextInput";
export { SlideOver, SlideOverPanel, SlideOverHeader, SlideOverContent, SlideOverFooter } from "./components/ui/SlideOver";
export { DataTable } from "./components/ui/DataTable";
export type { ColumnDef } from "./components/ui/DataTable";
export { SidebarTabs } from "./components/ui/SidebarTabs";
export {
  ApprovalFlowBuilder,
  createApprovalFlowStep,
  parseApprovalFlowSteps,
  serializeApprovalFlowSteps,
} from "./components/ui/ApprovalFlowBuilder";
export type { ApprovalFlowEditorStep, ApprovalStepMode } from "./components/ui/ApprovalFlowBuilder";

// ─── Feedback ─────────────────────────────────────────────────────────────────
export { ToastProvider, useToast } from "./components/feedback/ToastProvider";

// ─── Media ────────────────────────────────────────────────────────────────────
export { MediaPickerModal } from "./components/media/MediaPickerModal";
export type { MediaPickerItem, MediaPickerModalProps } from "./components/media/MediaPickerModal";

// ─── Re-exports from @stanforte/shared ─────────────────────────────────────────
export type { OrganizationItem, TeamItem, TeamOption, OfficeLocation, FinancePaymentVoucherRecord, FinancePVDeductionRecord, FinanceAccountRecord, FinanceRequestDeductionRecord } from "@stanforte/shared";
