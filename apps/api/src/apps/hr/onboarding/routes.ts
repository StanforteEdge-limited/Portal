import type { FastifyPluginAsync } from 'fastify';
import { SubmitOnboardingFormSchema, UpdateOnboardingSchema, type SubmitOnboardingForm, type UpdateOnboarding } from '@stanforte/contract';
import { composeGuards, currentTenant, requireAuth, requirePermissions } from '$core/auth/guards';
import { requestBody } from '$core/routes';
import { onboardingPermissions } from './permissions';

/**
 * Mounted at `/v1/onboarding`.
 *
 * The wizard is strictly self-service: `getMyOnboarding` and
 * `updateMyOnboarding` both take the caller's profile id, so the module never
 * exposes an HR view of somebody else's onboarding. HR review happens through
 * the employee lifecycle actions in the employee module.
 *
 * `submitForm` is a module-private helper folded into
 * `updateMyOnboarding` behind the `save_profile` / `save_contacts` actions, so
 * there is no separate route for it.
 */
export const OnboardingRoutes: FastifyPluginAsync = async (fastify) => {
  const onboarding = () => fastify.container.onboarding;
  const self = composeGuards(requireAuth, requirePermissions(onboardingPermissions.read));
  const write = composeGuards(requireAuth, requirePermissions(onboardingPermissions.write));
  const inTenant = (request: any, operation: () => Promise<unknown> | unknown) =>
    fastify.container.tenantContext.run(currentTenant(request), operation);

  fastify.get('/', { preHandler: self }, async (request) => inTenant(request, () => onboarding().getMyOnboarding(request.user?.id as string)));

  fastify.post('/', { preHandler: write, schema: { body: UpdateOnboardingSchema } }, async (request) =>
    inTenant(request, () => onboarding().updateMyOnboarding(request.user?.id as string, requestBody<UpdateOnboarding>(request))),
  );

  fastify.post('/forms', { preHandler: write, schema: { body: SubmitOnboardingFormSchema } }, async (request) =>
    inTenant(request, () => onboarding().submitForm(request.user?.id as string, requestBody<SubmitOnboardingForm>(request))),
  );
};
