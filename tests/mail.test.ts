import assert from "node:assert/strict";
import { test } from "node:test";
import { applicationUrl, createMailer, mailConfiguration, MailDeliveryError, type SmtpOptions } from "../src/lib/mail";
import { notifyBoutiqueDecision } from "../src/features/admin/notifications";

const env = { SMTP_HOST: "smtp.gmail.com", SMTP_USER: "admin@gmail.com", SMTP_PASSWORD: "test-app-password", EMAIL_FROM: "admin@gmail.com", APP_URL: "http://localhost:3000" };
const configuration = mailConfiguration(env)!;

test("SMTP requires valid credentials and a single sender address", () => {
  assert.equal(configuration.port, 587);
  assert.equal(mailConfiguration({ ...env, SMTP_PASSWORD: "" }), null);
  assert.equal(mailConfiguration({ ...env, EMAIL_FROM: "invalid" }), null);
  assert.equal(mailConfiguration({ ...env, SMTP_HOST: "smtp.gmail.com\nInjected" }), null);
  assert.equal(mailConfiguration({ ...env, SMTP_PORT: "invalid" }), null);
  assert.equal(mailConfiguration({ ...env, EMAIL_FROM: undefined })?.from, env.SMTP_USER);
});

test("SMTP validates messages before opening a connection and requires encrypted transport", async () => {
  const options: SmtpOptions[] = [];
  const mailer = createMailer(configuration, config => {
    options.push(config);
    return { sendMail: async message => { assert.equal(message.from, env.EMAIL_FROM); return { accepted: [message.to], messageId: "test-id" }; } };
  });
  await assert.rejects(mailer.send({ to: "owner@example.com", subject: "Decision\nBcc: injected@example.com", text: "test" }), MailDeliveryError);
  assert.equal(options.length, 0);
  assert.deepEqual(await mailer.send({ to: "owner@example.com", subject: "Decision", text: "test" }), { messageId: "test-id" });
  assert.equal(options[0].requireTLS, true);
  assert.equal(options[0].secure, false);
  assert.equal(options[0].tls.rejectUnauthorized, true);
  assert.equal(options[0].disableUrlAccess, true);
  assert.equal(options[0].disableFileAccess, true);
  await createMailer({ ...configuration, port: 465 }, config => {
    assert.equal(config.secure, true);
    return { sendMail: async () => ({ accepted: ["owner@example.com"] }) };
  }).send({ to: "owner@example.com", subject: "Decision", text: "test" });
});

test("SMTP failures and rejected recipients do not expose provider credentials", async () => {
  for (const transport of [
    { sendMail: async () => { throw new Error("provider error with test-app-password"); } },
    { sendMail: async () => ({ accepted: [], rejected: ["owner@example.com"] }) },
  ]) {
    await assert.rejects(createMailer(configuration, () => transport).send({ to: "owner@example.com", subject: "Decision", text: "test" }), error => {
      assert.ok(error instanceof MailDeliveryError);
      assert.equal(error.message.includes(env.SMTP_PASSWORD), false);
      return true;
    });
  }
});

test("recovery URLs require configured HTTPS or localhost and reject credentials", () => {
  assert.equal(applicationUrl("/reset-password", env)?.origin, "http://localhost:3000");
  assert.equal(applicationUrl("/reset-password", { APP_URL: "https://rentique.example" })?.pathname, "/reset-password");
  for (const APP_URL of ["http://remote.example", "https://user:secret@rentique.example", "javascript:alert(1)", ""]) assert.equal(applicationUrl("/", { APP_URL }), null);
});

test("boutique decisions report optional email status without reversing the decision", async () => {
  const boutique = { name: "Silk Boutique", status: "APPROVED" as const, owner: { email: "owner@example.com" }, rejectionReason: null };
  assert.deepEqual(await notifyBoutiqueDecision(boutique, { configured: () => false, send: async () => { assert.fail("Unconfigured mail must not send"); } }), { status: "not_configured" });
  assert.deepEqual(await notifyBoutiqueDecision(boutique, { configured: () => true, send: async message => {
    assert.equal(message.to, "owner@example.com"); assert.ok(message.text.includes("boutique dashboard")); return { messageId: "test" };
  } }), { status: "sent" });
  assert.deepEqual(await notifyBoutiqueDecision({ ...boutique, status: "REJECTED", rejectionReason: "Missing details" }, { configured: () => true, send: async message => {
    assert.ok(message.text.includes("Missing details")); throw new Error("SMTP unavailable");
  } }), { status: "failed" });
});
