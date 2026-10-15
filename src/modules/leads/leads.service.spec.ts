import { LeadsService } from "./leads.service.js";
import type { MailService } from "./mail.service.js";

describe("LeadsService", () => {
  const sendLeadMail = jest.fn().mockResolvedValue(undefined);
  const mail = { sendLeadMail } as unknown as MailService;
  const service = new LeadsService(mail);

  beforeEach(() => {
    sendLeadMail.mockClear();
    delete process.env.LEADS_TO;
    delete process.env.LEADS_FROM;
    delete process.env.SMTP_USER;
  });

  it("шлёт демо-лид на pto-doc.ru@mail.ru по умолчанию", async () => {
    const result = await service.submitDemoLead({
      email: "a@b.c",
      company: "Co",
      phone: "",
      comment: "x",
    });
    expect(result).toEqual({ ok: true });
    expect(sendLeadMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "pto-doc.ru@mail.ru",
        replyTo: "a@b.c",
        subject: "[ПТО-Doc] Заявка с демо — a@b.c",
      }),
    );
  });

  it("шлёт контактный лид с именем в subject", async () => {
    process.env.LEADS_TO = "custom@example.com";
    await service.submitContactLead({
      name: "Тест",
      email: "t@e.st",
      message: "Сообщение длиннее десяти",
    });
    expect(sendLeadMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "custom@example.com",
        subject: "[ПТО-Doc] Заявка с сайта — Тест",
      }),
    );
  });
});
