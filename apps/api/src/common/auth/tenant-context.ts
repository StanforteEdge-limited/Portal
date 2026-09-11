import { createParamDecorator, ExecutionContext, UnauthorizedException } from '@nestjs/common';

export interface TenantContext {
  scope?: 'tenant';
  tenantId: bigint;
  profileId: bigint;
  membershipId: bigint;
  isOwner: boolean;
}

export interface SystemContext {
  scope: 'system';
  reason: string;
}

export const CurrentTenant = createParamDecorator(
  (_data: unknown, context: ExecutionContext): TenantContext => {
    const request = context.switchToHttp().getRequest();
    const user = request?.user;
    const tenant = request?.tenant as TenantContext | undefined;
    if (!tenant && user?.tenantId && user?.tenantMembershipId && user?.id) {
      return {
        tenantId: BigInt(user.tenantId),
        profileId: BigInt(user.id),
        membershipId: BigInt(user.tenantMembershipId),
        isOwner: user.isTenantOwner === true,
      };
    }
    if (!tenant) throw new UnauthorizedException('Tenant context is missing');
    return tenant;
  },
);
