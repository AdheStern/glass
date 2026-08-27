import { describe, expect, it } from "vitest";
import { isLocked, isValidPinShape, lockoutSeconds } from "./pin";

describe("isValidPinShape", () => {
  it("exige exactamente 4 dígitos", () => {
    expect(isValidPinShape("1234")).toBe(true);
    expect(isValidPinShape("12 3")).toBe(false);
    expect(isValidPinShape("123")).toBe(false);
    expect(isValidPinShape("12345")).toBe(false);
    expect(isValidPinShape("abcd")).toBe(false);
  });
});

describe("lockoutSeconds", () => {
  it("no bloquea antes del quinto intento", () => {
    expect(lockoutSeconds(4)).toBe(0);
    expect(isLocked(4)).toBe(false);
  });

  it("bloqueo progresivo con tope de 300s", () => {
    expect(lockoutSeconds(5)).toBe(30);
    expect(lockoutSeconds(6)).toBe(60);
    expect(lockoutSeconds(7)).toBe(120);
    expect(lockoutSeconds(8)).toBe(240);
    expect(lockoutSeconds(9)).toBe(300);
    expect(lockoutSeconds(20)).toBe(300);
  });
});
