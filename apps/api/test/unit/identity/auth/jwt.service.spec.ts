import { describe, expect, it } from 'vitest';
import { JwtService } from '$core/auth/jwt.service';

describe('JwtService', () => {
  it('round-trips the payload it signed', () => {
    const jwt = new JwtService({ secret: 'access-secret', signOptions: { expiresIn: '15m' } });

    const token = jwt.sign({ sub: '42', tenantId: '7' });

    expect(jwt.verify(token)).toMatchObject({ sub: '42', tenantId: '7' });
  });

  it('lets a per-call secret override the constructor secret', () => {
    const jwt = new JwtService({ secret: 'access-secret' });

    const refresh = jwt.sign({ sub: '1' }, { secret: 'refresh-secret' });

    expect(jwt.verify(refresh, { secret: 'refresh-secret' })).toMatchObject({ sub: '1' });
    expect(() => jwt.verify(refresh)).toThrow();
  });

  it('rejects a token signed with a different secret', () => {
    const jwt = new JwtService({ secret: 'access-secret' });
    const other = new JwtService({ secret: 'other-secret' });

    expect(() => jwt.verify(other.sign({ sub: '1' }))).toThrow();
  });

  it('honours expiresIn and rejects expired tokens', () => {
    const jwt = new JwtService({ secret: 'access-secret' });

    const expired = jwt.sign({ sub: '1' }, { expiresIn: -10 });

    expect(() => jwt.verify(expired)).toThrow();
  });

  it('decodes without verifying', () => {
    const jwt = new JwtService({ secret: 'access-secret' });

    const token = jwt.sign({ sub: '99', roles: ['admin'] });

    expect(jwt.decode(token)).toMatchObject({ sub: '99', roles: ['admin'] });
  });

  it('throws when no secret is configured at all', () => {
    const jwt = new JwtService();

    expect(() => jwt.sign({ sub: '1' })).toThrow(/secretOrPrivateKey/);
  });

  it('exposes async wrappers with the same behaviour', async () => {
    const jwt = new JwtService({ secret: 'access-secret' });

    const token = await jwt.signAsync({ sub: '5' });

    await expect(jwt.verifyAsync(token)).resolves.toMatchObject({ sub: '5' });
  });
});
