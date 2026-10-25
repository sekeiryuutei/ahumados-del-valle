import { describe, expect, it } from "vitest";
import { shouldRegisterWorker } from "./pwa";
describe("offline registration guards", () => {
  it("never registers inside development, preview, or an iframe", () => {
    expect(shouldRegisterWorker(false, "localhost", false, "")).toBe(false);
    for (const host of ["id-preview--demo.lovable.app", "preview--demo.lovable.app", "ID-PREVIEW--DEMO.LOVABLE.APP", "id-preview-v2--demo.gpt-eng.com", "preview-workspace--demo.gptengineer.run", "project--demo-dev.lovable.app", "demo.lovableproject.com", "lovableproject-dev.com", "beta.lovable.dev"]) expect(shouldRegisterWorker(true, host, false, "")).toBe(false);
    expect(shouldRegisterWorker(true, "ahumados.example", true, "")).toBe(false);
  });
  it("supports the explicit kill switch without blocking unrelated queries", () => {
    expect(shouldRegisterWorker(true, "ahumados.example", false, "?sw=off")).toBe(false);
    expect(shouldRegisterWorker(true, "ahumados.example", false, "?nuevo=true")).toBe(true);
    expect(shouldRegisterWorker(true, "preview-v2--shop.example.com", false, "")).toBe(true);
  });
});