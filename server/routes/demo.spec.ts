import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { createServer } from "../index";

const ORIGIN_HEADER = "https://example.com";

describe("GET /api/demo", () => {
  const app = createServer();
  let server: Server | undefined;
  let baseUrl = "";

  beforeAll(async () => {
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const address = server?.address() as AddressInfo | null;
        if (!address) {
          throw new Error("Failed to retrieve server address");
        }
        baseUrl = `http://127.0.0.1:${address.port}`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
      if (!server) {
        resolve();
        return;
      }

      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
  });

  it("returns a public demo payload with permissive CORS headers", async () => {
    const response = await fetch(`${baseUrl}/api/demo`, {
      headers: {
        Origin: ORIGIN_HEADER,
      },
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("access-control-allow-origin")).toBe("*");

    const body = await response.json();
    expect(body).toEqual({ message: "Hello from Express server" });
  });
});
