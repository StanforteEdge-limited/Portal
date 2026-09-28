import { Type, type Static } from '@sinclair/typebox';
import { LongTextSchema } from '../common/primitives';

/** A single stage within a sales pipeline. */
export const PipelineStageSchema = Type.Object({
  name: Type.String(),
  /** Display order within the pipeline. */
  position: Type.Optional(Type.Integer({ minimum: 0 })),
  probability: Type.Optional(Type.Integer({ minimum: 0 })),
  color: Type.Optional(Type.String()),
  is_won: Type.Optional(Type.Boolean()),
  is_lost: Type.Optional(Type.Boolean()),
});
export type PipelineStage = Static<typeof PipelineStageSchema>;

export const UpsertCrmPipelineSchema = Type.Object({
  name: Type.String(),
  description: Type.Optional(LongTextSchema),
  /** Marks this pipeline as the tenant's default for new opportunities. */
  is_default: Type.Optional(Type.Boolean()),
  stages: Type.Optional(Type.Array(PipelineStageSchema)),
});
export type UpsertCrmPipeline = Static<typeof UpsertCrmPipelineSchema>;

/** Wholesale replacement of a pipeline's stage list. */
export const ReplaceCrmPipelineStagesSchema = Type.Object({
  stages: Type.Array(PipelineStageSchema),
});
export type ReplaceCrmPipelineStages = Static<typeof ReplaceCrmPipelineStagesSchema>;
