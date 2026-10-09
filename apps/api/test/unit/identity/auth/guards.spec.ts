import { describe, expect, it, vi } from 'vitest';
import { extractAccessToken, requirePermissions } from '$core/auth/guards';
import { AUTH_ACCESS_COOKIE, AUTH_REFRESH_COOKIE } from '$core/auth/cookies';
import { ForbiddenException, UnauthorizedException } from '$core/errors';

function request(headers: Record<string, string>) {
  return { headers } as any;
}

describe('extractAccessToken', () => {
  it('returns null when neither cookie nor header is present', () => {
    expect(extractAccessToken(request({}))).toBeNull();
  });

  it('reads the access token from the cookie', () => {
    const req = request({ cookie: `${AUTH_ACCESS_COOKIE}=cookie-token` });

    expect(extractAccessToken(req)).toBe('cookie-token');
  });

  it('reads the access token from a bearer header', () => {
    expect(extractAccessToken(request({ authorization: 'Bearer header-token' }))).toBe('header-token');
  });

  it('prefers the cookie over the header', () => {
    const req = request({
      cookie: `${AUTH_ACCESS_COOKIE}=cookie-token`,
      authorization: 'Bearer header-token',
    });

    expect(extractAccessToken(req)).toBe('cookie-token');
  });

  it('ignores the refresh cookie', () => {
    expect(extractAccessToken(request({ cookie: `${AUTH_REFRESH_COOKIE}=refresh-token` }))).toBeNull();
  });

  it('ignores an authorization header that is not a bearer token', () => {
    expect(extractAccessToken(request({ authorization: 'Basic dXNlcjpwYXNz' }))).toBeNull();
  });
});

describe('requirePermissions', () => {
  it('allows the request when the user holds the permission', async () => {
    const guard = requirePermissions('users.manage');
    const req = { user: { permissions: ['users.manage'] } } as any;

    await expect(guard(req, {} as any)).resolves.toBeUndefined();
  });

  it('allows the request for any one of several required permissions', async () => {
    const guard = requirePermissions('roles.manage', 'users.manage');
    const req = { user: { permissions: ['users.manage'] } } as any;

    await expect(guard(req, {} as any)).resolves.toBeUndefined();
  });

  it('allows a wildcard permission', async () => {
    const guard = requirePermissions('roles.manage');
    const req = { user: { permissions: ['*'] } } as any;

    await expect(guard(req, {} as any)).resolves.toBeUndefined();
  });

  it('throws Forbidden when the permission is missing', async () => {
    const guard = requirePermissions('roles.manage');
    const req = { user: { permissions: ['users.manage'] } } as any;

    await expect(guard(req, {} as any)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('throws Forbidden when the user has no permissions at all', async () => {
    const guard = requirePermissions('users.manage');

    await expect(guard({ user: {} } as any, {} as any)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('treats a guard built with no permissions as an authentication-only guard', async () => {
    const guard = requirePermissions();

    await expect(guard({ user: { permissions: [] } } as any, {} as any)).resolves.toBeUndefined();
  });

  it('falls back to authenticate() when the request has no user yet', async () => {
    const authenticate = vi.fn().mockResolvedValue({
      id: '1',
      email: 'user@example.com',
      tenantId: '7',
      tenantMembershipId: '99',
      isTenantOwner: false,
      permissions: ['users.manage'],
    });
    const container = {
      auth: { validateJwtPayload: vi.fn() },
      jwt: { verify: vi.fn().mockReturnValue({ sub: '1' }) },
      tenantContext: { enter: vi.fn() },
    } as any;
    container.auth.validateJwtPayload.mockResolvedValue({
      id: '1',
      email: 'user@example.com',
      tenantId: '7',
      tenantMembershipId: '99',
      isTenantOwner: false,
      permissions: ['users.manage'],
    });
    const req = { headers: { authorization: 'Bearer token' }, server: { container } } as any;

    await expect(requirePermissions('users.manage')(req, {} as any)).resolves.toBeUndefined();
    expect(container.jwt.verify).toHaveBeenCalledWith('token');
  });

  it('rejects an unauthenticated request', async () => {
    const req = { headers: {}, server: { container: { auth: {} } } } as any;

    await expect(requirePermissions('users.manage')(req, {} as any)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
