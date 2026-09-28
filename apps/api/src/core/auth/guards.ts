import type { FastifyReply, FastifyRequest } from 'fastify';
import type { Container } from '$app/bootstrap/container';
import { JwtService } from './jwt.service';
import { ForbiddenException, UnauthorizedException } from '$core/errors';
import type { TenantContext } from './tenant-context';
import { AUTH_ACCESS_COOKIE, parseCookieHeader } from './cookies';

export interface AuthenticatedUser {
  id: string;
  email: string;
  tenantId: string;
  tenantMembershipId: string;
  isTenantOwner?: boolean;
  permissions?: string[];
  roles?: string[];
  [key: string]: unknown;
}

export function extractAccessToken(request: FastifyRequest): string | null {
  const cookieValue = parseCookieHeader(request.headers.cookie)[AUTH_ACCESS_COOKIE];
  if (cookieValue) return String(cookieValue);
  const header = request.headers.authorization;
  if (header?.startsWith('Bearer ')) return header.slice(7).trim();
  return null;
}

/** Verifies the bearer/cookie token and publishes request tenant context. */
export async function authenticate(request: FastifyRequest): Promise<AuthenticatedUser> {
  const { container }: { container: Container } = request.server;
  const token = extractAccessToken(request);
  if (!token) throw new UnauthorizedException();

  let payload: unknown;
  try {
    payload = container.jwt.verify(token);
  } catch {
    throw new UnauthorizedException();
  }

  const user = (await container.auth.validateJwtPayload(payload)) as AuthenticatedUser | null;
  if (!user) throw new UnauthorizedException();
  if (!user.id || !user.tenantId || !user.tenantMembershipId) {
    throw new UnauthorizedException('Tenant context is required');
  }

  const tenant: TenantContext = {
    tenantId: BigInt(user.tenantId),
    profileId: BigInt(user.id),
    membershipId: BigInt(user.tenantMembershipId),
    isOwner: user.isTenantOwner === true,
  };

  request.user = user;
  request.tenant = tenant;
  container.tenantContext.enter(tenant);
  return user;
}

export function currentTenant(request: FastifyRequest): TenantContext {
  const user = request.user as AuthenticatedUser | undefined;
  const tenant = request.tenant;
  if (!tenant && user?.tenantId && user.tenantMembershipId && user.id) {
    return {
      tenantId: BigInt(user.tenantId),
      profileId: BigInt(user.id),
      membershipId: BigInt(user.tenantMembershipId),
      isOwner: user.isTenantOwner === true,
    };
  }
  if (!tenant) throw new UnauthorizedException('Tenant context is missing');
  return tenant;
}

export const requireAuth = async (request: FastifyRequest): Promise<void> => {
  await authenticate(request);
};

export type GuardHook = (request: FastifyRequest, reply: FastifyReply) => Promise<void>;

/** Builds a mutable `preHandler` list; Fastify rejects `readonly` tuples. */
export function composeGuards(...hooks: GuardHook[]): GuardHook[] {
  return hooks;
}

/** Builds a permission preHandler for authenticated routes. */
export function requirePermissions(...permissions: string[]) {
  return async (request: FastifyRequest, _reply: FastifyReply): Promise<void> => {
    const user = (request.user as AuthenticatedUser | undefined) ?? (await authenticate(request));
    if (!permissions.length) return;
    const granted = user?.permissions ?? [];
    if (granted.includes('*')) return;
    if (!permissions.some((permission) => granted.includes(permission))) {
      throw new ForbiddenException('Insufficient permissions');
    }
  };
}

/** Builds a vendor-portal audience scoped token preHandler. */
export function requireVendorJwt() {
  return async (request: FastifyRequest): Promise<void> => {
    const header = request.headers.authorization;
    if (!header?.startsWith('Bearer ')) throw new UnauthorizedException();
    let payload: any;
    try {
      payload = request.server.container.jwt.verify(header.slice(7));
    } catch {
      throw new UnauthorizedException();
    }
    if (payload.aud !== 'vendor-portal') throw new UnauthorizedException('Invalid token audience');
    request.vendor = payload;
  };
}
