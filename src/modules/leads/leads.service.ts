import { Injectable } from "@nestjs/common";
import type { ContactLeadRequest, DemoLeadRequest } from "./leads.dto.js";
import { MailService } from "./mail.service.js";

const DEFAULT_LEADS_TO = "pto-doc.ru@mail.ru";

@Injectable()
export class LeadsService {
  constructor(private readonly mail: MailService) {}

  private recipients() {
    const to = process.env.LEADS_TO?.trim() || DEFAULT_LEADS_TO;
    const from =
      process.env.LEADS_FROM?.trim() ||
      process.env.SMTP_USER?.trim() ||
      to;
    return { to, from };
  }

  async submitDemoLead(body: DemoLeadRequest): Promise<{ ok: true }> {
    const { to, from } = this.recipients();
    const now = new Date().toISOString();
    const text = [
      "Источник: demo",
      `Дата (UTC): ${now}`,
      `Email: ${body.email}`,
      `Компания: ${body.company || "—"}`,
      `Телефон: ${body.phone || "—"}`,
      `Комментарий: ${body.comment || "—"}`,
    ].join("\n");

    await this.mail.sendLeadMail({
      to,
      from,
      replyTo: body.email,
      subject: `[ПТО-Doc] Заявка с демо — ${body.email}`,
      text,
    });
    return { ok: true };
  }

  async submitContactLead(body: ContactLeadRequest): Promise<{ ok: true }> {
    const { to, from } = this.recipients();
    const now = new Date().toISOString();
    const text = [
      "Источник: landing",
      `Дата (UTC): ${now}`,
      `Имя: ${body.name}`,
      `Email: ${body.email}`,
      `Сообщение: ${body.message}`,
    ].join("\n");

    await this.mail.sendLeadMail({
      to,
      from,
      replyTo: body.email,
      subject: `[ПТО-Doc] Заявка с сайта — ${body.name}`,
      text,
    });
    return { ok: true };
  }
}
