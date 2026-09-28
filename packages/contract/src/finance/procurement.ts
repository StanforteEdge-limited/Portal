import { Type, type Static } from '@sinclair/typebox';

/** When the vendor is paid relative to delivery. */
const PaymentPatternSchema = Type.Union([
  Type.Literal('post_delivery'),
  Type.Literal('pre_payment'),
  Type.Literal('milestone'),
]);

/* -------------------------------------------------------------------------- */
/* Commands                                                                   */
/* -------------------------------------------------------------------------- */

export const ActionPoSchema = Type.Object({
  comment: Type.Optional(Type.String()),
});
export type ActionPo = Static<typeof ActionPoSchema>;

export const ActionPrSchema = Type.Object({
  comment: Type.Optional(Type.String()),
});
export type ActionPr = Static<typeof ActionPrSchema>;

/** `visibility` decides whether the vendor can see the attachment. */
export const AttachProcurementFileSchema = Type.Object({
  fileId: Type.String({ minLength: 1 }),
  label: Type.Optional(Type.String({ maxLength: 150 })),
  visibility: Type.Union([Type.Literal('internal'), Type.Literal('vendor')]),
});
export type AttachProcurementFile = Static<typeof AttachProcurementFileSchema>;

export const ConfirmGrnSchema = Type.Object({
  status: Type.Union([Type.Literal('confirmed'), Type.Literal('disputed')]),
  comment: Type.Optional(Type.String()),
});
export type ConfirmGrn = Static<typeof ConfirmGrnSchema>;

export const GrnItemSchema = Type.Object({
  description: Type.String({ minLength: 1 }),
  qtyOrdered: Type.Number(),
  qtyReceived: Type.Number(),
  condition: Type.String({ minLength: 1 }),
  notes: Type.Optional(Type.String()),
});
export type GrnItem = Static<typeof GrnItemSchema>;

/** Goods receipt note, recording what actually arrived against a purchase order. */
export const CreateGrnSchema = Type.Object({
  poId: Type.String({ minLength: 1 }),
  receivedDate: Type.String({ minLength: 1 }),
  items: Type.Array(GrnItemSchema),
  overallCondition: Type.Union([
    Type.Literal('satisfactory'),
    Type.Literal('partial'),
    Type.Literal('rejected'),
  ]),
  notes: Type.Optional(Type.String()),
});
export type CreateGrn = Static<typeof CreateGrnSchema>;

export const PoItemSchema = Type.Object({
  description: Type.String({ minLength: 1 }),
  qty: Type.Number(),
  unit: Type.String({ minLength: 1 }),
  unitCost: Type.Number(),
});
export type PoItem = Static<typeof PoItemSchema>;

/** Installment schedule for milestone-based payments. */
export const MilestoneSchema = Type.Object({
  seq: Type.Number(),
  description: Type.String({ minLength: 1 }),
  percentage: Type.Number(),
  amount: Type.Number(),
  trigger: Type.Union([
    Type.Literal('po_approved'),
    Type.Literal('grn_confirmed'),
    Type.Literal('manual_signoff'),
  ]),
});
export type Milestone = Static<typeof MilestoneSchema>;

/** camelCase keys mirror the legacy DTO. */
export const CreatePoSchema = Type.Object({
  caseId: Type.Optional(Type.String()),
  requisitionId: Type.Optional(Type.String()),
  vendorId: Type.String({ minLength: 1 }),
  items: Type.Array(PoItemSchema),
  paymentPattern: PaymentPatternSchema,
  milestones: Type.Optional(Type.Array(MilestoneSchema)),
  paymentTerms: Type.Optional(Type.String()),
  deliveryDate: Type.Optional(Type.String()),
  deliveryAddress: Type.Optional(Type.String()),
  /** Serialized approval workflow definition. */
  approvalFlowJson: Type.Unknown(),
});
export type CreatePo = Static<typeof CreatePoSchema>;

export const PrItemSchema = Type.Object({
  description: Type.String({ minLength: 1 }),
  qty: Type.Number(),
  unit: Type.String({ minLength: 1 }),
  estimatedUnitCost: Type.Number(),
});
export type PrItem = Static<typeof PrItemSchema>;

/** Purchase requisition — the request that precedes a purchase order. */
export const CreatePrSchema = Type.Object({
  title: Type.String({ minLength: 1 }),
  category: Type.Union([
    Type.Literal('goods'),
    Type.Literal('services'),
    Type.Literal('works'),
  ]),
  paymentPattern: PaymentPatternSchema,
  items: Type.Array(PrItemSchema),
  justification: Type.Optional(Type.String()),
  budgetLineId: Type.Optional(Type.String()),
  teamId: Type.Optional(Type.String()),
});
export type CreatePr = Static<typeof CreatePrSchema>;

export const CreateProcurementCaseSchema = Type.Object({
  note: Type.Optional(Type.String()),
});
export type CreateProcurementCase = Static<typeof CreateProcurementCaseSchema>;
