import { Module } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { MailModule } from '$common/mail/mail.module';
import { NotificationWorker } from './notification.worker';
import { BullModule } from '@nestjs/bullmq';

@Module({
  imports: [MailModule, BullModule.registerQueue({ name: 'notifications' })],
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationWorker],
  exports: [NotificationsService]
})
export class NotificationsModule {}
