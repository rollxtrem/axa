import net from "node:net";
import tls from "node:tls";
import { once } from "node:events";
import crypto from "node:crypto";

import { resolveTenantEnv, type TenantContext } from "../utils/tenant-env";

export interface EmailMessageInput {
  to: string[];
  subject: string;
  text?: string;
  html?: string;
  from?: string;
  cc?: string[];
  bcc?: string[];
}

interface SmtpConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
  clientName: string;
  startTls: boolean;
  minTlsVersion: tls.SecureVersion;
  rejectUnauthorized: boolean;
  defaultFrom?: string;
}

interface SmtpResolvedConfig extends SmtpConfig {
  fromAddress: string;
}

export interface EmailSendResult {
  messageId: string;
  envelope: {
    from: string;
    to: string[];
  };
}

const CRLF = "\r\n";

type ExpectedCode = number | number[];

class SMTPConnection {
  private socket!: net.Socket | tls.TLSSocket;
  private buffer = "";

  constructor(private readonly config: SmtpResolvedConfig) {}

  async connect() {
    this.socket = net.createConnection({ host: this.config.host, port: this.config.port });
    this.socket.setEncoding("utf8");
    await once(this.socket, "connect");
    await this.readResponse();
  }

  private async upgradeToTLS() {
    const secureSocket = tls.connect({
      socket: this.socket,
      host: this.config.host,
      servername: this.config.host,
      minVersion: this.config.minTlsVersion,
      rejectUnauthorized: this.config.rejectUnauthorized,
    });

    secureSocket.setEncoding("utf8");
    await once(secureSocket, "secureConnect");
    this.socket = secureSocket;
    this.buffer = "";
  }

  private write(line: string) {
    this.socket.write(`${line}${CRLF}`);
  }

  private async expectResponse(expected: ExpectedCode) {
    const expectedCodes = Array.isArray(expected) ? expected : [expected];
    const response = await this.readResponse();
    if (!expectedCodes.includes(response.code)) {
      const expectedText = expectedCodes.join(", ");
      throw new Error(
        `Unexpected SMTP response code ${response.code}. Expected ${expectedText}. Response: ${response.lines.join(" ")}`,
      );
    }
    return response;
  }

  private readResponse(): Promise<{ code: number; lines: string[] }> {
    const socket = this.socket;
    return new Promise((resolve, reject) => {
      const lines: string[] = [];
      const onError = (error: Error) => {
        cleanup();
        reject(error);
      };
      const onClose = () => {
        cleanup();
        reject(new Error("SMTP connection closed unexpectedly"));
      };
      const onData = (chunk: string) => {
        this.buffer += chunk;

        while (true) {
          const newlineIndex = this.buffer.indexOf("\n");
          if (newlineIndex === -1) {
            break;
          }

          let line = this.buffer.slice(0, newlineIndex);
          this.buffer = this.buffer.slice(newlineIndex + 1);
          if (line.endsWith("\r")) {
            line = line.slice(0, -1);
          }

          if (!/^\d{3}[ -]/.test(line)) {
            continue;
          }

          const code = Number.parseInt(line.slice(0, 3), 10);
          const continuation = line[3];
          const rest = line.slice(4);
          lines.push(rest.trim());

          if (continuation === " ") {
            cleanup();
            resolve({ code, lines: [...lines] });
            return;
          }
        }
      };

      const cleanup = () => {
        socket.off("data", onData);
        socket.off("error", onError);
        socket.off("close", onClose);
      };

      socket.on("data", onData);
      socket.once("error", onError);
      socket.once("close", onClose);
    });
  }

  async command(line: string, expected: ExpectedCode) {
    this.write(line);
    return this.expectResponse(expected);
  }

  async startTLS() {
    await this.command("STARTTLS", 220);
    await this.upgradeToTLS();
  }

  async authenticate() {
    await this.command("AUTH LOGIN", 334);
    await this.command(Buffer.from(this.config.user, "utf8").toString("base64"), 334);
    await this.command(Buffer.from(this.config.pass, "utf8").toString("base64"), 235);
  }

  async sendMail(from: string, recipients: string[], message: string) {
    await this.command(`MAIL FROM:<${from}>`, 250);
    for (const recipient of recipients) {
      await this.command(`RCPT TO:<${recipient}>`, [250, 251]);
    }
    await this.command("DATA", 354);
    const normalized = normalizeForSmtp(message);
    this.socket.write(normalized);
    if (!normalized.endsWith(CRLF)) {
      this.socket.write(CRLF);
    }
    this.socket.write(`.${CRLF}`);
    await this.expectResponse(250);
  }

  async quit() {
    try {
      await this.command("QUIT", 221);
    } catch (error) {
      if (process.env.NODE_ENV !== "test") {
        console.warn("Failed to complete QUIT command", error);
      }
    } finally {
      this.socket.end();
    }
  }
}

function normalizeForSmtp(message: string) {
  let normalized = message.replace(/\r?\n/g, CRLF);
  if (!normalized.endsWith(CRLF)) {
    normalized += CRLF;
  }
  normalized = normalized.replace(/(^|\r\n)\./g, "$1..");
  return normalized;
}

function createMessageId(domain: string) {
  const random = crypto.randomBytes(16).toString("hex");
  const timestamp = Date.now();
  return `<${timestamp}.${random}@${domain}>`;
}

function encodeHeaderValue(value: string) {
  if (/^[\x20-\x7E]*$/.test(value)) {
    return value;
  }
  const base64 = Buffer.from(value, "utf8").toString("base64");
  return `=?UTF-8?B?${base64}?=`;
}

