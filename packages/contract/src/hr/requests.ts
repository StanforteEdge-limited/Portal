import { Type, type Static } from '@sinclair/typebox';
import {
  IsoDateTimeSchema,
  UuidSchema,
} from '../common/primitives';
import { MetadataSchema } from '../common/refs';

/**
 * Group, category, and type records use numeric string ids. The legacy DTOs
 * enforce this with `@Matches(/^\d+$/)`, which the generated schema dropped.
 */
const NumericIdSchema = Type.String({ pattern: '^\\d+$' });

export const RequestStorageTypeSchema = Type.Union([
  Type.Literal('json'),
  Type.Literal('form'),
  Type.Literal('special'),
  Type.Literal('bypass'),
]);
export type RequestStorageType = Static<typeof RequestStorageTypeSchema>;

export const RequestStatusSchema = Type.Union([
  Type.Literal('draft'),
  Type.Literal('returned'),
  Type.Literal('sent'),
  Type.Literal('approval'),
  Type.Literal('cleared'),
  Type.Literal('disbursed'),
  Type.Literal('confirmed'),
  Type.Literal('retired'),
  Type.Literal('completed'),
  Type.Literal('rejected'),
  Type.Literal('cancelled'),
]);
export type RequestStatus = Static<typeof RequestStatusSchema>;

export const RequestDownloadActionSchema = Type.Union([
  Type.Literal('request_pdf'),
  Type.Literal('pv_pdf'),
  Type.Literal('request_with_attachments'),
  Type.Literal('pv_with_attachments'),
  Type.Literal('full_package'),
  Type.Literal('full_document'),
  Type.Literal('certificate_of_honor_pdf'),
]);
export type RequestDownloadAction = Static<typeof RequestDownloadActionSchema>;

/* -------------------------------------------------------------------------- */
/* Taxonomy of request types                                                  */
/* -------------------------------------------------------------------------- */

export const CreateGroupSchema = Type.Object({
  name: Type.String(),
  code: Type.Optional(Type.String()),
  description: Type.Optional(Type.String()),
});
export type CreateGroup = Static<typeof CreateGroupSchema>;

export const UpdateGroupSchema = Type.Object({
  name: Type.Optional(Type.String()),
  code: Type.Optional(Type.String()),
  description: Type.Optional(Type.String()),
});
export type UpdateGroup = Static<typeof UpdateGroupSchema>;

export const CreateCategorySchema = Type.Object({
  group_id: UuidSchema,
  name: Type.String(),
  code: Type.String(),
  description: Type.Optional(Type.String()),
  sort_order: Type.Optional(Type.Integer()),
});
export type CreateCategory = Static<typeof CreateCategorySchema>;

export const UpdateCategorySchema = Type.Object({
  name: Type.Optional(Type.String()),
  code: Type.Optional(Type.String()),
  description: Type.Optional(Type.String()),
  is_active: Type.Optional(Type.Boolean()),
  sort_order: Type.Optional(Type.Integer()),
});
export type UpdateCategory = Static<typeof UpdateCategorySchema>;

export const CreateTypeSchema = Type.Object({
  category_id: UuidSchema,
  name: Type.String(),
  code_prefix: Type.String(),
  description: Type.Optional(Type.String()),
  taxonomy_keys: Type.Optional(Type.Array(Type.String())),
  storage_type: Type.Optional(RequestStorageTypeSchema),
  form_schema: Type.Optional(MetadataSchema),
  form_id: Type.Optional(UuidSchema),
  approval_flow_json: Type.Optional(MetadataSchema),
  approval_limit: Type.Optional(Type.Number()),
  visible_to_roles: Type.Optional(Type.Array(Type.String())),
  is_active: Type.Optional(Type.Boolean()),
  workflow_type: Type.Optional(Type.String()),
  handler_role_label: Type.Optional(Type.String()),
});
export type CreateType = Static<typeof CreateTypeSchema>;

/** Every `CreateType` field becomes optional. */
export const UpdateTypeSchema = Type.Object({
  name: Type.Optional(Type.String()),
  category_id: Type.Optional(UuidSchema),
  code_prefix: Type.Optional(Type.String()),
  description: Type.Optional(Type.String()),
  taxonomy_keys: Type.Optional(Type.Array(Type.String())),
  storage_type: Type.Optional(RequestStorageTypeSchema),
  form_schema: Type.Optional(MetadataSchema),
  form_id: Type.Optional(UuidSchema),
  approval_flow_json: Type.Optional(MetadataSchema),
  approval_limit: Type.Optional(Type.Number()),
  visible_to_roles: Type.Optional(Type.Array(Type.String())),
  is_active: Type.Optional(Type.Boolean()),
  workflow_type: Type.Optional(Type.String()),
  handler_role_label: Type.Optional(Type.String()),
});
export type UpdateType = Static<typeof UpdateTypeSchema>;

