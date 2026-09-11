import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'node:async_hooks';
import { TenantContext } from './tenant-context';

@Injectable()
export class TenantContextService {
  private readonly storage = new AsyncLocalStorage<TenantContext>();

  get(): TenantContext | undefined {
    return this.storage.getStore();
  }

  enter(context: TenantContext): void {
    this.storage.enterWith(context);
  }
}
