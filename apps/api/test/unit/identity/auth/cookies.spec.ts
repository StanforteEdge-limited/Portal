import { describe, expect, it } from 'vitest';
import {
  AUTH_ACCESS_COOKIE,
  AUTH_REFRESH_COOKIE,
  authCookieOptions,
  clearAuthCookieOptions,
  parseCookieHeader,
} from '$core/auth/cookies';

describe('parseCookieHeader', () => {
  it('returns an empty object for a missing header', () => {
    expect(parseCookieHeader(undefined)).toEqual({});
    expect(parseCookieHeader(null)).toEqual({});
    expect(parseCookieHeader('')).toEqual({});
  });

  it('parses a single cookie', () => {
    expect(parseCookieHeader('se_access_token=abc')).toEqual({ [AUTH_ACCESS_COOKIE]: 'abc' });
  });

  it('parses multiple cookies and trims surrounding spaces', () => {
    const header = `${AUTH_ACCESS_COOKIE}=abc; ${AUTH_REFRESH_COOKIE}=def ; theme=dark`;

    expect(parseCookieHeader(header)).toEqual({
      [AUTH_ACCESS_COOKIE]: 'abc',
      [AUTH_REFRESH_COOKIE]: 'def',
      theme: 'dark',
    });
  });

  it('percent-decodes values', () => {
    expect(parseCookieHeader('token=a%20b')).toEqual({ token: 'a b' });
  });

  it('keeps the raw value when the escape sequence is malformed', () => {
    expect(parseCookieHeader('token=100%')).toEqual({ token: '100%' });
  });

  it('ignores segments without a value or without a key', () => {
    expect(parseCookieHeader('novalue; =orphan; good=1')).toEqual({ good: '1' });
  });

  it('keeps values containing "=" intact', () => {
    expect(parseCookieHeader('token=abc=def')).toEqual({ token: 'abc=def' });
  });
});

describe('cookie options', () => {
  it('marks auth cookies httpOnly, sameSite lax and scoped to /', () => {
    expect(authCookieOptions(900)).toEqual({
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      path: '/',
      maxAge: 900,
    });
  });

  it('omits maxAge when none is given', () => {
    const opts = authCookieOptions();
    expect(opts.maxAge).toBeUndefined();
  });

  it('omits maxAge when clearing cookies', () => {
    expect(clearAuthCookieOptions()).toEqual({
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      path: '/',
    });
  });
});
