import { Module } from '@nestjs/common';
import { NotificationsModule } from '$modules/notifications/notifications.module';
import { LeaveController } from './leave.controller';
import { LeaveService } from './leave.service';

@Module({
  imports: [NotificationsModule],
  controllers: [LeaveController],
  providers: [LeaveService],
  exports: [LeaveService],
})
export class LeaveModule {}
