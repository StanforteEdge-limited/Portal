import { Injectable, NotFoundException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import type { Response } from 'express';
import { PrismaService } from '../../common/prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { RefreshDto } from './dto/refresh.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { sha256, randomToken } from '../../common/utils/crypto';
import { toBigInt } from '../../common/utils/ids';
import { AuthStatusResponseDto, LoginResponseDto } from './dto/auth-response.dto';
import { AcceptInviteDto } from './dto/accept-invite.dto';
import { MailService } from '../../common/mail/mail.service';
import {
  AUTH_ACCESS_COOKIE,
  AUTH_REFRESH_COOKIE,
  authCookieOptions,
  clearAuthCookieOptions,
  parseCookieHeader
} from '../../common/auth/cookies';

const ACCESS_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';
const REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '30d';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly mailService: MailService
  ) {}

  async login(dto: LoginDto, res?: Response): Promise<LoginResponseDto> {
    const email = dto.email.trim().toLowerCase();
    const organizationCode = dto.organization?.trim();
    const profile = await this.prisma.profile.findUnique({ where: { email } });
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
      const primaryOrg = await this.prisma.organization.findUnique({
        where: { id: primaryOrgId },
        select: { metadata: true }
      });
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
      
      await this.prisma.profile.update({
        where: { id: profile.id },
        data: { 
          failedLoginAttempts: attempts,
          lockoutUntil
        }
      });

      this.throwUnauthorized('Invalid credentials', 'AUTH_INVALID_CREDENTIALS');
    }

    const authContext = await this.buildAuthContext(profile.id);
    const tokens = await this.issueTokens(profile.id, authContext.permissions, authContext.roles);
    this.setAuthCookies(res, tokens.accessToken, tokens.refreshToken, tokens.expiresIn);

    await this.prisma.profile.update({
      where: { id: profile.id },
      data: { 
        lastLogin: new Date(),
        failedLoginAttempts: 0,
        lockoutUntil: null
      }
    });

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
        permissions: authContext.permissions
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
      const org = await this.prisma.organization.findFirst({
        where: { code: { equals: organizationCode, mode: 'insensitive' } },
        select: { id: true, name: true, code: true, metadata: true }
      });
      if (!org) return null;
      const membership = await this.prisma.profileOrganization.findFirst({
        where: { profileId, organizationId: org.id },
        select: { id: true }
      });
      if (!membership && primaryOrganizationId !== org.id) return null;
      return org;
    }

    const domain = email.split('@')[1]?.toLowerCase() ?? '';

    if (primaryOrganizationId) {
      const primary = await this.prisma.organization.findUnique({
        where: { id: primaryOrganizationId },
        select: { id: true, name: true, code: true, metadata: true }
      });
      if (primary) {
        const domains = this.extractAllowedLoginDomains(primary.metadata);
        if (domains.length === 0 || domains.includes(domain)) return primary;
      }
    }

    const memberships = await this.prisma.profileOrganization.findMany({
      where: { profileId },
      select: {
        organization: { select: { id: true, name: true, code: true, metadata: true } }
      }
    });
    const candidates = memberships
      .map((entry) => entry.organization)
      .filter((org) => {
        const domains = this.extractAllowedLoginDomains(org.metadata);
        return domains.length === 0 || domains.includes(domain);
      });

    if (candidates.length === 1) return candidates[0];
    return null;
  }

  async status(userId: string): Promise<AuthStatusResponseDto> {
    const profile = await this.prisma.profile.findUnique({
      where: { id: toBigInt(userId) },
      include: { onboardingProgress: true }
    });
    if (!profile) throw new NotFoundException('User not found');
    const authContext = await this.buildAuthContext(profile.id);
    return {
      id: profile.id.toString(),
      email: profile.email,
      first_name: profile.firstName ?? undefined,
      last_name: profile.lastName ?? undefined,
      status: profile.status,
      roles: authContext.roles,
      permissions: authContext.permissions,
      onboarding_status: profile.onboardingProgress?.status
    };
  }

  async logout(userId: string, res?: Response) {
    await this.prisma.token.deleteMany({ where: { profileId: toBigInt(userId), type: 'refresh' } });
    this.clearAuthCookies(res);
    return { success: true };
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    if (dto.confirm_password && dto.new_password !== dto.confirm_password) {
      throw new BadRequestException('Passwords do not match');
    }

    const profile = await this.prisma.profile.findUnique({ where: { id: toBigInt(userId) } });
    if (!profile) this.throwUnauthorized('Invalid credentials', 'AUTH_INVALID_CREDENTIALS');
    if (!profile.passwordHash) {
      this.throwUnauthorized('Password is not set. Use invite/reset flow first.', 'AUTH_PASSWORD_NOT_SET');
    }

    const ok = await bcrypt.compare(dto.current_password, profile.passwordHash);
    if (!ok) this.throwUnauthorized('Invalid credentials', 'AUTH_INVALID_CREDENTIALS');

    const newHash = await bcrypt.hash(dto.new_password, 12);
    await this.prisma.profile.update({
      where: { id: profile.id },
      data: { passwordHash: newHash }
    });

    await this.prisma.token.deleteMany({ where: { profileId: profile.id } });

    return { success: true };
  }

  async refresh(dto: RefreshDto, req?: any, res?: Response) {
    const cookieTokens = parseCookieHeader(req?.headers?.cookie);
    const refreshToken = dto.refresh_token || cookieTokens[AUTH_REFRESH_COOKIE];
    if (!refreshToken) this.throwUnauthorized('Invalid refresh token', 'AUTH_REFRESH_INVALID');

    const tokenHash = sha256(refreshToken);
    const tokenRow = await this.prisma.token.findFirst({
      where: { tokenHash, type: 'refresh' }
    });

    if (!tokenRow) this.throwUnauthorized('Invalid refresh token', 'AUTH_REFRESH_INVALID');
    if (tokenRow.expiresAt.getTime() < Date.now()) {
      await this.prisma.token.delete({ where: { id: tokenRow.id } });
      this.throwUnauthorized('Refresh token expired', 'AUTH_REFRESH_EXPIRED');
    }

    const authContext = await this.buildAuthContext(tokenRow.profileId);

    // Rotate refresh token
    await this.prisma.token.delete({ where: { id: tokenRow.id } });
    const tokens = await this.issueTokens(tokenRow.profileId, authContext.permissions, authContext.roles);
    this.setAuthCookies(res, tokens.accessToken, tokens.refreshToken, tokens.expiresIn);

    return {
      authenticated: true,
      expiresIn: tokens.expiresIn
    };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const email = dto.email.trim().toLowerCase();
    const profile = await this.prisma.profile.findUnique({ where: { email } });
    if (!profile) return { success: true };

    const resetToken = randomToken(32);
    const tokenHash = sha256(resetToken);
    const expiresAt = new Date(Date.now() + 1000 * 60 * 30);

    await this.prisma.$transaction([
      this.prisma.token.deleteMany({
        where: { profileId: profile.id, type: 'reset' }
      }),
      this.prisma.token.create({
        data: {
          id: randomToken(24),
          profileId: profile.id,
          type: 'reset',
          tokenHash,
          expiresAt
        }
      })
    ]);

    const appUrl = process.env.APP_BASE_URL || 'http://localhost:3000';
    const resetLink = `${appUrl}/reset-password?token=${encodeURIComponent(resetToken)}`;
    await this.mailService.send({
      to: profile.email,
      subject: 'Reset your StanforteEdge password',
      text: `Use this link to reset your password: ${resetLink}`,
      html: `<p>Use this link to reset your password:</p><p><a href=\"${resetLink}\">${resetLink}</a></p>`,
      threadKey: `auth-reset-${profile.id.toString()}`,
      userId: profile.id
    });
    return { success: true };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const tokenHash = sha256(dto.token);
    const tokenRow = await this.prisma.token.findFirst({
      where: { tokenHash, type: 'reset' }
    });

    if (!tokenRow) this.throwUnauthorized('Invalid reset token', 'AUTH_RESET_TOKEN_INVALID');
    if (tokenRow.expiresAt.getTime() < Date.now()) {
      await this.prisma.token.delete({ where: { id: tokenRow.id } });
      this.throwUnauthorized('Reset token expired', 'AUTH_RESET_TOKEN_EXPIRED');
    }

    const newHash = await bcrypt.hash(dto.new_password, 12);

    await this.prisma.$transaction([
      this.prisma.profile.update({
        where: { id: tokenRow.profileId },
        data: { passwordHash: newHash }
      }),
      this.prisma.token.deleteMany({ where: { profileId: tokenRow.profileId } })
    ]);

    return { success: true };
  }

  async acceptInvite(dto: AcceptInviteDto) {
    if (dto.confirm_password && dto.new_password !== dto.confirm_password) {
      throw new BadRequestException('Passwords do not match');
    }

    const tokenHash = sha256(dto.token);
    const tokenRow = await this.prisma.token.findFirst({
      where: { tokenHash, type: 'invite' }
    });

    if (!tokenRow) this.throwUnauthorized('Invalid invite token', 'AUTH_INVITE_TOKEN_INVALID');
    if (tokenRow.expiresAt.getTime() < Date.now()) {
      await this.prisma.token.delete({ where: { id: tokenRow.id } });
      this.throwUnauthorized('Invite token expired', 'AUTH_INVITE_TOKEN_EXPIRED');
    }

    const passwordHash = await bcrypt.hash(dto.new_password, 12);
    await this.prisma.$transaction([
      this.prisma.profile.update({
        where: { id: tokenRow.profileId },
        data: { passwordHash, status: 'active' }
      }),
      this.prisma.onboardingProgress.upsert({
        where: { userId: tokenRow.profileId },
        update: { status: 'accepted', currentStep: 'profile' },
        create: { userId: tokenRow.profileId, status: 'accepted', currentStep: 'profile' }
      }),
      this.prisma.token.deleteMany({
        where: {
          profileId: tokenRow.profileId,
          type: { in: ['invite'] }
        }
      })
    ]);

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

      const profile = await this.prisma.profile.findUnique({ where: { email } });
      if (!profile) return `${appUrl}/login?error=no_account`;

      if (profile.lockoutUntil && profile.lockoutUntil > new Date()) {
        return `${appUrl}/login?error=account_locked`;
      }
      if (profile.status !== 'active') return `${appUrl}/login?error=account_inactive`;

      const authContext = await this.buildAuthContext(profile.id);
      const issued = await this.issueTokens(profile.id, authContext.permissions, authContext.roles);
      this.setAuthCookies(res, issued.accessToken, issued.refreshToken, issued.expiresIn);

      await this.prisma.profile.update({
        where: { id: profile.id },
        data: { lastLogin: new Date(), failedLoginAttempts: 0, lockoutUntil: null },
      });

      return `${appUrl}/`;
    } catch {
      return `${appUrl}/login?error=google_failed`;
    }
  }

  async validateJwtPayload(payload: any) {
    const profileId = payload?.sub ? toBigInt(payload.sub) : null;
    if (!profileId) return null;

    const profile = await this.prisma.profile.findUnique({ where: { id: profileId } });
    if (!profile || profile.status !== 'active') return null;

    // Always resolve fresh roles/permissions from DB so RBAC changes apply immediately
    // without forcing users to re-login and re-issue tokens.
    const roles = await this.getUserRoles(profileId);
    const permissions = await this.getUserPermissions(profileId, roles);

    return {
      id: profile.id.toString(),
      email: profile.email,
      first_name: profile.firstName ?? undefined,
      last_name: profile.lastName ?? undefined,
      permissions,
      roles
    };
  }

  private async issueTokens(profileId: bigint, permissions: string[], roles: string[]) {
    const accessPayload = {
      sub: profileId.toString(),
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

    await this.prisma.token.create({
      data: {
        id: randomToken(24),
        profileId,
        type: 'refresh',
        tokenHash,
        expiresAt
      }
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

  private async buildAuthContext(profileId: bigint) {
    const roles = await this.getUserRoles(profileId);
    const permissions = await this.getUserPermissions(profileId, roles);
    return { roles, permissions };
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

  private async getUserRoles(profileId: bigint): Promise<string[]> {
    const roles = await this.prisma.userRole.findMany({
      where: { profileId },
      include: { role: true }
    });
    return roles.map((r) => r.role.slug);
  }

  private async getUserPermissions(profileId: bigint, roles?: string[]): Promise<string[]> {
    const profile = await this.prisma.profile.findUnique({
      where: { id: profileId },
      select: { type: true }
    });

    const roleSlugs = roles ?? (await this.getUserRoles(profileId));
    if (roleSlugs.includes('administrator') || roleSlugs.includes('admin')) return ['*'];

    const roleIds = await this.prisma.role.findMany({
      where: { slug: { in: roleSlugs } },
      select: { id: true }
    });

    if (roleIds.length === 0) return [];

    const perms = await this.prisma.rolePermission.findMany({
      where: { roleId: { in: roleIds.map((r) => r.id) } },
      include: { permission: true }
    });

    const slugs = perms.map((p) => p.permission.slug);
    if (profile && ['staff', 'employee'].includes(String(profile.type || '').toLowerCase())) {
      slugs.push('attendance.clock', 'attendance.view_self');
    }
    return Array.from(new Set(slugs));
  }

}
