import { Module } from '@nestjs/common';
import { DbModule } from '$common/db/db.module';
import { GroupsController } from './groups.controller';
import { GroupsService } from './groups.service';

@Module({
  imports: [DbModule],
  controllers: [GroupsController],
  providers: [GroupsService]
})
export class GroupsModule {}
