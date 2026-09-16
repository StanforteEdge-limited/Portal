import { Global, Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { NotificationScheduler } from '$modules/hrm/notifications/notification.scheduler';
import { NotificationsModule } from '$modules/hrm/notifications/notifications.module';

@Global()
@Module({
  imports: [ScheduleModule.forRoot(), NotificationsModule],
  providers: [NotificationScheduler],
})
export class SchedulingModule {}
