import { describe, expect, it } from "vitest";
import { shouldRegisterWorker } from "./pwa";

describe("offline registration guards", () => {
  it("never registers inside development, preview, or an iframe", () => {
    expect(shouldRegisterWorker(false, "localhost", false, "")).toBe(false);
    for (const host of [
      "id-preview--demo.example.com",
      "preview--demo.example.com",
      "ID-PREVIEW--DEMO.EXAMPLE.COM",
      "project--demo-dev.example.com",
    ]) {
      expect(shouldRegisterWorker(true, host, false, "")).toBe(false);
    }
    expect(shouldRegisterWorker(true, "ahumados.example", true, "")).toBe(false);
  });

  it("supports the explicit kill switch without blocking unrelated queries", () => {
    expect(shouldRegisterWorker(true, "ahumados.example", false, "?sw=off")).toBe(false);
    expect(shouldRegisterWorker(true, "ahumados.example", false, "?nuevo=true")).toBe(true);
    expect(shouldRegisterWorker(true, "shop.example.com", false, "")).toBe(true);
  });
});
