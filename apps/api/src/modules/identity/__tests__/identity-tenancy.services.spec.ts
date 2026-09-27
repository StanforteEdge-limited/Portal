jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('hashed-password'),
}));

jest.mock('$common/mail/mail-queue.service', () => ({
  MailQueueService: jest.fn(),
}));

jest.mock('$common/mail/mail.service', () => ({
  MailService: jest.fn(),
}));

jest.mock('$modules/identity/auth/auth.service', () => ({
  AuthService: jest.fn(),
}));

import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { RbacService } from '$modules/identity/rbac/rbac.service';
import { UsersService } from '$modules/identity/users/users.service';
import { TenancyService } from '$modules/tenancy/tenancy.service';
import { WorkspaceService } from '$modules/tenancy/workspace.service';

function buildClient() {
  let idx = 0;
  const queue: any[] = [];
  const chain: any = {};
  const methods = [
    'select',
    'selectDistinct',
    'from',
    'where',
    'limit',
    'offset',
    'orderBy',
    'leftJoin',
    'innerJoin',
    'insert',
    'update',
    'delete',
    'set',
    'values',
    'returning',
    'onConflictDoUpdate',
    'onConflictDoNothing',
    'execute',
  ];
  for (const method of methods) chain[method] = jest.fn(() => chain);
  chain.then = (onFulfilled: (value: any) => any) => {
    if (idx >= queue.length) throw new Error(`No mock result for query #${idx + 1}`);
    return Promise.resolve(onFulfilled(queue[idx++]));
  };
  chain.setResults = (...results: any[]) => {
    queue.length = 0;
    queue.push(...results);
    idx = 0;
  };
  chain.transaction = jest.fn(async (callback: any) => callback(chain));
  return chain;
}

const tenant = { tenantId: 10n, profileId: 1n, isOwner: true } as any;

