import { Module } from '@nestjs/common';
import { TenancyController } from './tenancy.controller';
import { TenancyService } from './tenancy.service';
import { UsersModule } from '$modules/auth/users/users.module';

@Module({
  imports: [UsersModule],
  controllers: [TenancyController],
  providers: [TenancyService],
  exports: [TenancyService],
})
export class TenancyModule {}
