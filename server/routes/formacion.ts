import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { RequestHandler } from "express";
import { z } from "zod";

import {
  decryptPayload,
  encryptedRequestSchema,
  escapeHtml,
  formatRecipients,
  normalizePem,
} from "./utils/encrypted-request";
import { sendEmail } from "../services/email";
import { FileGet, requestSiaToken, SiaServiceError } from "../services/sia";
import { getTenantContext, resolveTenantEnv } from "../utils/tenant-env";
import coursesData from "../../client/data/formacion-courses.json";
import type {
  EncryptedSubmissionRequest,
  FormacionFormData,
  FormacionPublicKeyResponse,
  FormacionSubmissionRequest,
  FormacionSubmissionResponse,
} from "@shared/api";

const formacionFormSchema = z.object({
  fullName: z.string().min(1),
  identification: z.string().min(1),
  email: z.string().email(),
  course: z.string().min(1),
});

type _EncryptedRequestMatchesSchema = FormacionSubmissionRequest extends z.infer<typeof encryptedRequestSchema>
  ? true
  : never;

const CONTACT_OFFICE_MESSAGE =
  "Señor usuario, por favor póngase en contacto con la oficina donde adquirió su producto.";

const moduleDirname = path.dirname(fileURLToPath(import.meta.url));
const templatesDir = path.resolve(moduleDirname, "../plantillas");

const loadTemplate = (filename: string) => {
  const templatePath = path.resolve(templatesDir, filename);
  try {
    return fs.readFileSync(templatePath, "utf8");
  } catch (error) {
    console.error(`Failed to load email template at ${templatePath}`, error);
    throw new Error("Unable to load Formación email template");
  }
};

const formacionHtmlTemplate = loadTemplate("formacion.html");

const formacionTextTemplate = `Nueva inscripción a curso

Se ha recibido una nueva inscripción a través del portal de formación.

Datos del participante
Nombre: {{fullName}}
Cédula: {{identification}}
Correo: {{email}}
Curso seleccionado: {{course}}

----------------------------------------
Advertencia legal: El contenido de este mensaje, incluidos los ficheros adjuntos, es confidencial. Si usted ha recibido o accedido a este mensaje por error, le rogamos que nos comunique esta incidencia por la misma vía y proceda a destruir el mensaje de forma inmediata. Cualquier opinión contenida en este mensaje es responsabilidad de su autor y no representa necesariamente la opinión de AXA PARTNERS COLOMBIA. Su dirección de correo y demás datos de contacto se encuentran recogidos en nuestros ficheros con la finalidad de gestionar la relación contractual y/o mantenerlo informado. Entendemos que usted consiente el tratamiento de los citados datos con dicha finalidad, y estos serán tratados conforme a nuestra Política de Privacidad (https://www.axapartners.co/es/pagina/politica-de-privacidad). Puede ejercer sus derechos en materia de protección de datos de acuerdo con la Ley 1581 de 2012, dirigiéndose por escrito al correo electrónico: dataprivacy@axa-assistance.com.co. Tenga presente que cualquier uso de datos que no esté circunscrito a las finalidades descritas en las políticas, o que se realice sin el consentimiento previo de los titulares, está sujeto a las sanciones previstas en la normativa colombiana.`;

const renderTemplate = (template: string, values: Record<string, string>) =>
  Object.entries(values).reduce(
    (acc, [key, value]) => acc.split(`{{${key}}}`).join(value),
    template,
  );

const buildEmailContent = (data: FormacionFormData) => {
  const htmlValues = {
    fullName: escapeHtml(data.fullName),
    identification: escapeHtml(data.identification),
    email: escapeHtml(data.email),
    course: escapeHtml(data.course),
  };

  const textValues = {
    fullName: data.fullName,
    identification: data.identification,
    email: data.email,
    course: data.course,
  };

  const html = renderTemplate(formacionHtmlTemplate, htmlValues);
  const text = renderTemplate(formacionTextTemplate, textValues);

  return { html, text };
};

type CourseDefinition = (typeof coursesData)[number];

const findCourseDefinition = (courseTitle: string): CourseDefinition | undefined => {
  const normalizedTitle = courseTitle.trim().toLowerCase();
  return coursesData.find((course) => course.title.trim().toLowerCase() === normalizedTitle);
};

const buildCertificateNotice = (course?: CourseDefinition) => {
  if (!course || course.isCertificate === undefined) {
    return { html: "", text: "" };
  }

  if (course.isCertificate) {
    const message = "su solicitud fue recibida espere indicaciones de acceso por este medio";
    return {
      html: `<p>${escapeHtml(message)}</p>`,
      text: message,
    };
  }

  const courseUrl = course.urlCurso?.trim();
  const escapedUrl = courseUrl ? escapeHtml(courseUrl) : null;

  const htmlMessage = courseUrl
    ? `Este curso no genera certificado y puede acceder al siguiente link <a href="${escapedUrl}" target="_blank" rel="noopener noreferrer">${escapedUrl}</a>`
    : "Este curso no genera certificado.";

  const textMessage = courseUrl
    ? `Este curso no genera certificado y puede acceder al siguiente link ${courseUrl}`
    : "Este curso no genera certificado.";

  return {
    html: `<p>${htmlMessage}</p>`,
    text: textMessage,
  };
};

