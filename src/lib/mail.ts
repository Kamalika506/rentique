import { z } from "zod";

type Environment = Record<string, string | undefined>;
export interface MailConfiguration { host: string; port: number; user: string; password: string; from: string }
export interface MailMessage { to: string; subject: string; text: string }
export interface MailEnvelope extends MailMessage { from: string }
export interface MailTransport { sendMail(message: MailEnvelope): Promise<{ accepted?: unknown[]; rejected?: unknown[]; messageId?: string }> }
export interface SmtpOptions {
  host: string; port: number; secure: boolean; requireTLS: boolean;
  auth: { user: string; pass: string }; tls: { rejectUnauthorized: true; minVersion: "TLSv1.2" };
  connectionTimeout: number; greetingTimeout: number; socketTimeout: number; dnsTimeout: number;
  logger: false; debug: false; disableFileAccess: true; disableUrlAccess: true;
}
export type MailTransportFactory = (options: SmtpOptions) => Promise<MailTransport> | MailTransport;
export class MailDeliveryError extends Error {
  constructor(message = "Email could not be sent. Please try again later.") { super(message); this.name = "MailDeliveryError"; }
}

const configurationSchema = z.object({
  host: z.string().trim().min(1).max(254).regex(/^[a-z0-9.-]+$/i),
  port: z.coerce.number().int().min(1).max(65535),
  user: z.string().trim().min(1).max(254).refine(value => !/[\r\n]/.test(value)),
  password: z.string().min(1).max(1000),
  from: z.string().trim().email().max(254),
});
const messageSchema = z.object({
  to: z.string().trim().email().max(254),
  subject: z.string().trim().min(1).max(200).refine(value => !/[\r\n]/.test(value)),
  text: z.string().min(1).max(20000),
}).strict();

export function mailConfiguration(env: Environment = process.env): MailConfiguration | null {
  const parsed = configurationSchema.safeParse({ host: env.SMTP_HOST, port: env.SMTP_PORT?.trim() || "587", user: env.SMTP_USER, password: env.SMTP_PASSWORD, from: env.EMAIL_FROM?.trim() || env.SMTP_USER });
  return parsed.success ? parsed.data : null;
}
export function smtpConfigured(env: Environment = process.env) { return mailConfiguration(env) !== null; }

/** Recovery links always use configured application state, never request headers. */
export function applicationUrl(path = "/", env: Environment = process.env): URL | null {
  try {
    const base = new URL(env.APP_URL ?? "");
    const local = ["localhost", "127.0.0.1", "[::1]"].includes(base.hostname);
    if (base.username || base.password || (base.protocol !== "https:" && !(base.protocol === "http:" && local))) return null;
    return new URL(path, base);
  } catch { return null; }
}

const smtpTransport: MailTransportFactory = async options => {
  // Lazy import avoids opening SMTP connections during module load or tests.
  const { default: nodemailer } = await import("nodemailer");
  const transport = nodemailer.createTransport(options);
  return { sendMail: message => transport.sendMail(message) };
};

export function createMailer(configuration: MailConfiguration, transportFactory: MailTransportFactory = smtpTransport) {
  return {
    async send(message: MailMessage) {
      const parsed = messageSchema.safeParse(message);
      if (!parsed.success) throw new MailDeliveryError("Email message is invalid.");
      const options: SmtpOptions = {
        host: configuration.host, port: configuration.port,
        secure: configuration.port === 465, requireTLS: configuration.port !== 465,
        auth: { user: configuration.user, pass: configuration.password },
        tls: { rejectUnauthorized: true, minVersion: "TLSv1.2" },
        connectionTimeout: 15000, greetingTimeout: 15000, socketTimeout: 20000, dnsTimeout: 15000,
        logger: false, debug: false, disableFileAccess: true, disableUrlAccess: true,
      };
      try {
        const transport = await transportFactory(options);
        const receipt = await transport.sendMail({ ...parsed.data, from: configuration.from });
        if (!receipt.accepted?.length || receipt.rejected?.length) throw new MailDeliveryError();
        return { messageId: receipt.messageId ?? null };
      } catch { throw new MailDeliveryError(); }
    },
  };
}

export async function sendMail(message: MailMessage) {
  const configuration = mailConfiguration();
  if (!configuration) throw new MailDeliveryError("Email delivery is not configured.");
  return createMailer(configuration).send(message);
}
