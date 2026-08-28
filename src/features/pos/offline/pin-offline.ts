"use client";
// Glass — verificación del PIN sin conexión (§6.4, §17.3). Los hashes argon2id de
// los operadores activos viajan en el paquete; acá se validan en el navegador
// con la misma función que el servidor.
import { argon2Verify } from "hash-wasm";
import type { OperatorRow } from "./db";
import { posDb } from "./db";

export async function verifyPinOffline(
  pinHash: string,
  pin: string,
): Promise<boolean> {
  try {
    return await argon2Verify({ password: pin, hash: pinHash });
  } catch {
    return false;
  }
}

export async function getOperatorsOffline(): Promise<OperatorRow[]> {
  return posDb().operators.toArray();
}

/** Autorización del jefe sin conexión (§6.4): un PIN de rol superior. */
export async function findAuthorizerOffline(
  pin: string,
  roles: string[],
): Promise<OperatorRow | null> {
  const operators = await getOperatorsOffline();
  for (const op of operators) {
    if (roles.includes(op.role) && (await verifyPinOffline(op.pinHash, pin))) {
      return op;
    }
  }
  return null;
}

/** Verifica el PIN de un operador puntual (abrir turno, re-pedido por inactividad). */
export async function verifyOperatorPinOffline(
  operatorId: string,
  pin: string,
): Promise<boolean> {
  const op = await posDb().operators.get(operatorId);
  if (!op) return false;
  return verifyPinOffline(op.pinHash, pin);
}
