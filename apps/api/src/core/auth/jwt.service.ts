import {
  decode,
  sign,
  verify,
  type JwtPayload as JsonWebTokenPayload,
  type SignOptions as JsonWebTokenSignOptions,
  type VerifyOptions,
} from 'jsonwebtoken';

/**
 * `jsonwebtoken` types `expiresIn`/`notBefore` as the branded `ms.StringValue`
 * template literal, which rejects the plain duration strings the config already
 * holds (`"15m"`, `"30d"`). These are widened back to `string | number`; the
 * values are still validated by `ms` at runtime.
 */
type SignOptions = Omit<JsonWebTokenSignOptions, 'expiresIn' | 'notBefore'> & {
  expiresIn?: string | number;
  notBefore?: string | number;
};

/**
 * Signing options accepted per call. `secret` overrides the constructor secret,
 * which is how the refresh/access token pair is signed with different keys.
 */
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

/**
 * Direct `jsonwebtoken` wrapper with the constructor/per-call option shape the
 * migrated services already use. Constructor options are the base and per-call
 * options override them, so tokens signed before the Nest removal keep the same
 * wire format and remain verifiable.
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
      ...this.options.signOptions,
      ...signOptions,
    } as JsonWebTokenSignOptions);
  }

  async signAsync(payload: object, options?: SignRequest): Promise<string> {
    return this.sign(payload, options);
  }

  verify(token: string, options: VerifyRequest = {}): JwtPayload {
    const { secret, ...verifyOptions } = options;
    return verify(token, this.resolveSecret(secret), {
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
