import { RequestHandler } from "express";
import { z } from "zod";
import { addSiaFile, getSiaFiles, SiaConfigurationError, SiaRequestError, type SiaFileAddRequest, type SiaFileGetRequest } from "../services/sia";

const fileGetSchema = z.object({
  plates: z.string().min(1, "plates is required"),
  contract: z.string().optional(),
  operationType: z.string().optional(),
  serviceTypeCode: z.string().optional(),
  validationType: z.string().optional(),
});

const fileAddSchema = z.object({
  policy: z.string().min(1, "policy is required"),
  serviceCode: z.string().min(1, "serviceCode is required"),
  scheduleDate: z.string().min(1, "scheduleDate is required"),
  scheduleHour: z.string().min(1, "scheduleHour is required"),
  name: z.string().min(1, "name is required"),
  lastname: z.string().min(1, "lastname is required"),
  beneficiaryName: z.string().min(1, "beneficiaryName is required"),
  beneficiaryLastname: z.string().min(1, "beneficiaryLastname is required"),
  email: z.string().email("email must be valid"),
  mobile: z.string().min(1, "mobile is required"),
  reasonCalled: z.string().min(1, "reasonCalled is required"),
  comment: z.string().min(1, "comment is required"),
  vip: z.boolean().optional(),
  scheduleService: z.boolean().optional(),
  startDatePolicy: z.string().optional(),
  endDatePolicy: z.string().optional(),
  idCatalogClassification: z.string().optional(),
  idCatalogRequiredService: z.string().optional(),
  idCatalogCountry: z.string().optional(),
  contract: z.string().optional(),
  statusPolicy: z.string().optional(),
  idCatalogTypeAssistance: z.string().optional(),
  idCatalogFile: z.string().optional(),
  idCatalogDiagnostic: z.string().optional(),
  idCatalogSinisterCode: z.string().optional(),
  idCatalogServiceCode: z.string().optional(),
  idCatalogProblem: z.string().optional(),
  idCatalogSecondCall: z.string().optional(),
  idCatalogTransfer: z.string().optional(),
  idCatalogAssignmentType: z.string().optional(),
  idCatalogServiceCondition: z.string().optional(),
  latitudeOrigin: z.number().optional(),
  lengthOrigin: z.number().optional(),
  addressOrigin: z.string().optional(),
  idCityCallOrigin: z.string().optional(),
  cityCallOrigin: z.string().optional(),
  stateCallOrigin: z.string().optional(),
  latitudeDestiny: z.number().optional(),
  lengthDestiny: z.number().optional(),
  addressDestiny: z.string().optional(),
  idCityCallDestiny: z.string().optional(),
  stateCallDestiny: z.string().optional(),
  idStateCallDestiny: z.string().optional(),
  carBrand: z.string().optional(),
  carModel: z.string().optional(),
  carYear: z.string().optional(),
  carColor: z.string().optional(),
});

const handleError = (error: unknown, res: Parameters<RequestHandler>[1]) => {
  if (error instanceof SiaConfigurationError) {
    res.status(500).json({ message: error.message });
    return;
  }

  if (error instanceof SiaRequestError) {
    res.status(error.status || 502).json({ message: error.message, details: error.body });
    return;
  }

  console.error("Unexpected SIA integration error", error);
  res.status(500).json({ message: "Unexpected SIA integration error" });
};

export const handleSiaFileGet: RequestHandler = async (req, res) => {
  const parseResult = fileGetSchema.safeParse(req.body);

  if (!parseResult.success) {
    res.status(400).json({ message: "Invalid request payload", errors: parseResult.error.flatten() });
    return;
  }

  try {
    const data = await getSiaFiles(parseResult.data as SiaFileGetRequest);
    res.json(data);
  } catch (error) {
    handleError(error, res);
  }
};

export const handleSiaFileAdd: RequestHandler = async (req, res) => {
  const parseResult = fileAddSchema.safeParse(req.body);

  if (!parseResult.success) {
    res.status(400).json({ message: "Invalid request payload", errors: parseResult.error.flatten() });
    return;
  }

  try {
    const response = await addSiaFile(parseResult.data as SiaFileAddRequest);
    res.json(response);
  } catch (error) {
    handleError(error, res);
  }
};
