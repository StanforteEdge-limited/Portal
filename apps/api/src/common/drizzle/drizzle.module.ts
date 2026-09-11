import { Global, Module } from '@nestjs/common';
import { DbModule } from '$common/db/db.module';
import { DrizzleService } from './drizzle.service';

@Global()
@Module({
  imports: [DbModule],
  providers: [DrizzleService],
  exports: [DrizzleService]
})
export class DrizzleModule {}
