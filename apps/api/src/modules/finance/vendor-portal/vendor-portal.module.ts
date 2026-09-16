import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { VendorPortalController } from './vendor-portal.controller';
import { VendorPortalService } from './vendor-portal.service';
import { VendorJwtGuard } from '$common/auth/vendor-jwt.guard';

@Module({
  imports: [JwtModule.register({ secret: process.env.JWT_SECRET || 'fallback-secret' })],
  controllers: [VendorPortalController],
  providers: [VendorPortalService, VendorJwtGuard],
})
export class VendorPortalModule {}
