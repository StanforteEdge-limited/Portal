import { Global, Module } from '@nestjs/common';
import { DbModule } from '$common/db/db.module';
import { DrizzleService } from './drizzle.service';
import { TenantContextService } from '$common/auth/tenant-context.service';

@Global()
@Module({
  imports: [DbModule],
  providers: [TenantContextService, DrizzleService],
  exports: [DrizzleService, TenantContextService]
})
export class DrizzleModule {}