/* -------------------------------------------------------------------------- */
/* Request lifecycle                                                          */
/* -------------------------------------------------------------------------- */

export const SubmitRequestSchema = Type.Object({
  comment: Type.Optional(Type.String()),
});
export type SubmitRequest = Static<typeof SubmitRequestSchema>;

export const ActionRequestSchema = Type.Object({
  action: Type.String(),
  comment: Type.Optional(Type.String()),
});
export type ActionRequest = Static<typeof ActionRequestSchema>;

/* -------------------------------------------------------------------------- */
/* Line items                                                                 */
/* -------------------------------------------------------------------------- */

/** A single requested line. Create-only field: `vendor_id`. */
export const CreateRequestItemSchema = Type.Object({
  description: Type.String(),
  amount: Type.Number(),
  quantity: Type.Optional(Type.Number()),
  category_id: Type.Optional(UuidSchema),
  subcategory_id: Type.Optional(UuidSchema),
  /** ISO date string, not validated as a date by the legacy DTO. */
  due_date: Type.Optional(Type.String()),
  notes: Type.Optional(Type.String()),
  file_id: Type.Optional(UuidSchema),
  file_ids: Type.Optional(Type.Array(Type.String({ format: 'uuid' }))),
  vendor_id: Type.Optional(UuidSchema),
  bank_name: Type.Optional(Type.String()),
  account_number: Type.Optional(Type.String()),
  account_name: Type.Optional(Type.String()),
});
export type CreateRequestItem = Static<typeof CreateRequestItemSchema>;

/** Update variant: the vendor is fixed at creation time. */
export const UpdateRequestItemSchema = Type.Object({
  description: Type.String(),
  amount: Type.Number(),
  quantity: Type.Optional(Type.Number()),
  category_id: Type.Optional(UuidSchema),
  subcategory_id: Type.Optional(UuidSchema),
  due_date: Type.Optional(Type.String()),
  notes: Type.Optional(Type.String()),
  file_id: Type.Optional(UuidSchema),
  file_ids: Type.Optional(Type.Array(Type.String({ format: 'uuid' }))),
  bank_name: Type.Optional(Type.String()),
  account_number: Type.Optional(Type.String()),
  account_name: Type.Optional(Type.String()),
});
export type UpdateRequestItem = Static<typeof UpdateRequestItemSchema>;

export const CreateRequestSchema = Type.Object({
  request_type_id: UuidSchema,
  /**
   * Free-form payload whose shape is defined per request type. The legacy DTO
   * documents the procurement fields in prose via `@ApiProperty.description`.
   */
  data: MetadataSchema,
  team_id: Type.Optional(NumericIdSchema),
  organization_id: Type.Optional(NumericIdSchema),
  total_amount: Type.Optional(Type.Number()),
  currency: Type.Optional(Type.String()),
  items: Type.Optional(Type.Array(CreateRequestItemSchema)),
});
export type CreateRequest = Static<typeof CreateRequestSchema>;

export const UpdateRequestSchema = Type.Object({
  data: Type.Optional(MetadataSchema),
  team_id: Type.Optional(NumericIdSchema),
  organization_id: Type.Optional(NumericIdSchema),
  total_amount: Type.Optional(Type.Number()),
  currency: Type.Optional(Type.String()),
  items: Type.Optional(Type.Array(UpdateRequestItemSchema)),
});
export type UpdateRequest = Static<typeof UpdateRequestSchema>;

/* -------------------------------------------------------------------------- */
/* Manual backdated requests                                                  */
/* -------------------------------------------------------------------------- */

export const ManualDeductionSchema = Type.Object({
  deduction_type_id: UuidSchema,
  rate: Type.Number(),
  gross_amount: Type.Number(),
  deduction_amount: Type.Number(),
});
export type ManualDeduction = Static<typeof ManualDeductionSchema>;

export const ManualItemSchema = Type.Object({
  description: Type.String(),
  amount: Type.Number(),
  quantity: Type.Optional(Type.Number()),
  notes: Type.Optional(Type.String()),
  file_id: Type.Optional(UuidSchema),
  file_ids: Type.Optional(Type.Array(Type.String({ format: 'uuid' }))),
  bank_name: Type.Optional(Type.String()),
  account_number: Type.Optional(Type.String()),
  account_name: Type.Optional(Type.String()),
});
export type ManualItem = Static<typeof ManualItemSchema>;

