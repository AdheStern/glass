// Glass — forma y política del PIN de operador (§6.2). Puro.
// El hash argon2id se hace en el borde servidor, nunca aquí.

export const PIN_LENGTH = 4;
export const MAX_PIN_ATTEMPTS = 5;

const PIN_SHAPE = new RegExp(`^\\d{${PIN_LENGTH}}$`);

export function isValidPinShape(pin: string): boolean {
  return PIN_SHAPE.test(pin);
}

/**
 * Segundos de bloqueo tras `attempts` fallos consecutivos (bloqueo progresivo).
 * 0 mientras no se alcanza el máximo; luego 30s, 60s, 120s, 240s, tope 300s.
 */
export function lockoutSeconds(attempts: number): number {
  if (attempts < MAX_PIN_ATTEMPTS) return 0;
  const over = attempts - MAX_PIN_ATTEMPTS;
  return Math.min(300, 30 * 2 ** over);
}

export function isLocked(attempts: number): boolean {
  return lockoutSeconds(attempts) > 0;
}