const buildUserConfirmationContent = (data: FormacionFormData, course?: CourseDefinition) => {
  const certificateNotice = buildCertificateNotice(course);
  const html = `
    <h1>Confirmación de inscripción</h1>
    <p>Hola ${escapeHtml(data.fullName)},</p>
    <p>Hemos recibido tu solicitud de inscripción al curso ${escapeHtml(data.course)}.</p>
    <p>Muy pronto nos pondremos en contacto contigo para compartir los siguientes pasos.</p>
    <p>Resumen de tu inscripción:</p>
    <ul>
      <li><strong>Nombre:</strong> ${escapeHtml(data.fullName)}</li>
      <li><strong>Cédula:</strong> ${escapeHtml(data.identification)}</li>
      <li><strong>Correo:</strong> ${escapeHtml(data.email)}</li>
      <li><strong>Curso seleccionado:</strong> ${escapeHtml(data.course)}</li>
    </ul>
    ${certificateNotice.html}
    <p>Gracias por confiar en AXA.</p>
  `;

  const textLines = [
    "Confirmación de inscripción",
    "",
    `Hola ${data.fullName},`,
    `Hemos recibido tu solicitud de inscripción al curso ${data.course}.`,
    "Muy pronto nos pondremos en contacto contigo para compartir los siguientes pasos.",
    "",
    "Resumen de tu inscripción:",
    `Nombre: ${data.fullName}`,
    `Cédula: ${data.identification}`,
    `Correo: ${data.email}`,
    `Curso seleccionado: ${data.course}`,
  ];

  if (certificateNotice.text) {
    textLines.push("", certificateNotice.text);
  }

  textLines.push("", "Gracias por confiar en AXA.");

  const text = textLines.join("\n");

  return { html, text };
};

export const handleGetFormacionPublicKey: RequestHandler = (_req, res) => {
  const publicKey = process.env.FORMACION_PUBLIC_KEY;
  if (!publicKey) {
    return res.status(500).json({ error: "FORMACION public key is not configured" });
  }

  const response: FormacionPublicKeyResponse = {
    publicKey: normalizePem(publicKey),
  };

  res.json(response);
};

export const handleSubmitFormacion: RequestHandler = async (req, res) => {
  const privateKey = process.env.FORMACION_PRIVATE_KEY;
  if (!privateKey) {
    return res.status(500).json({ error: "FORMACION private key is not configured" });
  }

  const parseEncrypted = encryptedRequestSchema.safeParse(req.body);
  if (!parseEncrypted.success) {
    return res.status(400).json({ error: "Invalid request payload", details: parseEncrypted.error.flatten() });
  }

  let formData: FormacionFormData;
  try {
    const decrypted = decryptPayload(parseEncrypted.data as EncryptedSubmissionRequest, privateKey);
    const parsed = formacionFormSchema.safeParse(JSON.parse(decrypted));
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid form payload", details: parsed.error.flatten() });
    }
    formData = {
      fullName: parsed.data.fullName.trim(),
      identification: parsed.data.identification.trim(),
      email: parsed.data.email.trim(),
      course: parsed.data.course.trim(),
    };
  } catch (error) {
    console.error("Failed to decrypt formación payload", error);
    return res.status(400).json({ error: "Unable to decrypt form payload" });
  }

  const tenant = getTenantContext(req);
  const recipients = formatRecipients(resolveTenantEnv("FORMACION_EMAIL_TO", tenant));
  if (recipients.length === 0) {
    return res.status(500).json({ error: "FORMACION_EMAIL_TO is not configured" });
  }

  let siaToken: { access_token: string; consumerKey: string; dz: string };
  try {
    const tokenResponse = await requestSiaToken();
    const consumerKey = tokenResponse.consumerKey?.trim();
    const dz = tokenResponse.dz?.trim();

    if (!consumerKey || !dz) {
      throw new SiaServiceError(
        "La respuesta del servicio de SIA no contiene los datos requeridos.",
        502,
        tokenResponse,
      );
    }

    siaToken = {
      access_token: tokenResponse.access_token,
      consumerKey,
      dz,
    };
  } catch (error) {
    console.error("Failed to obtain SIA token for formación", error);
    if (error instanceof SiaServiceError) {
      return res.status(error.status || 500).json({ error: error.message });
    }

    return res.status(500).json({ error: "Ocurrió un error al obtener el token de SIA." });
  }

  try {
    const fileGetItems = await FileGet({
      sia_token: siaToken.access_token,
      sia_dz: siaToken.dz,
      sia_consumer_key: siaToken.consumerKey,
      user_identification: formData.identification,
    });

    if (!Array.isArray(fileGetItems) || fileGetItems.length === 0) {
      console.warn("SIA FileGet returned no products for formación", {
        identification: formData.identification,
        fileGetItems,
      });
      return res.status(403).json({ error: CONTACT_OFFICE_MESSAGE });
    }
  } catch (error) {
    console.error("Failed to validate formación benefits in SIA", error);

    if (error instanceof SiaServiceError) {
      return res.status(error.status || 500).json({ error: CONTACT_OFFICE_MESSAGE });
    }

    return res.status(500).json({ error: CONTACT_OFFICE_MESSAGE });
  }

  const { html, text } = buildEmailContent(formData);
  const courseDefinition = findCourseDefinition(formData.course);
  const { html: userHtml, text: userText } = buildUserConfirmationContent(formData, courseDefinition);
  const fromAddress = resolveTenantEnv("FORMACION_EMAIL_FROM", tenant) ?? undefined;

  try {
    await sendEmail({
      to: recipients,
      subject: `Nueva inscripción curso - ${formData.course}`,
      text,
      html,
      from: fromAddress,
    }, { tenant });

    await sendEmail({
      to: [formData.email],
      subject: `Inscripción Pendiente - ${formData.course}`,
      text: userText,
      html: userHtml,
      from: fromAddress,
    }, { tenant });
  } catch (error) {
    console.error("Failed to send formación email", error);
    return res.status(502).json({ error: "Failed to send formación notification" });
  }

  const response: FormacionSubmissionResponse = { status: "ok" };
  res.json(response);
};