function formatAddressList(addresses: string[]) {
  return addresses.join(", ");
}

function buildMimeMessage(config: SmtpResolvedConfig, input: EmailMessageInput) {
  const recipients = [...input.to];
  if (input.cc) {
    recipients.push(...input.cc);
  }
  if (input.bcc) {
    recipients.push(...input.bcc);
  }

  const messageId = createMessageId(config.host);
  const dateHeader = new Date().toUTCString();
  const headers: string[] = [
    `From: ${input.from ?? config.fromAddress}`,
    `To: ${formatAddressList(input.to)}`,
    `Subject: ${encodeHeaderValue(input.subject)}`,
    `Message-ID: ${messageId}`,
    `Date: ${dateHeader}`,
    "MIME-Version: 1.0",
  ];

  if (input.cc && input.cc.length > 0) {
    headers.push(`Cc: ${formatAddressList(input.cc)}`);
  }

  const parts: string[] = [];
  if (input.text && input.html) {
    const boundary = `ALT-${crypto.randomBytes(8).toString("hex")}`;
    headers.push(`Content-Type: multipart/alternative; boundary=\"${boundary}\"`);
    parts.push(`--${boundary}`);
    parts.push("Content-Type: text/plain; charset=UTF-8");
    parts.push("Content-Transfer-Encoding: 8bit");
    parts.push("");
    parts.push(input.text);
    parts.push("");
    parts.push(`--${boundary}`);
    parts.push("Content-Type: text/html; charset=UTF-8");
    parts.push("Content-Transfer-Encoding: 8bit");
    parts.push("");
    parts.push(input.html);
    parts.push("");
    parts.push(`--${boundary}--`);
    parts.push("");
  } else if (input.html) {
    headers.push("Content-Type: text/html; charset=UTF-8");
    headers.push("Content-Transfer-Encoding: 8bit");
    parts.push(input.html);
  } else {
    headers.push("Content-Type: text/plain; charset=UTF-8");
    headers.push("Content-Transfer-Encoding: 8bit");
    parts.push(input.text ?? "");
  }

  const payload = `${headers.join(CRLF)}${CRLF}${CRLF}${parts.join(CRLF)}`;

  return { payload, messageId, recipients };
}

export type EmailSendOptions = {
  tenant?: TenantContext | null;
};

function resolveSmtpConfig(tenant?: TenantContext | null): SmtpResolvedConfig {
  const requestedEnvironment = (process.env.SMTP_ENVIRONMENT ?? process.env.EMAIL_ENVIRONMENT ?? "preproduction").toLowerCase();
  const nodeEnv = process.env.NODE_ENV ?? "development";
  const useProduction = requestedEnvironment === "production" || (requestedEnvironment === "auto" && nodeEnv === "production");

  const defaults = useProduction
    ? {
        host: "insaas-mail.axa.com",
        user: "SVC_ACO_PARTSERV_PRD",
        pass: "6!gM8QNrJly*w0xOt3LT",
      }
    : {
        host: "insaas-mail-pp.axa.com",
        user: "SVC_ACO_PARTSERV_PP",
        pass: "X}8Q+viWUn$bSL(Uz|A5",
      };

  const host = resolveTenantEnv("SMTP_HOST", tenant) ?? defaults.host;
  const portValue = resolveTenantEnv("SMTP_PORT", tenant) ?? "25";
  const port = Number.parseInt(portValue, 10);
  if (Number.isNaN(port)) {
    throw new Error("Invalid SMTP_PORT value. It must be a valid number.");
  }

  const user = resolveTenantEnv("SMTP_USER", tenant) ?? defaults.user;
  const pass =
    resolveTenantEnv("SMTP_PASSWORD", tenant) ?? resolveTenantEnv("SMTP_PASS", tenant) ?? defaults.pass;
  const clientName = resolveTenantEnv("SMTP_CLIENT_NAME", tenant) ?? "axa-application";
  const rejectUnauthorized = (resolveTenantEnv("SMTP_REJECT_UNAUTHORIZED", tenant) ?? "true").toLowerCase() !== "false";
  const defaultFrom = resolveTenantEnv("SMTP_DEFAULT_FROM", tenant);

  return {
    host,
    port,
    user,
    pass,
    clientName,
    startTls: true,
    minTlsVersion: "TLSv1.2",
    rejectUnauthorized,
    defaultFrom,
    fromAddress: defaultFrom ?? user,
  };
}

export async function sendEmail(
  message: EmailMessageInput,
  options: EmailSendOptions = {},
): Promise<EmailSendResult> {
  const config = resolveSmtpConfig(options.tenant);
  const fromAddress = message.from ?? config.fromAddress;
  if (!fromAddress) {
    throw new Error("Sender address is required. Provide it in the request or via SMTP_DEFAULT_FROM env variable.");
  }

  const connection = new SMTPConnection(config);
  await connection.connect();
  try {
    await connection.command(`EHLO ${config.clientName}`, 250);
    if (config.startTls) {
      await connection.startTLS();
      await connection.command(`EHLO ${config.clientName}`, 250);
    }
    await connection.authenticate();

    const { payload, messageId, recipients } = buildMimeMessage(config, { ...message, from: fromAddress });
    await connection.sendMail(fromAddress, recipients, payload);
    await connection.quit();

    return {
      messageId,
      envelope: {
        from: fromAddress,
        to: recipients,
      },
    };
  } catch (error) {
    await connection.quit().catch(() => undefined);
    throw error;
  }
}
