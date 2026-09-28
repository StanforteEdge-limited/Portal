import { Type, type Static } from '@sinclair/typebox';
import { MetadataSchema } from '../common/refs';

export const OnboardingActionSchema = Type.Union([
  Type.Literal('complete_step'),
  Type.Literal('save_profile'),
  Type.Literal('save_contacts'),
]);
export type OnboardingAction = Static<typeof OnboardingActionSchema>;

/**
 * Single entry point for the onboarding wizard. `step_key` is required in
 * practice for `complete_step`; the service rejects the combination rather
 * than the schema, so the shape stays a flat union of optionals.
 */
export const UpdateOnboardingSchema = Type.Object({
  action: OnboardingActionSchema,
  step_key: Type.Optional(Type.String()),
  payload: Type.Optional(MetadataSchema),
});
export type UpdateOnboarding = Static<typeof UpdateOnboardingSchema>;

/** Submits answers for a single form attached to the onboarding flow. */
export const SubmitOnboardingFormSchema = Type.Object({
  form_id: Type.String(),
  payload: Type.Optional(MetadataSchema),
});
export type SubmitOnboardingForm = Static<typeof SubmitOnboardingFormSchema>;

export const SaveEmployeeContactsSchema = Type.Object({
  contacts: Type.Array(MetadataSchema),
});
export type SaveEmployeeContacts = Static<typeof SaveEmployeeContactsSchema>;

/* -------------------------------------------------------------------------- */
/* Route scaffolding                                                          */
/* -------------------------------------------------------------------------- */

export const onboardingIdParamsSchema = Type.Object({
  id: Type.String(),
});
export type onboardingIdParams = Static<typeof onboardingIdParamsSchema>;
