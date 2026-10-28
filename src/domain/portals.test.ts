import { describe, expect, it } from "vitest";
import { employeeRoles, matchesPortal, roleHomes } from "./portals";

describe("portales por oficio", () => {
  it("separa el ingreso de inquilinos del ahumadero", () => {
    expect(matchesPortal("inquilino", "ahumadero")).toBe(false);
    expect(matchesPortal("admin", "inquilino")).toBe(false);
    expect(matchesPortal("inquilino", "inquilino")).toBe(true);
  });
  it("vendedor y conductor de ruta comparten un único cargo", () => {
    expect(employeeRoles.filter((role) => role === "ruta")).toHaveLength(1);
    expect(roleHomes.ruta).toBe("/ruta");
  });
  it("cada oficio tiene un panel distinto", () => {
    expect(new Set(employeeRoles.map((role) => roleHomes[role])).size).toBe(6);
    expect(roleHomes.recepcion).toBe("/recepcion");
    expect(roleHomes.contador).toBe("/contador");
    expect(roleHomes.vendedor).toBe("/galeria");
    expect(roleHomes.planta).toBe("/planta");
  });
});
