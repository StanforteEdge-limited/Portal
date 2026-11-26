import {
  decode,
  sign,
  verify,
  type Algorithm,
  type JwtPayload as JsonWebTokenPayload,
  type SignOptions as JsonWebTokenSignOptions,
  type VerifyOptions,
} from 'jsonwebtoken';

type SignOptions = Omit<JsonWebTokenSignOptions, 'expiresIn' | 'notBefore'> & {
  expiresIn?: string | number;
  notBefore?: string | number;
};

type SignRequest = SignOptions & { secret?: string };
type VerifyRequest = VerifyOptions & { secret?: string };

export interface JwtPayload {
  sub?: string | number;
  iat?: number;
  exp?: number;
  [claim: string]: unknown;
}

export interface JwtServiceOptions {
  secret?: string;
  signOptions?: SignOptions;
  verifyOptions?: VerifyOptions;
}

const DEFAULT_ALGORITHM: Algorithm = 'HS256';
const MAX_JWT_BYTES = 8192;

/**
 * Hardened `jsonwebtoken` wrapper:
 *  - Pins `algorithm: 'HS256'` on sign and `algorithms: ['HS256']` on verify by default
 *    to prevent `alg: none` and asymmetric/symmetric algorithm-confusion attacks.
 *  - Rejects oversized (> 8 KB) or malformed non-3-segment tokens before signature verification.
 */
export class JwtService {
  constructor(private readonly options: JwtServiceOptions = {}) {}

  private resolveSecret(explicit?: string): string {
    const key = explicit ?? this.options.secret;
    if (!key) throw new Error('secretOrPrivateKey must have a value');
    return key;
  }

  sign(payload: object, options: SignRequest = {}): string {
    const { secret, ...signOptions } = options;
    return sign(payload, this.resolveSecret(secret), {
      algorithm: DEFAULT_ALGORITHM,
      ...this.options.signOptions,
      ...signOptions,
    } as JsonWebTokenSignOptions);
  }

  async signAsync(payload: object, options?: SignRequest): Promise<string> {
    return this.sign(payload, options);
  }

  verify(token: string, options: VerifyRequest = {}): JwtPayload {
    if (typeof token !== 'string' || token.length === 0 || token.length > MAX_JWT_BYTES) {
      throw new Error('Invalid JWT length');
    }
    const parts = token.split('.');
    if (parts.length !== 3 || !parts[2]) {
      throw new Error('Malformed JWT');
    }
    // Defense-in-depth: explicitly reject `alg: none` headers before verify()
    try {
      const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8')) as { alg?: string };
      if (!header?.alg || String(header.alg).toLowerCase() === 'none') {
        throw new Error('Unsigned JWT algorithm rejected');
      }
    } catch (err) {
      if (err instanceof Error && err.message === 'Unsigned JWT algorithm rejected') throw err;
      throw new Error('Invalid JWT header');
    }

    const { secret, ...verifyOptions } = options;
    return verify(token, this.resolveSecret(secret), {
      algorithms: [DEFAULT_ALGORITHM],
      ...this.options.verifyOptions,
      ...verifyOptions,
    }) as JwtPayload;
  }

  async verifyAsync(token: string, options?: VerifyRequest): Promise<JwtPayload> {
    return this.verify(token, options);
  }

  decode(token: string): JwtPayload | null {
    return decode(token) as JsonWebTokenPayload as JwtPayload | null;
  }
}