export const ManualApprovalSchema = Type.Object({
  role: Type.String(),
  name: Type.Optional(Type.String()),
  date: Type.Optional(Type.String()),
  done: Type.Optional(Type.Boolean()),
  comment: Type.Optional(Type.String()),
});
export type ManualApproval = Static<typeof ManualApprovalSchema>;

export const ManualVoucherSchema = Type.Object({
  voucher_number: Type.Optional(Type.String()),
  amount: Type.Number(),
  method: Type.Optional(Type.String()),
  transaction_ref: Type.Optional(Type.String()),
  note: Type.Optional(Type.String()),
  disbursed_at: Type.Optional(Type.String()),
  evidence_file_id: Type.Optional(UuidSchema),
  evidence_file_ids: Type.Optional(Type.Array(Type.String({ format: 'uuid' }))),
  paid_from_account_id: Type.Optional(UuidSchema),
  retired_amount: Type.Optional(Type.Number()),
  retirement_status: Type.Optional(
    Type.Union([
      Type.Literal('not_retired'),
      Type.Literal('partial'),
      Type.Literal('retired'),
      Type.Literal('verified'),
    ]),
  ),
  retirement_file_ids: Type.Optional(Type.Array(Type.String({ format: 'uuid' }))),
  contact_id: Type.Optional(UuidSchema),
  gross_amount: Type.Optional(Type.Number()),
  net_amount: Type.Optional(Type.Number()),
  deductions: Type.Optional(Type.Array(ManualDeductionSchema)),
  refund_amount: Type.Optional(Type.Number()),
  refund_method: Type.Optional(Type.String()),
  refund_reference: Type.Optional(Type.String()),
  refund_date: Type.Optional(Type.String()),
});
export type ManualVoucher = Static<typeof ManualVoucherSchema>;

/** Backfills a request together with its full approval and disbursement trail. */
export const CreateManualRequestSchema = Type.Object({
  request_type_id: UuidSchema,
  /** Numeric profile id of the requester. */
  staff_id: NumericIdSchema,
  request_id: Type.Optional(NumericIdSchema),
  team_id: Type.Optional(NumericIdSchema),
  organization_id: Type.Optional(NumericIdSchema),
  status: Type.Optional(RequestStatusSchema),
  created_at: Type.Optional(Type.String()),
  currency: Type.Optional(Type.String()),
  total_amount: Type.Optional(Type.Number()),
  data: Type.Optional(MetadataSchema),
  approvals: Type.Optional(Type.Array(ManualApprovalSchema)),
  items: Type.Optional(Type.Array(ManualItemSchema)),
  disbursements: Type.Optional(Type.Array(ManualVoucherSchema)),
});
export type CreateManualRequest = Static<typeof CreateManualRequestSchema>;

/**
 * The generated schema was a bare `additionalProperties: true` object. The
 * legacy DTO is `UpdateManualRequestDto extends CreateManualRequestDto`, so the
 * update shape is the create shape with every field optional.
 */
export const UpdateManualRequestSchema = Type.Object({
  request_type_id: Type.Optional(UuidSchema),
  staff_id: Type.Optional(NumericIdSchema),
  request_id: Type.Optional(NumericIdSchema),
  team_id: Type.Optional(NumericIdSchema),
  organization_id: Type.Optional(NumericIdSchema),
  status: Type.Optional(RequestStatusSchema),
  created_at: Type.Optional(Type.String()),
  currency: Type.Optional(Type.String()),
  total_amount: Type.Optional(Type.Number()),
  data: Type.Optional(MetadataSchema),
  approvals: Type.Optional(Type.Array(ManualApprovalSchema)),
  items: Type.Optional(Type.Array(ManualItemSchema)),
  disbursements: Type.Optional(Type.Array(ManualVoucherSchema)),
});
export type UpdateManualRequest = Static<typeof UpdateManualRequestSchema>;

/* -------------------------------------------------------------------------- */
/* Retirement and downloads                                                   */
/* -------------------------------------------------------------------------- */

/** Closes out a payment voucher, optionally with proof-of-payment files. */
export const RetireRequestSchema = Type.Object({
  voucher_id: Type.Optional(UuidSchema),
  notes: Type.Optional(Type.String()),
  retired_amount: Type.Optional(Type.Number()),
  retirement_file_ids: Type.Optional(Type.Array(UuidSchema)),
  breakdown: Type.Optional(MetadataSchema),
});
export type RetireRequest = Static<typeof RetireRequestSchema>;

