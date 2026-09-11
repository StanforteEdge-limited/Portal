import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { defer, Observable } from 'rxjs';
import { lastValueFrom } from 'rxjs';
import { TenantContextService } from '$common/auth/tenant-context.service';

@Injectable()
export class TenantContextInterceptor implements NestInterceptor {
  constructor(private readonly tenantContext: TenantContextService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const tenant = request?.tenant;
    if (!tenant || typeof tenant.tenantId !== 'bigint') {
      return next.handle();
    }
    return defer(() => this.tenantContext.run(tenant, () => lastValueFrom(next.handle())));
  }
}