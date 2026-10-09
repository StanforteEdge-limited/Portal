import { describe, expect, it } from 'vitest';
import { TenantContextService } from '$core/auth/tenant-context.service';
import { BadRequestException, UnauthorizedException } from '$core/errors';

describe('TenantContextService', () => {
  it('returns undefined when no context is set', () => {
    const svc = new TenantContextService();
    expect(svc.get()).toBeUndefined();
  });

  it('enters and retrieves tenant context', () => {
    const svc = new TenantContextService();
    const ctx = { tenantId: 1n, profileId: 2n, membershipId: 3n, isOwner: true };
    svc.enter(ctx as any);
    expect(svc.get()).toEqual(ctx);
  });

  it('require() throws when no context', () => {
    const svc = new TenantContextService();
    expect(() => svc.require()).toThrow(UnauthorizedException);
  });

  it('require() throws when system scope', async () => {
    const svc = new TenantContextService();
    await svc.runSystem('test', () => {
      expect(() => svc.require()).toThrow(UnauthorizedException);
    });
  });

  it('require() returns tenant context', async () => {
    const svc = new TenantContextService();
    const ctx = { tenantId: 1n, profileId: 2n, membershipId: 3n, isOwner: false };
    await svc.run(ctx as any, () => {
      expect(svc.require()).toEqual(ctx);
    });
  });

  it('isSystem() detects system context', async () => {
    const svc = new TenantContextService();
    expect(svc.isSystem()).toBe(false);
    await svc.runSystem('maintenance', () => {
      expect(svc.isSystem()).toBe(true);
    });
  });

  it('currentTenantId() returns tenant id or undefined', async () => {
    const svc = new TenantContextService();
    expect(svc.currentTenantId()).toBeUndefined();
    await svc.run({ tenantId: 10n, profileId: 1n, membershipId: 2n, isOwner: false } as any, () => {
      expect(svc.currentTenantId()).toBe(10n);
    });
    await svc.runSystem('test', () => {
      expect(svc.currentTenantId()).toBeUndefined();
    });
  });

  it('requireTenantId() enforces tenant presence', () => {
    const svc = new TenantContextService();
    expect(() => svc.requireTenantId()).toThrow(BadRequestException);
  });

  it('requireTenantId() returns id when in tenant scope', async () => {
    const svc = new TenantContextService();
    await svc.run({ tenantId: 5n, profileId: 1n, membershipId: 2n, isOwner: false } as any, () => {
      expect(svc.requireTenantId()).toBe(5n);
    });
  });

  it('runSystem() rejects empty reason', async () => {
    const svc = new TenantContextService();
    await expect(svc.runSystem('   ', () => {})).rejects.toThrow('A reason is required for system context');
  });

  it('runSystem() runs operation and restores context', async () => {
    const svc = new TenantContextService();
    const result = await svc.runSystem('test', () => 'ok');
    expect(result).toBe('ok');
    expect(svc.isSystem()).toBe(false);
  });
});
