import { Module } from '@nestjs/common';
import { AuthModule } from '$modules/identity/auth/auth.module';
import { RbacController } from './rbac.controller';
import { RbacService } from './rbac.service';

@Module({
  imports: [AuthModule],
  controllers: [RbacController],
  providers: [RbacService]
})
export class RbacModule {}