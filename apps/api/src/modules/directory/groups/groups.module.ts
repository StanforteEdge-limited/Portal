import { Module } from '@nestjs/common';
import { DrizzleModule } from '$common/drizzle/drizzle.module';
import { GroupsController } from './groups.controller';
import { GroupsService } from './groups.service';

@Module({
  imports: [DrizzleModule],
  controllers: [GroupsController],
  providers: [GroupsService]
})
export class GroupsModule {}
