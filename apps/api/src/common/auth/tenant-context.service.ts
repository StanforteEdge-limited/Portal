import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AsyncLocalStorage } from 'node:async_hooks';
import { SystemContext, TenantContext } from './tenant-context';

@Injectable()
export class TenantContextService {
  private readonly storage = new AsyncLocalStorage<TenantContext | SystemContext>();

  get(): TenantContext | SystemContext | undefined {
    return this.storage.getStore();
  }

  require(): TenantContext {
    const context = this.get();
    if (!context || context.scope === 'system') {
      throw new UnauthorizedException('Tenant context is required for this operation');
    }
    return context;
  }

  enter(context: TenantContext): void {
    this.storage.enterWith(context);
  }

  isSystem(): boolean {
    return this.get()?.scope === 'system';
  }

  /**
   * Runs an explicitly authorized internal job outside tenant scope.
   * Callers must pass a non-empty audit reason; HTTP request handlers should
   * never use this method.
   */
  async runSystem<T>(reason: string, operation: () => T | Promise<T>): Promise<T> {
    const normalizedReason = reason.trim();
    if (!normalizedReason) throw new Error('A reason is required for system context');
    return this.storage.run({ scope: 'system', reason: normalizedReason }, operation);
  }

  /**
   * Runs a tenant-scoped operation. Unlike `enterWith`, the store set here
   * propagates to all async continuations created inside `operation`, so this
   * is the reliable way to wrap a request handler in a tenant context.
   */
  async run<T>(context: TenantContext, operation: () => T | Promise<T>): Promise<T> {
    return this.storage.run(context, operation);
  }
}
