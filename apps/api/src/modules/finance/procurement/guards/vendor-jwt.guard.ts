import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class VendorJwtGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const auth = req.headers.authorization;
    if (!auth?.startsWith('Bearer ')) throw new UnauthorizedException();
    try {
      const payload = this.jwtService.verify(auth.slice(7));
      if (payload.aud !== 'vendor-portal') throw new UnauthorizedException('Invalid token audience');
      req.vendor = payload;
      return true;
    } catch {
      throw new UnauthorizedException();
    }
  }
}
