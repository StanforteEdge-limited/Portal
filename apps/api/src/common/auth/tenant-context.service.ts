import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AsyncLocalStorage } from 'node:async_hooks';
import { TenantContext } from './tenant-context';

@Injectable()
export class TenantContextService {
  private readonly storage = new AsyncLocalStorage<TenantContext>();

  get(): TenantContext | undefined {
    return this.storage.getStore();
  }

  require(): TenantContext {
    const context = this.get();
    if (!context) throw new UnauthorizedException('Tenant context is required for this operation');
    return context;
  }

  enter(context: TenantContext): void {
    this.storage.enterWith(context);
  }
}