export const DownloadRequestSchema = Type.Object({
  action: Type.Optional(RequestDownloadActionSchema),
  voucher_id: Type.Optional(UuidSchema),
  delivery: Type.Optional(
    Type.Union([Type.Literal('download'), Type.Literal('email')]),
  ),
  email_to: Type.Optional(Type.String()),
  /**
   * The following eight are read off this object by the service and forwarded
   * into `DocumentIds.options`, but none of them are declared on the legacy
   * `DownloadRequestDto`. They only type-checked because the generated schema
   * typed every DTO as `Record<string, any>`. Treated as optional strings so
   * existing callers keep working.
   */
  signature_file_id: Type.Optional(Type.String()),
  staff_name: Type.Optional(Type.String()),
  request_label: Type.Optional(Type.String()),
  voucher_number: Type.Optional(Type.String()),
  amount_label: Type.Optional(Type.String()),
  declaration: Type.Optional(Type.String()),
  reason: Type.Optional(Type.String()),
  issued_at: Type.Optional(Type.String()),
});
export type DownloadRequest = Static<typeof DownloadRequestSchema>;

/* -------------------------------------------------------------------------- */
/* Responses                                                                  */
/* -------------------------------------------------------------------------- */

export const RequestItemFileResponseSchema = Type.Object({
  id: Type.String(),
  file_name: Type.String(),
  mime_type: Type.Union([Type.String(), Type.Null()]),
  public_url: Type.Union([Type.String(), Type.Null()]),
  storage_path: Type.Union([Type.String(), Type.Null()]),
});
export type RequestItemFileResponse = Static<typeof RequestItemFileResponseSchema>;

export const RequestItemResponseSchema = Type.Object({
  id: Type.String(),
  description: Type.String(),
  amount: Type.Number(),
  quantity: Type.Number(),
  category_id: Type.Union([Type.String(), Type.Null()]),
  subcategory_id: Type.Union([Type.String(), Type.Null()]),
  due_date: Type.Union([IsoDateTimeSchema, Type.Null()]),
  notes: Type.Union([Type.String(), Type.Null()]),
  file_id: Type.Union([Type.String(), Type.Null()]),
  file: Type.Union([RequestItemFileResponseSchema, Type.Null()]),
  files: Type.Array(RequestItemFileResponseSchema),
});
export type RequestItemResponse = Static<typeof RequestItemResponseSchema>;

export const RequestResponseSchema = Type.Object({
  id: Type.String(),
  status: Type.String(),
  request_type_id: Type.String(),
  group_id: Type.String(),
  organization_id: Type.Union([Type.String(), Type.Null()]),
  workflow_instance_id: Type.Union([Type.String(), Type.Null()]),
  created_by: Type.String(),
  team_id: Type.Union([Type.String(), Type.Null()]),
  currency: Type.String(),
  request_number: Type.String(),
  voucher_number: Type.Union([Type.String(), Type.Null()]),
  total_amount: Type.Union([Type.Number(), Type.Null()]),
  data: Type.Unknown(),
  created_at: IsoDateTimeSchema,
  updated_at: IsoDateTimeSchema,
  request_type: Type.Optional(
    Type.Object({
      id: Type.String(),
      name: Type.String(),
      code_prefix: Type.String(),
      taxonomy_keys: Type.Optional(Type.Union([Type.Array(Type.String()), Type.Null()])),
      approval_flow_json: Type.Optional(Type.Unknown()),
      form_schema: Type.Optional(Type.Unknown()),
      category_code: Type.Optional(Type.Union([Type.String(), Type.Null()])),
      workflow_type: Type.Optional(Type.Union([Type.String(), Type.Null()])),
      handler_role_label: Type.Optional(Type.Union([Type.String(), Type.Null()])),
    }),
  ),
  group: Type.Optional(
    Type.Object({
      id: Type.String(),
      name: Type.String(),
      code: Type.String(),
    }),
  ),
  creator: Type.Optional(
    Type.Object({
      id: Type.String(),
      username: Type.String(),
      email: Type.String(),
      first_name: Type.Union([Type.String(), Type.Null()]),
      last_name: Type.Union([Type.String(), Type.Null()]),
    }),
  ),
  organization: Type.Optional(
    Type.Object({
      id: Type.String(),
      name: Type.String(),
      code: Type.String(),
    }),
  ),
  team: Type.Optional(
    Type.Object({
      id: Type.String(),
      name: Type.String(),
    }),
  ),
  items: Type.Array(RequestItemResponseSchema),
  /** Approval trail summary, covering done and pending approvers. */
  approvals: Type.Optional(Type.Unknown()),
});
export type RequestResponse = Static<typeof RequestResponseSchema>;

/* -------------------------------------------------------------------------- */
/* Route scaffolding                                                          */
/* -------------------------------------------------------------------------- */

export const RequestsIdParamsSchema = Type.Object({
  id: Type.String(),
});
export type RequestsIdParams = Static<typeof RequestsIdParamsSchema>;
