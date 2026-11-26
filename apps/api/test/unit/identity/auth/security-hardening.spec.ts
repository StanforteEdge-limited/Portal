import { describe, expect, it } from 'vitest';
import { assertNonDisposableEmail, isDisposableEmail } from '$core/auth/disposable-email';
import { JwtService } from '$core/auth/jwt.service';
import {
  clearRefreshCookieOptions,
  parseCookieHeader,
  refreshCookieOptions,
} from '$core/auth/cookies';
import { BadRequestException } from '$core/errors';

describe('Disposable / temporary email protection', () => {
  it('blocks well-known disposable email domains and their subdomains', () => {
    expect(isDisposableEmail('user@mailinator.com')).toBe(true);
    expect(isDisposableEmail('USER@YOPMAIL.COM')).toBe(true);
    expect(isDisposableEmail('test@guerrillamail.com')).toBe(true);
    expect(isDisposableEmail('temp@10minutemail.com')).toBe(true);
    expect(isDisposableEmail('bot@sub.mailinator.com')).toBe(true);
    expect(() => assertNonDisposableEmail('throwaway@tempmail.com')).toThrow(BadRequestException);
  });

  it('allows legitimate corporate and personal email domains', () => {
    expect(isDisposableEmail('daniel@acme.com')).toBe(false);
    expect(isDisposableEmail('engineer@stanforteedge.com')).toBe(false);
    expect(isDisposableEmail('person@gmail.com')).toBe(false);
    expect(() => assertNonDisposableEmail('sarah@stanforte.com')).not.toThrow();
  });

  it('respects EXTRA_BLOCKED_EMAIL_DOMAINS runtime override', () => {
    const prev = process.env.EXTRA_BLOCKED_EMAIL_DOMAINS;
    try {
      process.env.EXTRA_BLOCKED_EMAIL_DOMAINS = 'custom-burner.xyz, another-temp.io';
      expect(isDisposableEmail('x@custom-burner.xyz')).toBe(true);
      expect(isDisposableEmail('x@sub.another-temp.io')).toBe(true);
    } finally {
      if (prev === undefined) delete process.env.EXTRA_BLOCKED_EMAIL_DOMAINS;
      else process.env.EXTRA_BLOCKED_EMAIL_DOMAINS = prev;
    }
  });
});

describe('JWT attack protections', () => {
  const jwt = new JwtService({ secret: 'super-strong-test-secret-key-32bytes!' });

  it('rejects unsigned alg:none tokens', () => {
    const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify({ sub: '1', roles: ['administrator'] })).toString('base64url');
    const unsigned = `${header}.${payload}.`;
    const unsignedWithFakeSig = `${header}.${payload}.fakesig`;

    expect(() => jwt.verify(unsigned)).toThrow();
    expect(() => jwt.verify(unsignedWithFakeSig)).toThrow();
  });

  it('rejects algorithm confusion (HS512 token when HS256 is pinned)', () => {
    const hs512Token = jwt.sign({ sub: '1' }, { algorithm: 'HS512' });
    expect(() => jwt.verify(hs512Token)).toThrow();
  });

  it('rejects oversized (>8KB) and malformed tokens', () => {
    expect(() => jwt.verify('a'.repeat(9000))).toThrow('Invalid JWT length');
    expect(() => jwt.verify('only.two')).toThrow('Malformed JWT');
  });

  it('verifies valid HS256 tokens cleanly', () => {
    const token = jwt.sign({ sub: '42', tenantId: '3' });
    const decoded = jwt.verify(token);
    expect(decoded.sub).toBe('42');
    expect(decoded.tenantId).toBe('3');
  });
});

describe('Cookie attack protections', () => {
  it('blocks prototype pollution cookie keys (__proto__, constructor, prototype)', () => {
    const parsed = parseCookieHeader('__proto__=polluted; constructor=evil; prototype=bad; safe=ok');
    expect(parsed.safe).toBe('ok');
    expect(Object.prototype.hasOwnProperty.call(parsed, '__proto__')).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(parsed, 'constructor')).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(parsed, 'prototype')).toBe(false);
    expect(({} as any).polluted).toBeUndefined();
  });

  it('scopes refresh cookies to /v1/auth with httpOnly and strict SameSite in production', () => {
    const prevEnv = process.env.NODE_ENV;
    try {
      process.env.NODE_ENV = 'production';
      const opts = refreshCookieOptions(2592000);
      expect(opts).toEqual({
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
        path: '/v1/auth',
        priority: 'high',
        maxAge: 2592000,
      });
      expect(clearRefreshCookieOptions()).toEqual({
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
        path: '/v1/auth',
      });
    } finally {
      process.env.NODE_ENV = prevEnv;
    }
  });
});
