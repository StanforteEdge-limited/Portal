jest.mock('bcryptjs', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { AuthService } from '$modules/identity/auth/auth.service';

function buildClient() {
  let idx = 0;
  const queue: any[] = [];
  const chain: any = {};
  const METHODS = [
    'select', 'from', 'where', 'limit', 'offset', 'orderBy', 'leftJoin',
    'insert', 'update', 'delete', 'set', 'values', 'returning',
    '$dynamic', 'groupBy', 'having', 'onConflictDoUpdate', 'onConflictDoNothing',
  ];
  for (const m of METHODS) chain[m] = jest.fn(() => chain);
  chain.then = (onFulfilled: (value: any) => any) => {
    if (idx >= queue.length) throw new Error(`No mock result for query #${idx + 1}`);
    return Promise.resolve(onFulfilled(queue[idx++]));
  };
  chain.setResults = (...results: any[]) => {
    queue.length = 0;
    queue.push(...results);
    idx = 0;
  };
  return chain;
}

describe('AuthService', () => {
  const db: any = { client: buildClient() };
  db.client.transaction = jest.fn(async (cb: any) => cb(db.client));

  const jwt: any = { signAsync: jest.fn().mockResolvedValue('token') };
  const mailService: any = {};
  const mailQueue: any = { enqueue: jest.fn() };

  const service = new AuthService(db, jwt, mailService, mailQueue);

  beforeEach(() => jest.clearAllMocks());

  describe('login', () => {
    it('throws UnauthorizedException when profile not found', async () => {
      db.client.setResults([[]]);

      await expect(
        service.login({ email: 'test@test.com', password: 'pass' } as any)
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when account is locked', async () => {
      db.client.setResults([[
        {
          id: 1n, email: 'test@test.com', status: 'active',
          passwordHash: 'hash', lockoutUntil: new Date(Date.now() + 600000),
          failedLoginAttempts: 3, primaryOrganizationId: null,
        },
      ]]);

      await expect(
        service.login({ email: 'test@test.com', password: 'pass' } as any)
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when account is inactive', async () => {
      db.client.setResults([[
        {
          id: 1n, email: 'test@test.com', status: 'inactive',
          passwordHash: 'hash', lockoutUntil: null,
          failedLoginAttempts: 0, primaryOrganizationId: null,
        },
      ]]);

      await expect(
        service.login({ email: 'test@test.com', password: 'pass' } as any)
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when password hash is missing', async () => {
      db.client.setResults([[
        {
          id: 1n, email: 'test@test.com', status: 'active',
          passwordHash: null, lockoutUntil: null,
          failedLoginAttempts: 0, primaryOrganizationId: null,
        },
      ]]);

      await expect(
        service.login({ email: 'test@test.com', password: 'pass' } as any)
      ).rejects.toThrow(UnauthorizedException);
    });

    it('increments failed attempts on wrong password', async () => {
      const profile = {
        id: 1n, email: 'test@test.com', status: 'active',
        passwordHash: 'hash', lockoutUntil: null,
        failedLoginAttempts: 1, primaryOrganizationId: 5n,
      };
      db.client.setResults([[profile], [{ id: 5n, name: 'Acme', code: 'ACME', metadata: null }], []]);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.login({ email: 'test@test.com', password: 'wrong' } as any)
      ).rejects.toThrow(UnauthorizedException);

      expect(db.client.update).toHaveBeenCalled();
      expect(db.client.set).toHaveBeenCalledWith(
        expect.objectContaining({ failedLoginAttempts: 2 })
      );
    });

    it('locks the account after 3 failed attempts', async () => {
      const profile = {
        id: 1n, email: 'test@test.com', status: 'active',
        passwordHash: 'hash', lockoutUntil: null,
        failedLoginAttempts: 2, primaryOrganizationId: 5n,
      };
      db.client.setResults([[profile], [{ id: 5n, name: 'Acme', code: 'ACME', metadata: null }], []]);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.login({ email: 'test@test.com', password: 'wrong' } as any)
      ).rejects.toThrow(UnauthorizedException);

      expect(db.client.set).toHaveBeenCalledWith(
        expect.objectContaining({ failedLoginAttempts: 3, lockoutUntil: expect.any(Date) })
      );
    });
  });

  describe('changePassword', () => {
    it('throws BadRequestException when passwords do not match', async () => {
      await expect(
        service.changePassword('1', {
          current_password: 'old',
          new_password: 'new',
          confirm_password: 'different',
        } as any)
      ).rejects.toThrow(BadRequestException);
      expect(db.client.select).not.toHaveBeenCalled();
    });

    it('throws UnauthorizedException when profile not found', async () => {
      db.client.setResults([[]]);

      await expect(
        service.changePassword('1', {
          current_password: 'old',
          new_password: 'new',
          confirm_password: 'new',
        } as any)
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when password hash is missing', async () => {
      db.client.setResults([[{ id: 1n, passwordHash: null }]]);

      await expect(
        service.changePassword('1', {
          current_password: 'old',
          new_password: 'new',
          confirm_password: 'new',
        } as any)
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when current password is wrong', async () => {
      db.client.setResults([[{ id: 1n, passwordHash: 'hash' }]]);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.changePassword('1', {
          current_password: 'wrong',
          new_password: 'new',
          confirm_password: 'new',
        } as any)
      ).rejects.toThrow(UnauthorizedException);
    });

    it('updates password and clears tokens on success', async () => {
      db.client.setResults([[{ id: 1n, passwordHash: 'hash' }], [], []]);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (bcrypt.hash as jest.Mock).mockResolvedValue('new-hash');

      const result = await service.changePassword('1', {
        current_password: 'old',
        new_password: 'new',
        confirm_password: 'new',
      } as any);

      expect(result.success).toBe(true);
      expect(bcrypt.hash).toHaveBeenCalledWith('new', 12);
      expect(db.client.update).toHaveBeenCalled();
      expect(db.client.delete).toHaveBeenCalled();
    });
  });

  describe('forgotPassword', () => {
    it('returns success even when profile not found (no email leak)', async () => {
      db.client.setResults([[]]);

      const result = await service.forgotPassword({ email: 'unknown@test.com' } as any);

      expect(result.success).toBe(true);
      expect(mailQueue.enqueue).not.toHaveBeenCalled();
    });

    it('sends reset email and rotates the reset token when profile exists', async () => {
      db.client.setResults([[
        { id: 1n, email: 'test@test.com', firstName: 'John', lastName: 'Doe' },
      ], [], []]);

      const result = await service.forgotPassword({ email: 'test@test.com' } as any);

      expect(result.success).toBe(true);
      expect(mailQueue.enqueue).toHaveBeenCalledWith(
        expect.objectContaining({ to: 'test@test.com' })
      );
      expect(db.client.transaction).toHaveBeenCalled();
      expect(db.client.delete).toHaveBeenCalled();
    });
  });

  describe('resetPassword', () => {
    it('throws UnauthorizedException when token not found', async () => {
      db.client.setResults([[]]);

      await expect(
        service.resetPassword({ token: 'invalid', new_password: 'new' } as any)
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when token is expired', async () => {
      db.client.setResults([[
        { id: 'tok-1', expiresAt: new Date(Date.now() - 60000), profileId: 1n },
      ], []]);

      await expect(
        service.resetPassword({ token: 'expired', new_password: 'new' } as any)
      ).rejects.toThrow(UnauthorizedException);
    });

    it('resets password and clears tokens on valid token', async () => {
      db.client.setResults([[
        { id: 'tok-1', expiresAt: new Date(Date.now() + 60000), profileId: 1n },
      ], [], []]);
      (bcrypt.hash as jest.Mock).mockResolvedValue('new-hash');

      const result = await service.resetPassword({ token: 'valid', new_password: 'new' } as any);

      expect(result.success).toBe(true);
      expect(db.client.transaction).toHaveBeenCalled();
    });
  });

  describe('logout', () => {
    it('deletes refresh tokens and returns success', async () => {
      db.client.setResults([[]]);

      const result = await service.logout('1');

      expect(result.success).toBe(true);
      expect(db.client.delete).toHaveBeenCalled();
    });
  });

  describe('acceptInvite', () => {
    it('throws BadRequestException when passwords do not match', async () => {
      await expect(
        service.acceptInvite({
          token: 'tok',
          new_password: 'new',
          confirm_password: 'different',
        } as any)
      ).rejects.toThrow(BadRequestException);
    });

    it('throws UnauthorizedException when invite token not found', async () => {
      db.client.setResults([[]]);

      await expect(
        service.acceptInvite({ token: 'bad', new_password: 'new', confirm_password: 'new' } as any)
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});