import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { MailService } from './mail.service';
import { MailTemplatesService } from './mail-templates.service';
import { MailQueueService } from './mail-queue.service';
import { MailWorker } from './mail.worker';

@Module({
  imports: [BullModule.registerQueue({ name: 'mail' })],
  providers: [MailService, MailTemplatesService, MailQueueService, MailWorker],
  exports: [MailService, MailTemplatesService, MailQueueService]
})
export class MailModule {}
