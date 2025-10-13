import { RequestHandler } from "express";
import { NodeVersionResponse } from "@shared/api";

const buildNodeVersion = process.env.BUILD_NODE_VERSION ?? process.version;

export const handleNodeVersion: RequestHandler = (_req, res) => {
  const response: NodeVersionResponse = {
    build: buildNodeVersion,
    runtime: process.version,
  };

  res.json(response);
};
