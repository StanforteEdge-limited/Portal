import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthService } from './auth.service';
import { AUTH_ACCESS_COOKIE, parseCookieHeader } from '../../common/auth/cookies';

function extractJwtFromCookie(req: any): string | null {
  const cookieValue = parseCookieHeader(req?.headers?.cookie)?.[AUTH_ACCESS_COOKIE];
  return cookieValue ? String(cookieValue) : null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly authService: AuthService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        extractJwtFromCookie,
        ExtractJwt.fromAuthHeaderAsBearerToken()
      ]),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'change-me'
    });
  }

  async validate(payload: any) {
    const user = await this.authService.validateJwtPayload(payload);
    if (!user) throw new UnauthorizedException();
    return user;
  }
}