describe('identity and tenancy service safeguards', () => {
  let client: any;
  let db: any;
  let tenantContext: any;
  let mailQueue: any;
  let auth: any;

  beforeEach(() => {
    client = buildClient();
    db = { client };
    tenantContext = {
      currentTenantId: jest.fn(() => tenant.tenantId),
      runSystem: jest.fn((_label: string, callback: () => Promise<unknown>) => callback()),
    };
    mailQueue = { enqueue: jest.fn() };
    auth = {
      clearRbacStateCache: jest.fn(),
      invalidateRbacState: jest.fn(),
    };
    jest.clearAllMocks();
  });

  describe('UsersService', () => {
    function service() {
      return new UsersService(db, {} as any, mailQueue, tenantContext);
    }

    it('rejects active staff creation without a password', async () => {
      client.setResults([]);

      await expect(
        service().createUser({
          email: 'new@example.com',
          type: 'staff',
          status: 'active',
          primary_organization_id: '2',
        } as any, tenant),
      ).rejects.toThrow(BadRequestException);

      expect(client.transaction).not.toHaveBeenCalled();
    });

    it('rejects duplicate emails before user creation', async () => {
      client.setResults([{ id: 2n, email: 'exists@example.com' }]);

      await expect(
        service().createUser({
          email: 'exists@example.com',
          type: 'admin',
          password: 'ChangeMe123!',
          set_password: true,
        } as any, tenant),
      ).rejects.toThrow('Email already exists');
    });

    it('queues tenant-scoped invite email for an active member', async () => {
      client.setResults(
        [{ id: 2n, email: 'member@example.com', firstName: 'Member', lastName: 'One' }],
        [{ id: 11n }],
        [],
        [],
        [],
        [],
      );

      const result = await service().inviteUser('2', { message: 'Welcome' } as any, tenant.tenantId);

      expect(result.success).toBe(true);
      expect(client.transaction).toHaveBeenCalled();
      expect(mailQueue.enqueue).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'member@example.com',
          subject: expect.stringContaining('invited'),
          text: expect.stringContaining('Welcome'),
        }),
      );
    });
  });

  describe('TenancyService', () => {
    function service(usersService: any = { inviteUser: jest.fn() }) {
      return new TenancyService(db, usersService, tenantContext);
    }

    it('rejects tenant updates from non-owners', async () => {
      await expect(
        service().updateTenant({ ...tenant, isOwner: false }, { name: 'Renamed' } as any),
      ).rejects.toThrow(BadRequestException);
      expect(client.update).not.toHaveBeenCalled();
    });

    it('prevents owners from deactivating their own tenant membership', async () => {
      client.setResults([{ id: 50n, profileId: tenant.profileId, isOwner: false }]);

      await expect(service().deactivateMember(tenant, tenant.profileId)).rejects.toThrow(
        'You cannot deactivate your own tenant membership',
      );
    });

    it('reactivates existing invited members and sends an invite', async () => {
      const usersService = { inviteUser: jest.fn().mockResolvedValue({ success: true }) };
      client.setResults(
        [{ id: 3n, status: 'invited' }],
        [{ id: 7n, status: 'inactive' }],
        [],
      );

      const result = await service(usersService).inviteMember(tenant, 'Invited@Example.com', 'Join us');

      expect(result).toEqual({ success: true, profileId: '3' });
      expect(client.update).toHaveBeenCalled();
      expect(usersService.inviteUser).toHaveBeenCalledWith('3', { message: 'Join us' }, tenant.tenantId);
    });
  });

  describe('WorkspaceService', () => {
    function service() {
      return new WorkspaceService(db, tenantContext);
    }

    it('rejects reserved workspace slugs before opening a transaction', async () => {
      await expect(
        service().createWorkspace({
          name: 'Admin Workspace',
          slug: 'admin',
          email: 'owner@example.com',
          password: 'ChangeMe123!',
        } as any),
      ).rejects.toThrow('Workspace slug is reserved');

      expect(client.transaction).not.toHaveBeenCalled();
    });

    it('rejects duplicate workspace slugs', async () => {
      client.setResults([{ id: 1n }], []);

      await expect(
        service().createWorkspace({
          name: 'Acme',
          slug: 'acme',
          email: 'owner@example.com',
          password: 'ChangeMe123!',
        } as any),
      ).rejects.toThrow('Workspace slug is already taken');
    });

    it('requires tenant ownership before bootstrapping defaults', async () => {
      await expect(service().bootstrapDefaults({ ...tenant, isOwner: false })).rejects.toThrow(
        'Only tenant owners can bootstrap workspace defaults',
      );
    });
  });

  describe('RbacService', () => {
    function service() {
      return new RbacService(db, tenantContext, auth);
    }

    it('requires at least one role when assigning user roles', async () => {
      client.setResults([{ id: 2n, email: 'member@example.com' }], [{ id: 22n }]);

      await expect(
        service().assignUserRoles('2', { role_ids: [], replace_existing: true } as any, tenant),
      ).rejects.toThrow('At least one role must be provided');
    });

    it('rejects primary role ids that are not part of the assignment', async () => {
      client.setResults(
        [{ id: 2n, email: 'member@example.com' }],
        [{ id: 22n }],
        [{ id: 100n }, { id: 101n }],
      );

      await expect(
        service().assignUserRoles(
          '2',
          { role_ids: ['100', '101'], primary_role_id: '999', replace_existing: true } as any,
          tenant,
        ),
      ).rejects.toThrow('Primary role must be included in role_ids');
    });

    it('reports not found when tenant membership is missing for role reads', async () => {
      client.setResults([], [{ id: 2n, email: 'member@example.com' }]);

      await expect(service().getUserRoles('2', tenant)).rejects.toThrow(NotFoundException);
    });

    it('rejects deleting assigned roles without a replacement', async () => {
      client.setResults([{ id: 5n, slug: 'manager', name: 'Manager' }], [{ id: 90n, profileId: 2n }]);

      await expect(service().deleteRole('5', undefined, tenant)).rejects.toThrow(
        'Provide replacement_role_id',
      );
    });
  });
});

describe('TenancyController owner guard', () => {
  it('throws ForbiddenException before running coverage for non-owners', async () => {
    const { TenancyController } = await import('$modules/tenancy/tenancy.controller');
    const tenancyService = { auditTenantCoverage: jest.fn() };
    const controller = new TenancyController(tenancyService as any, {} as any);

    expect(() => controller.coverage({ ...tenant, isOwner: false })).toThrow(ForbiddenException);
    expect(tenancyService.auditTenantCoverage).not.toHaveBeenCalled();
  });
});
