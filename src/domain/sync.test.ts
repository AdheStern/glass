import { describe, expect, it } from "vitest";
import {
  applyAcks,
  localStockView,
  nextSeq,
  packageStatus,
  pendingCommands,
  planBatch,
  type SyncCommand,
  validateQueue,
} from "./sync";

function cmd(seq: number, clientId = `c${seq}`): SyncCommand {
  return {
    clientId,
    deviceId: "dev-1",
    seq,
    kind: "SALE",
    occurredAtDevice: "2026-08-28T10:00:00.000Z",
    payload: {},
  };
}

describe("nextSeq", () => {
  it("arranca en 1 y avanza de a uno", () => {
    expect(nextSeq(0)).toBe(1);
    expect(nextSeq(41)).toBe(42);
  });
});

describe("planBatch (§17.2 regla 3)", () => {
  it("aplica en orden desde el último seq aplicado", () => {
    const plan = planBatch([cmd(43), cmd(41), cmd(42)], 40);
    expect(plan.toApply.map((c) => c.seq)).toEqual([41, 42, 43]);
    expect(plan.gapAt).toBeUndefined();
  });

  it("re-acusa los ya aplicados sin volver a aplicarlos (reenvío tras red cortada)", () => {
    // CANON-02 11:02: la tablet reenvía [41, 42] ya aplicados.
    const plan = planBatch([cmd(41), cmd(42)], 42);
    expect(plan.alreadyApplied).toEqual([41, 42]);
    expect(plan.toApply).toEqual([]);
  });

  it("mezcla: 41-42 ya aplicados, 43-44 nuevos", () => {
    const plan = planBatch([cmd(41), cmd(42), cmd(43), cmd(44)], 42);
    expect(plan.alreadyApplied).toEqual([41, 42]);
    expect(plan.toApply.map((c) => c.seq)).toEqual([43, 44]);
  });

  it("rechaza un hueco y dice qué seq espera", () => {
    const plan = planBatch([cmd(41), cmd(43)], 40);
    expect(plan.toApply.map((c) => c.seq)).toEqual([41]);
    expect(plan.gapAt).toBe(42);
  });

  it("detecta un seq duplicado en el lote", () => {
    const plan = planBatch([cmd(41, "a"), cmd(41, "b")], 40);
    expect(plan.duplicateSeq).toBe(41);
  });
});

describe("validateQueue", () => {
  it("acepta una cola contigua", () => {
    expect(validateQueue([cmd(1), cmd(2), cmd(3)])).toEqual({ ok: true });
  });
  it("rechaza huecos y repetidos", () => {
    expect(validateQueue([cmd(1), cmd(3)])).toEqual({
      ok: false,
      reason: "gap",
      at: 2,
    });
    expect(validateQueue([cmd(1, "a"), cmd(1, "b")])).toEqual({
      ok: false,
      reason: "duplicate",
      at: 1,
    });
  });
});

describe("pendingCommands / applyAcks", () => {
  it("descarta lo ya acusado y mantiene el orden", () => {
    const queue = [cmd(3), cmd(1), cmd(2)];
    expect(pendingCommands(queue, ["c1"]).map((c) => c.seq)).toEqual([2, 3]);
    expect(applyAcks(queue, [{ clientId: "c1" }, { clientId: "c2" }])).toEqual([
      queue[0],
    ]);
  });
});

describe("packageStatus (§17.2 regla 6)", () => {
  const base = Date.UTC(2026, 7, 28, 10, 0, 0);
  const h = 3_600_000;
  it("ok bajo 24 h, warn desde 24 h, blocked desde 72 h", () => {
    expect(packageStatus(base, base + 1 * h)).toBe("ok");
    expect(packageStatus(base, base + 23 * h)).toBe("ok");
    expect(packageStatus(base, base + 24 * h)).toBe("warn");
    expect(packageStatus(base, base + 71 * h)).toBe("warn");
    expect(packageStatus(base, base + 72 * h)).toBe("blocked");
  });
  it("respeta umbrales configurados", () => {
    expect(packageStatus(base, base + 5 * h, 4, 8)).toBe("warn");
    expect(packageStatus(base, base + 9 * h, 4, 8)).toBe("blocked");
  });
});

describe("localStockView (CANON-02)", () => {
  it("referencia 4 − 3 − 2 = −1, se permite", () => {
    expect(localStockView(4, 5)).toBe(-1);
    expect(localStockView(4, 3)).toBe(1);
  });
});
