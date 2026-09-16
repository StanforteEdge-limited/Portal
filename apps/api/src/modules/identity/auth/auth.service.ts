import { Injectable, NotFoundException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import type { Response } from 'express';
import { and, asc, eq, ilike, inArray, isNull, or } from 'drizzle-orm';
import { DbService } from '$common/db/db.service';
import { LoginDto } from '$modules/identity/auth/dto/login.dto';
import { ChangePasswordDto } from '$modules/identity/auth/dto/change-password.dto';
import { RefreshDto } from '$modules/identity/auth/dto/refresh.dto';
import { ForgotPasswordDto } from '$modules/identity/auth/dto/forgot-password.dto';
import { ResetPasswordDto } from '$modules/identity/auth/dto/reset-password.dto';
import { sha256, randomToken } from '$common/utils/crypto';
import { toBigInt } from '$common/utils/ids';
import { AuthStatusResponseDto, LoginResponseDto } from '$modules/identity/auth/dto/auth-response.dto';
import { AcceptInviteDto } from '$modules/identity/auth/dto/accept-invite.dto';
import { MailService } from '$common/mail/mail.service';
import { MailQueueService } from '$common/mail/mail-queue.service';
import {
  AUTH_ACCESS_COOKIE,
  AUTH_REFRESH_COOKIE,
  authCookieOptions,
  clearAuthCookieOptions,
  parseCookieHeader
} from '$common/auth/cookies';
import { profile as profileTable } from '$modules/identity/users/model';
import { organization as organizationTable, profileOrganization as profileOrganizationTable } from '$modules/directory/organizations/model';
import { tenant as tenantTable, tenantMembership as tenantMembershipTable, tenantOrganization as tenantOrganizationTable } from '$modules/tenancy/model';
import { token as tokenTable } from '$modules/identity/auth/model';
import { onboardingProgress as onboardingProgressTable } from '$modules/hr/hr/model';
import { role as roleTable, permission as permissionTable, rolePermission as rolePermissionTable, userRole as userRoleTable } from '$modules/identity/rbac/model';

const ACCESS_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';
const REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '30d';

interface RbacStateCacheEntry {
  tenantId: bigint;
  membershipId: bigint;
  isOwner: boolean;
  name: string;
  slug: string;
  roles: string[];
  permissions: string[];
  expiresAt: number;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly db: DbService,
    private readonly jwt: JwtService,
    private readonly mailService: MailService,
    private readonly mailQueue: MailQueueService
  ) {}

  async login(dto: LoginDto, res?: Response): Promise<LoginResponseDto> {
    const email = dto.email.trim().toLowerCase();
    const organizationCode = dto.organization?.trim();
    const [profile] = await this.db.client
      .select()
      .from(profileTable)
      .where(eq(profileTable.email, email))
      .limit(1);
    if (!profile) this.throwUnauthorized('Invalid credentials', 'AUTH_INVALID_CREDENTIALS');

    // SECURITY: Account Lockout Check
    if (profile.lockoutUntil && profile.lockoutUntil > new Date()) {
      const mins = Math.ceil((profile.lockoutUntil.getTime() - Date.now()) / 60000);
      this.throwUnauthorized(`Account is temporarily locked. Try again in ${mins} minutes.`, 'AUTH_ACCOUNT_LOCKED');
    }

    if (profile.status !== 'active') {
      this.throwUnauthorized('Account is inactive. Contact administrator.', 'AUTH_ACCOUNT_INACTIVE');
    }
    if (!profile.passwordHash) {
      this.throwUnauthorized('Password is not set. Use invite/reset flow first.', 'AUTH_PASSWORD_NOT_SET');
    }

    const organization = await this.resolveLoginOrganization(profile.id, profile.primaryOrganizationId, email, organizationCode);
    if (!organization) {
      this.throwUnauthorized(
        'Organization could not be resolved for this account.',
        'AUTH_ORGANIZATION_RESOLUTION_FAILED'
      );
    }

    const primaryOrgId = profile.primaryOrganizationId;
    if (primaryOrgId) {
      const [primaryOrg] = await this.db.client
        .select({ metadata: organizationTable.metadata })
        .from(organizationTable)
        .where(eq(organizationTable.id, primaryOrgId))
        .limit(1);
      const domains = this.extractAllowedLoginDomains(primaryOrg?.metadata);
      if (domains.length > 0) {
        const domain = email.split('@')[1]?.toLowerCase() ?? '';
        if (!domains.includes(domain)) {
          this.throwUnauthorized(
            'Primary login email must match organization domain policy',
            'AUTH_EMAIL_DOMAIN_RESTRICTED'
          );
        }
      }
    }

    const ok = await bcrypt.compare(dto.password, profile.passwordHash);
    if (!ok) {
      // SECURITY: Increment failed attempts
      const attempts = profile.failedLoginAttempts + 1;
      const lockoutUntil = attempts >= 3 ? new Date(Date.now() + 15 * 60 * 1000) : null;
      
      await this.db.client
        .update(profileTable)
        .set({
          failedLoginAttempts: attempts,
          lockoutUntil
        })
        .where(eq(profileTable.id, profile.id));

      this.throwUnauthorized('Invalid credentials', 'AUTH_INVALID_CREDENTIALS');
    }

    const tenantContext = await this.resolveTenantContext(profile.id, organization.id);
    if (!tenantContext) this.throwUnauthorized('Tenant membership is required', 'AUTH_TENANT_REQUIRED');
    const authContext = await this.buildAuthContext(profile.id, tenantContext.tenantId);
    const tokens = await this.issueTokens(profile.id, tenantContext.tenantId, authContext.permissions, authContext.roles);
    this.setAuthCookies(res, tokens.accessToken, tokens.refreshToken, tokens.expiresIn);

    await this.db.client
      .update(profileTable)
      .set({
        lastLogin: new Date(),
        failedLoginAttempts: 0,
        lockoutUntil: null
      })
      .where(eq(profileTable.id, profile.id));

    return {
      user: {
        id: profile.id.toString(),
        email: profile.email,
        first_name: profile.firstName ?? undefined,
        last_name: profile.lastName ?? undefined,
        organization: {
          id: organization.id.toString(),
          name: organization.name,
          code: organization.code
        },
        roles: authContext.roles,
        permissions: authContext.permissions,
        tenant: {
          id: tenantContext.tenantId.toString(),
          name: tenantContext.name,
          slug: tenantContext.slug
        }
      }
      // SECURITY: Tokens are now ONLY in httpOnly cookies.
      // We no longer return them in the JSON body.
    };
  }

  private extractAllowedLoginDomains(metadata: unknown): string[] {
    if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return [];
    const value = (metadata as Record<string, unknown>).login_email_domains;
    if (!Array.isArray(value)) return [];
    return value
      .map((entry) => String(entry || '').trim().toLowerCase())
      .filter(Boolean);
  }

  private async resolveLoginOrganization(
    profileId: bigint,
    primaryOrganizationId: bigint | null,
    email: string,
    organizationCode?: string
  ): Promise<{ id: bigint; name: string; code: string; metadata: unknown } | null> {
    if (organizationCode) {
      const [org] = await this.db.client
        .select({
          id: organizationTable.id,
          name: organizationTable.name,
          code: organizationTable.code,
          metadata: organizationTable.metadata
        })
        .from(organizationTable)
        .where(ilike(organizationTable.code, organizationCode))
        .limit(1);
      if (!org) return null;
      const [membership] = await this.db.client
        .select({ id: profileOrganizationTable.id })
        .from(profileOrganizationTable)
        .where(
          and(eq(profileOrganizationTable.profileId, profileId), eq(profileOrganizationTable.organizationId, org.id))
        )
        .limit(1);
      if (!membership && primaryOrganizationId !== org.id) return null;
      return org;
    }

    const domain = email.split('@')[1]?.toLowerCase() ?? '';

    if (primaryOrganizationId) {
      const [primary] = await this.db.client
        .select({
          id: organizationTable.id,
          name: organizationTable.name,
          code: organizationTable.code,
          metadata: organizationTable.metadata
        })
        .from(organizationTable)
        .where(eq(organizationTable.id, primaryOrganizationId))
        .limit(1);
      if (primary) {
        const domains = this.extractAllowedLoginDomains(primary.metadata);
        if (domains.length === 0 || domains.includes(domain)) return primary;
      }
    }

    const memberships = await this.db.client
      .select({
        org: {
          id: organizationTable.id,
          name: organizationTable.name,
          code: organizationTable.code,
          metadata: organizationTable.metadata
        }
      })
      .from(profileOrganizationTable)
      .leftJoin(organizationTable, eq(profileOrganizationTable.organizationId, organizationTable.id))
      .where(eq(profileOrganizationTable.profileId, profileId));
    const candidates = memberships
      .map((entry) => entry.org)
      .filter((org) => {
        const domains = this.extractAllowedLoginDomains(org.metadata);
        return domains.length === 0 || domains.includes(domain);
      });

    if (candidates.length === 1) return candidates[0];
    return null;
  }

  async status(userId: string): Promise<AuthStatusResponseDto> {
    const [profile] = await this.db.client
      .select()
      .from(profileTable)
      .where(eq(profileTable.id, toBigInt(userId)))
      .limit(1);
    if (!profile) throw new NotFoundException('User not found');
    const [onboarding] = await this.db.client
      .select()
      .from(onboardingProgressTable)
      .where(eq(onboardingProgressTable.userId, profile.id))
      .limit(1);
    const tenantContext = await this.resolveTenantContext(profile.id, profile.primaryOrganizationId);
    const authContext = await this.buildAuthContext(profile.id, tenantContext?.tenantId);
    return {
      id: profile.id.toString(),
      email: profile.email,
      first_name: profile.firstName ?? undefined,
      last_name: profile.lastName ?? undefined,
      status: profile.status,
      roles: authContext.roles,
      permissions: authContext.permissions,
      onboarding_status: onboarding?.status,
      tenant: tenantContext
        ? { id: tenantContext.tenantId.toString(), name: tenantContext.name, slug: tenantContext.slug }
        : undefined
    };
  }

  async listTenants(userId: string) {
    const memberships = await this.db.client
      .select()
      .from(tenantMembershipTable)
      .where(and(eq(tenantMembershipTable.profileId, toBigInt(userId)), eq(tenantMembershipTable.status, 'active')))
      .orderBy(asc(tenantMembershipTable.joinedAt));
    const tenants = await Promise.all(
      memberships.map(async (membership) => {
        const [tenant] = await this.db.client
          .select()
          .from(tenantTable)
          .where(eq(tenantTable.id, membership.tenantId))
          .limit(1);
        if (!tenant || tenant.status !== 'active') return null;
        return {
          id: tenant.id.toString(),
          name: tenant.name,
          slug: tenant.slug,
          plan: tenant.plan,
          isOwner: membership.isOwner,
          joinedAt: membership.joinedAt,
        };
      }),
    );
    return tenants.filter((tenant): tenant is NonNullable<typeof tenant> => tenant !== null);
  }

  async switchTenant(userId: string, tenantIdValue: string, res?: Response) {
    const profileId = toBigInt(userId);
    const tenantId = toBigInt(tenantIdValue);
    const tenantContext = await this.resolveTenantContext(profileId, undefined, tenantId);
    if (!tenantContext) this.throwUnauthorized('Tenant membership is required', 'AUTH_TENANT_REQUIRED');

    const authContext = await this.buildAuthContext(profileId, tenantContext.tenantId);
    const tokens = await this.issueTokens(profileId, tenantContext.tenantId, authContext.permissions, authContext.roles);
    this.setAuthCookies(res, tokens.accessToken, tokens.refreshToken, tokens.expiresIn);

    return {
      tenant: {
        id: tenantContext.tenantId.toString(),
        name: tenantContext.name,
        slug: tenantContext.slug,
        isOwner: tenantContext.isOwner,
      },
    };
  }

  async logout(userId: string, res?: Response) {
    await this.db.client
      .delete(tokenTable)
      .where(and(eq(tokenTable.profileId, toBigInt(userId)), eq(tokenTable.type, 'refresh')));
    this.clearAuthCookies(res);
    return { success: true };
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    if (dto.confirm_password && dto.new_password !== dto.confirm_password) {
      throw new BadRequestException('Passwords do not match');
    }

    const [profile] = await this.db.client
      .select()
      .from(profileTable)
      .where(eq(profileTable.id, toBigInt(userId)))
      .limit(1);
    if (!profile) this.throwUnauthorized('Invalid credentials', 'AUTH_INVALID_CREDENTIALS');
    if (!profile.passwordHash) {
      this.throwUnauthorized('Password is not set. Use invite/reset flow first.', 'AUTH_PASSWORD_NOT_SET');
    }

    const ok = await bcrypt.compare(dto.current_password, profile.passwordHash);
    if (!ok) this.throwUnauthorized('Invalid credentials', 'AUTH_INVALID_CREDENTIALS');

    const newHash = await bcrypt.hash(dto.new_password, 12);
    await this.db.client
      .update(profileTable)
      .set({ passwordHash: newHash })
      .where(eq(profileTable.id, profile.id));

    await this.db.client.delete(tokenTable).where(eq(tokenTable.profileId, profile.id));

    return { success: true };
  }

  async refresh(dto: RefreshDto, req?: any, res?: Response) {
    const cookieTokens = parseCookieHeader(req?.headers?.cookie);
    const refreshToken = dto.refresh_token || cookieTokens[AUTH_REFRESH_COOKIE];
    if (!refreshToken) this.throwUnauthorized('Invalid refresh token', 'AUTH_REFRESH_INVALID');

    const tokenHash = sha256(refreshToken);
    const [tokenRow] = await this.db.client
      .select()
      .from(tokenTable)
      .where(and(eq(tokenTable.tokenHash, tokenHash), eq(tokenTable.type, 'refresh')))
      .limit(1);

    if (!tokenRow) this.throwUnauthorized('Invalid refresh token', 'AUTH_REFRESH_INVALID');
    if (tokenRow.expiresAt.getTime() < Date.now()) {
      await this.db.client.delete(tokenTable).where(eq(tokenTable.id, tokenRow.id));
      this.throwUnauthorized('Refresh token expired', 'AUTH_REFRESH_EXPIRED');
    }

    const tenantContext = await this.resolveTenantContext(tokenRow.profileId, undefined, tokenRow.tenantId);
    if (!tenantContext) this.throwUnauthorized('Tenant membership is required', 'AUTH_TENANT_REQUIRED');
    const authContext = await this.buildAuthContext(tokenRow.profileId, tenantContext.tenantId);

    // Rotate refresh token
    await this.db.client.delete(tokenTable).where(eq(tokenTable.id, tokenRow.id));
    const tokens = await this.issueTokens(tokenRow.profileId, tenantContext.tenantId, authContext.permissions, authContext.roles);
    this.setAuthCookies(res, tokens.accessToken, tokens.refreshToken, tokens.expiresIn);

    return {
      authenticated: true,
      expiresIn: tokens.expiresIn
    };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const email = dto.email.trim().toLowerCase();
    const [profile] = await this.db.client
      .select()
      .from(profileTable)
      .where(eq(profileTable.email, email))
      .limit(1);
    if (!profile) return { success: true };

    const resetToken = randomToken(32);
    const tokenHash = sha256(resetToken);
    const expiresAt = new Date(Date.now() + 1000 * 60 * 30);

    await this.db.client.transaction(async (tx) => {
      await tx
        .delete(tokenTable)
        .where(and(eq(tokenTable.profileId, profile.id), eq(tokenTable.type, 'reset')));
      await tx.insert(tokenTable).values({
        id: randomToken(24),
        profileId: profile.id,
        type: 'reset',
        tokenHash,
        expiresAt
      });
    });

    const appUrl = process.env.APP_BASE_URL || 'http://localhost:3000';
    const resetLink = `${appUrl}/reset-password?token=${encodeURIComponent(resetToken)}`;
    const displayName = `${profile.firstName ?? ''} ${profile.lastName ?? ''}`.trim() || profile.email;
    await this.mailQueue.enqueue({
      to: profile.email,
      subject: 'Reset your StanforteEdge password',
      text: `Use this link to reset your password: ${resetLink}`,
      html: `<p>Use this link to reset your password:</p><p><a href=\"${resetLink}\">${resetLink}</a></p>`,
      template: 'reset_password',
      templateContext: {
        subject: 'Reset your StanforteEdge password',
        displayName,
        resetUrl: resetLink
      },
      threadKey: `auth-reset-${profile.id.toString()}`,
      userId: profile.id
    });
    return { success: true };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const tokenHash = sha256(dto.token);
    const [tokenRow] = await this.db.client
      .select()
      .from(tokenTable)
      .where(and(eq(tokenTable.tokenHash, tokenHash), eq(tokenTable.type, 'reset')))
      .limit(1);

    if (!tokenRow) this.throwUnauthorized('Invalid reset token', 'AUTH_RESET_TOKEN_INVALID');
    if (tokenRow.expiresAt.getTime() < Date.now()) {
      await this.db.client.delete(tokenTable).where(eq(tokenTable.id, tokenRow.id));
      this.throwUnauthorized('Reset token expired', 'AUTH_RESET_TOKEN_EXPIRED');
    }

    const newHash = await bcrypt.hash(dto.new_password, 12);

    await this.db.client.transaction(async (tx) => {
      await tx.update(profileTable).set({ passwordHash: newHash }).where(eq(profileTable.id, tokenRow.profileId));
      await tx.delete(tokenTable).where(eq(tokenTable.profileId, tokenRow.profileId));
    });

    return { success: true };
  }

  async acceptInvite(dto: AcceptInviteDto) {
    if (dto.confirm_password && dto.new_password !== dto.confirm_password) {
      throw new BadRequestException('Passwords do not match');
    }

    const tokenHash = sha256(dto.token);
    const [tokenRow] = await this.db.client
      .select()
      .from(tokenTable)
      .where(and(eq(tokenTable.tokenHash, tokenHash), eq(tokenTable.type, 'invite')))
      .limit(1);

    if (!tokenRow) this.throwUnauthorized('Invalid invite token', 'AUTH_INVITE_TOKEN_INVALID');
    if (tokenRow.expiresAt.getTime() < Date.now()) {
      await this.db.client.delete(tokenTable).where(eq(tokenTable.id, tokenRow.id));
      this.throwUnauthorized('Invite token expired', 'AUTH_INVITE_TOKEN_EXPIRED');
    }
    if (tokenRow.tenantId) {
      const [membership] = await this.db.client
        .select()
        .from(tenantMembershipTable)
        .where(
          and(
            eq(tenantMembershipTable.tenantId, tokenRow.tenantId),
            eq(tenantMembershipTable.profileId, tokenRow.profileId),
            eq(tenantMembershipTable.status, 'active')
          )
        )
        .limit(1);
      if (!membership) this.throwUnauthorized('Tenant invitation is no longer active', 'AUTH_INVITE_MEMBERSHIP_INVALID');
    }

    const passwordHash = await bcrypt.hash(dto.new_password, 12);
    await this.db.client.transaction(async (tx) => {
      await tx
        .update(profileTable)
        .set({ passwordHash, status: 'active' })
        .where(eq(profileTable.id, tokenRow.profileId));
      await tx
        .insert(onboardingProgressTable)
        .values({ userId: tokenRow.profileId, status: 'accepted', currentStep: 'profile' })
        .onConflictDoUpdate({
          target: onboardingProgressTable.userId,
          set: { status: 'accepted', currentStep: 'profile' }
        });
      await tx
        .delete(tokenTable)
        .where(and(eq(tokenTable.profileId, tokenRow.profileId), eq(tokenTable.type, 'invite')));
    });

    return { success: true };
  }

  async googleAuthUrl(): Promise<string> {
    const { google } = await import('googleapis');
    const client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_AUTH_REDIRECT_URI,
    );
    return client.generateAuthUrl({
      access_type: 'offline',
      scope: ['openid', 'email', 'profile'],
      prompt: 'select_account',
    });
  }

  async handleGoogleCallback(code: string, res?: Response): Promise<string> {
    const appUrl = process.env.APP_BASE_URL || 'http://localhost:5173';
    try {
      const { google } = await import('googleapis');
      const client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_AUTH_REDIRECT_URI,
      );
      const { tokens } = await client.getToken(code);
      if (!tokens.id_token) return `${appUrl}/login?error=google_failed`;

      const ticket = await client.verifyIdToken({
        idToken: tokens.id_token,
        audience: process.env.GOOGLE_CLIENT_ID!,
      });
      const payload = ticket.getPayload();
      const email = payload?.email?.trim().toLowerCase();
      if (!email) return `${appUrl}/login?error=google_no_email`;

      const [profile] = await this.db.client
        .select()
        .from(profileTable)
        .where(eq(profileTable.email, email))
        .limit(1);
      if (!profile) return `${appUrl}/login?error=no_account`;

      if (profile.lockoutUntil && profile.lockoutUntil > new Date()) {
        return `${appUrl}/login?error=account_locked`;
      }
      if (profile.status !== 'active') return `${appUrl}/login?error=account_inactive`;

      const tenantContext = await this.resolveTenantContext(profile.id, profile.primaryOrganizationId);
      if (!tenantContext) return `${appUrl}/login?error=tenant_context_missing`;
      const authContext = await this.buildAuthContext(profile.id, tenantContext.tenantId);
      const issued = await this.issueTokens(profile.id, tenantContext.tenantId, authContext.permissions, authContext.roles);
      this.setAuthCookies(res, issued.accessToken, issued.refreshToken, issued.expiresIn);

      await this.db.client
        .update(profileTable)
        .set({ lastLogin: new Date(), failedLoginAttempts: 0, lockoutUntil: null })
        .where(eq(profileTable.id, profile.id));

      return `${appUrl}/`;
    } catch {
      return `${appUrl}/login?error=google_failed`;
    }
  }

  async validateJwtPayload(payload: any) {
    const profileId = payload?.sub ? toBigInt(payload.sub) : null;
    if (!profileId) return null;

    const [profile] = await this.db.client
      .select()
      .from(profileTable)
      .where(eq(profileTable.id, profileId))
      .limit(1);
    if (!profile || profile.status !== 'active') return null;

    // Profile status stays fresh (1 query). Roles, permissions and the tenant
    // context are resolved once per short TTL instead of on every request: each
    // resolution is ~5 sequential DB round-trips, which made validation the
    // dominant DB load on authenticated traffic. RBAC changes now apply within
    // AUTH_ROLE_CACHE_TTL_MS (default 30s).
    const requestedTenantId = payload?.tenantId ? toBigInt(payload.tenantId) : null;
    if (!requestedTenantId) return null;
    const state = await this.getCachedRbacState(profileId, requestedTenantId);
    if (!state) return null;

    return {
      id: profile.id.toString(),
      email: profile.email,
      first_name: profile.firstName ?? undefined,
      last_name: profile.lastName ?? undefined,
      permissions: state.permissions,
      roles: state.roles,
      tenantId: state.tenantId.toString(),
      tenantMembershipId: state.membershipId.toString(),
      isTenantOwner: state.isOwner
    };
  }

  private readonly rbacStateCache = new Map<string, RbacStateCacheEntry>();

  private readonly maxRbacCacheEntries = Math.max(1000, Number(process.env.AUTH_ROLE_CACHE_MAX_ENTRIES || 100_000));

  private rbacCacheTtlMs(): number {
    return Math.max(1000, Number(process.env.AUTH_ROLE_CACHE_TTL_MS || 30_000));
  }

  private static rbacCacheKey(profileId: bigint, tenantId: bigint): string {
    return `${profileId.toString()}:${tenantId.toString()}`;
  }

  private getCachedRbacState(profileId: bigint, tenantId: bigint): Promise<RbacStateCacheEntry | null> {
    const key = AuthService.rbacCacheKey(profileId, tenantId);
    const now = Date.now();
    const cached = this.rbacStateCache.get(key);
    if (cached && cached.expiresAt > now) return Promise.resolve(cached);

    for (const [cachedKey, entry] of this.rbacStateCache) {
      if (entry.expiresAt <= now) this.rbacStateCache.delete(cachedKey);
    }

    return this.resolveRbacState(profileId, tenantId).then((entry) => {
      if (!entry) return null;
      if (this.rbacStateCache.size >= this.maxRbacCacheEntries) {
        const overflow = this.rbacStateCache.size - this.maxRbacCacheEntries + 1;
        const toEvict = Array.from(this.rbacStateCache.keys()).slice(0, Math.max(1, overflow));
        for (const evictKey of toEvict) this.rbacStateCache.delete(evictKey);
      }
      this.rbacStateCache.set(key, entry);
      return entry;
    });
  }

  private async resolveRbacState(profileId: bigint, tenantId: bigint): Promise<RbacStateCacheEntry | null> {
    const tenantContext = await this.resolveTenantContext(profileId, undefined, tenantId);
    if (!tenantContext) return null;
    const roles = await this.getUserRoles(profileId, tenantContext.tenantId);
    const permissions = await this.getUserPermissions(profileId, roles, tenantContext.tenantId);
    return {
      tenantId: tenantContext.tenantId,
      membershipId: tenantContext.membershipId,
      isOwner: tenantContext.isOwner,
      name: tenantContext.name,
      slug: tenantContext.slug,
      roles,
      permissions,
      expiresAt: Date.now() + this.rbacCacheTtlMs(),
    };
  }

  /** Drop cached roles/permissions for a profile (optionally restrained to a tenant), or clear all. */
  invalidateRbacState(profileId?: bigint, tenantId?: bigint): void {
    if (profileId === undefined) {
      this.rbacStateCache.clear();
      return;
    }
    for (const [key, entry] of this.rbacStateCache) {
      const [cachedProfileId] = key.split(':');
      if (cachedProfileId !== profileId.toString()) continue;
      if (tenantId !== undefined && entry.tenantId !== tenantId) continue;
      this.rbacStateCache.delete(key);
    }
  }

  /** Convenience used by RBAC mutations: any role/permission change clears cached permissions. */
  clearRbacStateCache(): void {
    this.rbacStateCache.clear();
  }

  private async issueTokens(profileId: bigint, tenantId: bigint, permissions: string[], roles: string[]) {
    const accessPayload = {
      sub: profileId.toString(),
      tenantId: tenantId.toString(),
      permissions,
      roles
    };

    const accessToken = await this.jwt.signAsync(accessPayload, {
      secret: process.env.JWT_SECRET || 'change-me',
      expiresIn: ACCESS_EXPIRES_IN
    });

    const refreshToken = randomToken(48);
    const tokenHash = sha256(refreshToken);
    const expiresAt = this.parseExpiresIn(REFRESH_EXPIRES_IN);

    await this.db.client.insert(tokenTable).values({
      id: randomToken(24),
      profileId,
      tenantId,
      type: 'refresh',
      tokenHash,
      expiresAt
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: ACCESS_EXPIRES_IN
    };
  }

  private parseExpiresIn(expires: string): Date {
    const match = expires.match(/(\d+)([smhd])/);
    if (!match) return new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);
    const value = Number(match[1]);
    const unit = match[2];
    const ms =
      unit === 's'
        ? value * 1000
        : unit === 'm'
        ? value * 1000 * 60
        : unit === 'h'
        ? value * 1000 * 60 * 60
        : value * 1000 * 60 * 60 * 24;
    return new Date(Date.now() + ms);
  }

  private throwUnauthorized(message: string, code: string): never {
    throw new UnauthorizedException({
      message,
      error: { code }
    });
  }

  private async buildAuthContext(profileId: bigint, tenantId?: bigint) {
    const roles = await this.getUserRoles(profileId, tenantId);
    const permissions = await this.getUserPermissions(profileId, roles, tenantId);
    return { roles, permissions };
  }

  private async resolveTenantContext(
    profileId: bigint,
    organizationId?: bigint | null,
    requestedTenantId?: bigint | null,
  ) {
    let tenantOrganization: { tenantId: bigint; organizationId: bigint } | null = null;
    if (organizationId != null) {
      const [row] = await this.db.client
        .select({ tenantId: tenantOrganizationTable.tenantId, organizationId: tenantOrganizationTable.organizationId })
        .from(tenantOrganizationTable)
        .where(eq(tenantOrganizationTable.organizationId, organizationId))
        .limit(1);
      tenantOrganization = row ?? null;
    } else if (requestedTenantId != null) {
      const [row] = await this.db.client
        .select({ tenantId: tenantOrganizationTable.tenantId, organizationId: tenantOrganizationTable.organizationId })
        .from(tenantOrganizationTable)
        .where(eq(tenantOrganizationTable.tenantId, requestedTenantId))
        .limit(1);
      tenantOrganization = row ?? null;
    }
    const tenantId = tenantOrganization?.tenantId ?? requestedTenantId;
    if (!tenantId) return null;

    const [membership] = await this.db.client
      .select()
      .from(tenantMembershipTable)
      .where(
        and(
          eq(tenantMembershipTable.tenantId, tenantId),
          eq(tenantMembershipTable.profileId, profileId),
          eq(tenantMembershipTable.status, 'active')
        )
      )
      .limit(1);
    if (!membership) return null;

    const [tenant] = await this.db.client
      .select()
      .from(tenantTable)
      .where(eq(tenantTable.id, tenantId))
      .limit(1);
    if (!tenant) return null;
    if (tenant.status !== 'active' && !membership.isOwner) return null;
    return {
      tenantId: tenant.id,
      membershipId: membership.id,
      isOwner: membership.isOwner,
      name: tenant.name,
      slug: tenant.slug,
    };
  }

  private parseExpiresInSeconds(expires: string): number {
    const match = expires.match(/^(\d+)([smhd])$/);
    if (!match) return 60 * 15;
    const value = Number(match[1]);
    const unit = match[2];
    return unit === 's'
      ? value
      : unit === 'm'
      ? value * 60
      : unit === 'h'
      ? value * 60 * 60
      : value * 60 * 60 * 24;
  }

  private setAuthCookies(res: Response | undefined, accessToken: string, refreshToken: string, expiresIn: string) {
    if (!res) return;
    const accessMaxAge = this.parseExpiresInSeconds(expiresIn);
    const refreshMaxAge = this.parseExpiresInSeconds(REFRESH_EXPIRES_IN);
    res.cookie(AUTH_ACCESS_COOKIE, accessToken, authCookieOptions(accessMaxAge));
    res.cookie(AUTH_REFRESH_COOKIE, refreshToken, authCookieOptions(refreshMaxAge));
  }

  private clearAuthCookies(res: Response | undefined) {
    if (!res) return;
    res.clearCookie(AUTH_ACCESS_COOKIE, clearAuthCookieOptions());
    res.clearCookie(AUTH_REFRESH_COOKIE, clearAuthCookieOptions());
  }

  private async getUserRoles(profileId: bigint, tenantId?: bigint): Promise<string[]> {
    const rows = await this.db.client
      .select({ userRole: userRoleTable, role: roleTable })
      .from(userRoleTable)
      .leftJoin(roleTable, eq(userRoleTable.roleId, roleTable.id))
      .where(and(eq(userRoleTable.profileId, profileId), tenantId ? eq(userRoleTable.tenantId, tenantId) : undefined));
    return rows.map((r) => r.role?.slug ?? '');
  }

  private async getUserPermissions(profileId: bigint, roles?: string[], tenantId?: bigint): Promise<string[]> {
    const [profile] = await this.db.client
      .select({ type: profileTable.type })
      .from(profileTable)
      .where(eq(profileTable.id, profileId))
      .limit(1);

    const roleSlugs = roles ?? (await this.getUserRoles(profileId, tenantId));
    if (roleSlugs.includes('administrator') || roleSlugs.includes('admin')) return ['*'];

    // Resolve roles by slug within the current tenant only (including the
    // global template, tenant_id IS NULL). Without this, a slug owned by
    // another tenant could grant its permissions to this request.
    const roleIds = await this.db.client
      .select({ id: roleTable.id })
      .from(roleTable)
      .where(and(inArray(roleTable.slug, roleSlugs), tenantId ? or(eq(roleTable.tenantId, tenantId), isNull(roleTable.tenantId)) : undefined));

    if (roleIds.length === 0) return [];

    const idList = roleIds.map((r) => r.id);
    const perms = idList.length
      ? await this.db.client
          .select({ permission: permissionTable })
          .from(rolePermissionTable)
          .leftJoin(permissionTable, eq(rolePermissionTable.permissionId, permissionTable.id))
          .where(and(inArray(rolePermissionTable.roleId, idList), tenantId ? or(eq(rolePermissionTable.tenantId, tenantId), isNull(rolePermissionTable.tenantId)) : undefined))
      : ([] as any[]);

    const slugs = perms.map((p) => p.permission?.slug ?? '');
    if (profile && ['staff', 'employee'].includes(String(profile.type || '').toLowerCase())) {
      slugs.push('attendance.clock', 'attendance.view_self');
    }
    return Array.from(new Set(slugs));
  }

}