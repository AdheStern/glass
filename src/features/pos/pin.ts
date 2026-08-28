import "server-only";
import { verify } from "@node-rs/argon2";
import type { Operator, Role } from "@prisma/client";
import { prisma } from "@/db/client";
import { isLocked, lockoutSeconds } from "@/domain/pin";
import { PosAuthError } from "./device";

export interface PinResult {
  ok: boolean;
  operator?: Operator;
  lockedSeconds?: number;
  error?: string;
}

/**
 * Valida el PIN de un operador contra su hash argon2id (§6.2). Lleva la cuenta
 * de intentos fallidos y aplica el bloqueo progresivo del dominio.
 */
export async function verifyOperatorPin(
  operatorId: string,
  pin: string,
): Promise<PinResult> {
  const operator = await prisma.operator.findUnique({
    where: { id: operatorId },
  });
  if (!operator || operator.archivedAt) {
    return { ok: false, error: "Operador no encontrado" };
  }

  const lockedUntil = operator.pinLockedUntil?.getTime() ?? 0;
  if (lockedUntil > Date.now()) {
    return {
      ok: false,
      lockedSeconds: Math.ceil((lockedUntil - Date.now()) / 1000),
      error: "PIN bloqueado, esperá",
    };
  }

  const good = await verify(operator.pinHash, pin).catch(() => false);
  if (good) {
    if (operator.pinAttempts !== 0 || operator.pinLockedUntil) {
      await prisma.operator.update({
        where: { id: operator.id },
        data: { pinAttempts: 0, pinLockedUntil: null },
      });
    }
    return { ok: true, operator };
  }

  const attempts = operator.pinAttempts + 1;
  const lock = lockoutSeconds(attempts);
  await prisma.operator.update({
    where: { id: operator.id },
    data: {
      pinAttempts: attempts,
      pinLockedUntil: lock > 0 ? new Date(Date.now() + lock * 1000) : null,
    },
  });
  return {
    ok: false,
    lockedSeconds: isLocked(attempts) ? lock : undefined,
    error: isLocked(attempts)
      ? `Bloqueado ${lock}s por intentos fallidos`
      : "PIN incorrecto",
  };
}

/**
 * Autorización del jefe (§6.4): un PIN que pertenezca a un operador con alguno de
 * los roles permitidos. Devuelve el operador autorizante para `authorizedByOperatorId`.
 */
export async function requireAuthPin(
  pin: string,
  roles: Role[],
): Promise<Operator> {
  const candidates = await prisma.operator.findMany({
    where: { archivedAt: null, role: { in: roles } },
  });
  for (const op of candidates) {
    const lockedUntil = op.pinLockedUntil?.getTime() ?? 0;
    if (lockedUntil > Date.now()) continue;
    if (await verify(op.pinHash, pin).catch(() => false)) return op;
  }
  throw new PosAuthError(
    "Autorización rechazada: PIN de un rol superior inválido",
  );
}
