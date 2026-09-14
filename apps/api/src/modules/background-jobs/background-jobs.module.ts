import { Global, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { NotificationsModule } from '$modules/notifications/notifications.module';
import { StorageModule } from '$modules/storage/storage.module';
import { BackgroundJobsController } from './background-jobs.controller';
import { BackgroundJobsService } from './background-jobs.service';
import { BackgroundJobsWorker } from './background-jobs.worker';

@Global()
@Module({
  imports: [
    BullModule.registerQueue({ name: 'background-jobs' }),
    NotificationsModule,
    StorageModule,
  ],
  controllers: [BackgroundJobsController],
  providers: [BackgroundJobsService, BackgroundJobsWorker],
  exports: [BackgroundJobsService],
})
export class BackgroundJobsModule {}