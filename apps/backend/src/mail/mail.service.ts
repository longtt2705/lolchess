import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService implements OnModuleInit {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter;
  private from = 'no-reply@lolchess.local';

  constructor(private configService: ConfigService) {}

  async onModuleInit(): Promise<void> {
    const host = this.configService.get<string>('SMTP_HOST');

    if (host) {
      const port = parseInt(this.configService.get<string>('SMTP_PORT') || '587', 10);
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: {
          user: this.configService.get<string>('SMTP_USER'),
          pass: this.configService.get<string>('SMTP_PASS'),
        },
      });
      this.from = this.configService.get<string>('SMTP_FROM') || this.from;
    } else {
      const testAccount = await nodemailer.createTestAccount();
      this.transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        auth: { user: testAccount.user, pass: testAccount.pass },
      });
      this.logger.warn(
        'No SMTP_HOST configured — using an Ethereal test account. Email preview URLs will be logged.',
      );
    }
  }

  async sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
    const info = await this.transporter.sendMail({
      from: this.from,
      to,
      subject: 'Reset your LOL Chess password',
      text:
        `You requested a password reset.\n\n` +
        `Open this link to set a new password (valid for 1 hour):\n${resetUrl}\n\n` +
        `If you didn't request this, you can safely ignore this email.`,
      html:
        `<p>You requested a password reset.</p>` +
        `<p><a href="${resetUrl}">Click here to set a new password</a> (valid for 1 hour).</p>` +
        `<p>If you didn't request this, you can safely ignore this email.</p>`,
    });

    const preview = nodemailer.getTestMessageUrl(info);
    if (preview) {
      this.logger.log(`Password reset email preview URL: ${preview}`);
    }
  }
}
