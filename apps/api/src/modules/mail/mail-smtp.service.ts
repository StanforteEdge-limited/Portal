import { Injectable } from '@nestjs/common';
import nodemailer from 'nodemailer';
import type { MailAccount } from '@prisma/client';
import type { SendMessageDto } from './dto/send-message.dto';

@Injectable()
export class MailSmtpService {
  private buildTransport(account: MailAccount, accessToken: string) {
    return nodemailer.createTransport({
      host: account.provider === 'GOOGLE' ? 'smtp.gmail.com' : 'smtp.office365.com',
      port: 587,
      secure: false,
      auth: {
        type: 'OAuth2',
        user: account.emailAddress,
        accessToken,
      },
    });
  }

  async send(account: MailAccount, accessToken: string, dto: SendMessageDto): Promise<void> {
    await this.buildTransport(account, accessToken).sendMail({
      from: account.emailAddress,
      to: dto.to,
      cc: dto.cc?.join(', '),
      subject: dto.subject,
      html: dto.body,
    });
  }

  async reply(account: MailAccount, accessToken: string, dto: SendMessageDto): Promise<void> {
    await this.buildTransport(account, accessToken).sendMail({
      from: account.emailAddress,
      to: dto.to,
      cc: dto.cc?.join(', '),
      subject: dto.subject.startsWith('Re:') ? dto.subject : `Re: ${dto.subject}`,
      html: dto.body,
    });
  }

  async forward(account: MailAccount, accessToken: string, dto: SendMessageDto): Promise<void> {
    await this.buildTransport(account, accessToken).sendMail({
      from: account.emailAddress,
      to: dto.to,
      subject: dto.subject.startsWith('Fwd:') ? dto.subject : `Fwd: ${dto.subject}`,
      html: dto.body,
    });
  }
}
