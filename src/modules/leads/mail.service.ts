import { Injectable, Logger, ServiceUnavailableException } from "@nestjs/common";
import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";

export type LeadMailPayload = {
  to: string;
  from: string;
  replyTo: string;
  subject: string;
  text: string;
};

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: Transporter | null = null;

  private loadConfig() {
    const host = process.env.SMTP_HOST?.trim();
    const port = Number(process.env.SMTP_PORT ?? 0);
    const user = process.env.SMTP_USER?.trim();
    const pass = process.env.SMTP_PASS?.trim();
    const secure =
      process.env.SMTP_SECURE === "true" ||
      process.env.SMTP_SECURE === "1" ||
      port === 465;

    if (!host || !port || !user || !pass) {
      return null;
    }
    return { host, port, user, pass, secure };
  }

  private getTransporter(): Transporter {
    if (this.transporter) {
      return this.transporter;
    }
    const cfg = this.loadConfig();
    if (!cfg) {
      throw new ServiceUnavailableException({
        code: "mail_unavailable",
        message: "Не удалось отправить заявку",
      });
    }
    this.transporter = nodemailer.createTransport({
      host: cfg.host,
      port: cfg.port,
      secure: cfg.secure,
      auth: { user: cfg.user, pass: cfg.pass },
    });
    return this.transporter;
  }

  async sendLeadMail(payload: LeadMailPayload): Promise<void> {
    try {
      const transporter = this.getTransporter();
      await transporter.sendMail({
        to: payload.to,
        from: payload.from,
        replyTo: payload.replyTo,
        subject: payload.subject,
        text: payload.text,
      });
    } catch (error) {
      this.logger.error(
        "SMTP send failed",
        error instanceof Error ? error.stack : String(error),
      );
      throw new ServiceUnavailableException({
        code: "mail_unavailable",
        message: "Не удалось отправить заявку",
      });
    }
  }
}
