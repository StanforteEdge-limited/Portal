import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Job } from 'bullmq';
import { MailService, SendMailInput } from './mail.service';

@Injectable()
@Processor('mail')
export class MailWorker extends WorkerHost {
  constructor(private readonly mailService: MailService) {
    super();
  }

  async process(job: Job<SendMailInput>) {
    if (job.name !== 'send-email') return;
    const result = await this.mailService.send(job.data);
    if (!result.sent) {
      throw new Error(result.reason);
    }
  }
}
