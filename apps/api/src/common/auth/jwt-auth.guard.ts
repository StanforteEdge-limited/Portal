import { ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { TenantContextService } from './tenant-context.service';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly tenantContext: TenantContextService) {
    super();
  }

  handleRequest<TUser>(error: unknown, user: TUser, _info: unknown, context: ExecutionContext): TUser {
    if (error || !user) throw error || new UnauthorizedException();

    const authenticatedUser = user as TUser & {
      id?: string;
      tenantId?: string;
      tenantMembershipId?: string;
      isTenantOwner?: boolean;
    };
    if (!authenticatedUser.id || !authenticatedUser.tenantId || !authenticatedUser.tenantMembershipId) {
      throw new UnauthorizedException('Tenant context is required');
    }

    const tenant = {
      tenantId: BigInt(authenticatedUser.tenantId),
      profileId: BigInt(authenticatedUser.id),
      membershipId: BigInt(authenticatedUser.tenantMembershipId),
      isOwner: authenticatedUser.isTenantOwner === true,
    };
    const request = context.switchToHttp().getRequest();
    request.tenant = tenant;
    this.tenantContext.enter(tenant);
    return user;
  }
}
