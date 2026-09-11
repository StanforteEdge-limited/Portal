import { pgEnum } from 'drizzle-orm/pg-core';

export const tokenTypeEnum = pgEnum("token_type", ["access", "refresh", "reset", "invite"]);
export type TokenType = typeof tokenTypeEnum.enumValues[number];

export const organizationTypeEnum = pgEnum("organization_type", ["group", "venture", "shared_function"]);
export type OrganizationType = typeof organizationTypeEnum.enumValues[number];

export const groupUserRoleEnum = pgEnum("group_user_role", ["member", "admin", "moderator"]);
export type GroupUserRole = typeof groupUserRoleEnum.enumValues[number];

export const requestStatusEnum = pgEnum("request_status", ["draft", "returned", "sent", "approval", "cleared", "approved", "rejected", "cancelled", "payment_processing", "disbursed", "confirmed", "partially_disbursed", "pending_retirement", "retired", "completed"]);
export type RequestStatus = typeof requestStatusEnum.enumValues[number];

export const employmentTypeEnum = pgEnum("employment_type", ["full_time", "contract", "intern", "consultant"]);
export type EmploymentType = typeof employmentTypeEnum.enumValues[number];

export const employmentStatusEnum = pgEnum("employment_status", ["draft", "active", "suspended", "exited"]);
export type EmploymentStatus = typeof employmentStatusEnum.enumValues[number];

export const workModeEnum = pgEnum("work_mode", ["onsite", "hybrid", "remote"]);
export type WorkMode = typeof workModeEnum.enumValues[number];

export const onboardingStatusEnum = pgEnum("onboarding_status", ["invited", "accepted", "profile_pending", "forms_pending", "hr_review", "completed"]);
export type OnboardingStatus = typeof onboardingStatusEnum.enumValues[number];

export const workItemTypeEnum = pgEnum("work_item_type", ["weekly_task", "daily_task", "project_activity", "recurring_responsibility", "ad_hoc"]);
export type WorkItemType = typeof workItemTypeEnum.enumValues[number];

export const workItemStatusEnum = pgEnum("work_item_status", ["planned", "in_progress", "completed", "blocked", "carried_over", "cancelled"]);
export type WorkItemStatus = typeof workItemStatusEnum.enumValues[number];

export const workPriorityEnum = pgEnum("work_priority", ["low", "medium", "high", "critical"]);
export type WorkPriority = typeof workPriorityEnum.enumValues[number];

export const workLogApprovalStatusEnum = pgEnum("work_log_approval_status", ["draft", "submitted", "approved", "rejected"]);
export type WorkLogApprovalStatus = typeof workLogApprovalStatusEnum.enumValues[number];

export const procurementCategoryEnum = pgEnum("procurement_category", ["goods", "services", "works"]);
export type ProcurementCategory = typeof procurementCategoryEnum.enumValues[number];

export const paymentPatternEnum = pgEnum("payment_pattern", ["post_delivery", "pre_payment", "milestone"]);
export type PaymentPattern = typeof paymentPatternEnum.enumValues[number];

export const procurementStatusEnum = pgEnum("procurement_status", ["draft", "submitted", "approved", "rejected", "returned", "converted_to_po", "cancelled"]);
export type ProcurementStatus = typeof procurementStatusEnum.enumValues[number];

export const poStatusEnum = pgEnum("po_status", ["draft", "pending_approval", "approved", "sent", "acknowledged", "partially_received", "received", "completed", "cancelled"]);
export type PoStatus = typeof poStatusEnum.enumValues[number];

export const grnStatusEnum = pgEnum("grn_status", ["pending", "confirmed", "disputed"]);
export type GrnStatus = typeof grnStatusEnum.enumValues[number];

export const mailProviderEnum = pgEnum("mail_provider", ["GOOGLE", "MICROSOFT"]);
export type MailProvider = typeof mailProviderEnum.enumValues[number];
