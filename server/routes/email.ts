import { RequestHandler } from "express";
import { z } from "zod";
import { sendEmail } from "../services/email";
import type { SendEmailRequestBody, SendEmailResponse } from "@shared/api";

const emailRequestSchema = z
  .object({
    to: z.union([z.string().min(3), z.array(z.string().min(3))]),
    subject: z.string().min(1, "Subject is required"),
    text: z.string().optional(),
    html: z.string().optional(),
    from: z.string().optional(),
    cc: z.union([z.string().min(3), z.array(z.string().min(3))]).optional(),
    bcc: z.union([z.string().min(3), z.array(z.string().min(3))]).optional(),
  })
  .refine((data) => data.text || data.html, {
    message: "Either text or html content must be provided",
    path: ["text"],
  });

const normalizeRecipients = (value?: string | string[]) => {
  if (!value) {
    return undefined;
  }
  if (Array.isArray(value)) {
    return value.map((entry) => entry.trim()).filter(Boolean);
  }
  return value.split(",").map((entry) => entry.trim()).filter(Boolean);
};

export const handleSendEmail: RequestHandler = async (req, res) => {
  const parseResult = emailRequestSchema.safeParse(req.body as SendEmailRequestBody);

  if (!parseResult.success) {
    const errorDetails = parseResult.error.format();
    return res.status(400).json({
      error: "Invalid request payload",
      details: errorDetails,
    });
  }

  const { to, subject, text, html, from, cc, bcc } = parseResult.data;
  const normalizedTo = normalizeRecipients(to) ?? [];
  if (normalizedTo.length === 0) {
    return res.status(400).json({
      error: "At least one recipient is required",
    });
  }

  try {
    const result = await sendEmail({
      to: normalizedTo,
      subject,
      text,
      html,
      from,
      cc: normalizeRecipients(cc),
      bcc: normalizeRecipients(bcc),
    });

    const responseBody: SendEmailResponse = {
      messageId: result.messageId,
      envelope: result.envelope,
    };

    res.status(200).json(responseBody);
  } catch (error) {
    console.error("Failed to send email", error);
    res.status(502).json({
      error: "Failed to send email",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
};
