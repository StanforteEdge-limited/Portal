import { Module } from '@nestjs/common';
import { TenancyController } from './tenancy.controller';
import { TenancyService } from './tenancy.service';
import { WorkspaceController } from './workspace.controller';
import { WorkspaceService } from './workspace.service';
import { UsersModule } from '$modules/identity/users/users.module';

@Module({
  imports: [UsersModule],
  controllers: [TenancyController, WorkspaceController],
  providers: [TenancyService, WorkspaceService],
  exports: [TenancyService],
})
export class TenancyModule {}
