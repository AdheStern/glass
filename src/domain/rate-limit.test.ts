import { describe, expect, it } from "vitest";
import { type Bucket, fixedWindow } from "./rate-limit";

describe("fixedWindow (§21)", () => {
  it("abre una ventana nueva y cuenta", () => {
    const r = fixedWindow(undefined, 1000, 3, 60_000);
    expect(r.allowed).toBe(true);
    expect(r.bucket).toEqual({ count: 1, resetAt: 61_000 });
  });

  it("permite hasta el límite y luego bloquea", () => {
    let b: Bucket | undefined;
    const seen: boolean[] = [];
    for (let i = 0; i < 5; i++) {
      const r = fixedWindow(b, 1000, 3, 60_000);
      b = r.bucket;
      seen.push(r.allowed);
    }
    expect(seen).toEqual([true, true, true, false, false]);
  });

  it("reinicia al expirar la ventana", () => {
    const full: Bucket = { count: 3, resetAt: 61_000 };
    expect(fixedWindow(full, 60_000, 3, 60_000).allowed).toBe(false);
    expect(fixedWindow(full, 61_000, 3, 60_000).allowed).toBe(true);
  });

  it("informa cuánto esperar", () => {
    const full: Bucket = { count: 10, resetAt: 30_000 };
    expect(fixedWindow(full, 5_000, 3, 60_000).retryAfterMs).toBe(25_000);
  });
});
