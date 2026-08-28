"use client";
// Estado local del POS: token de dispositivo y operador del turno, en
// localStorage. En Fase 6 esto convive con el paquete de Dexie.

const DEVICE_KEY = "glass.pos.device";
const OPERATOR_KEY = "glass.pos.operator";

export interface DeviceSession {
  token: string;
  deviceId: string;
  name: string;
}

export interface OperatorSession {
  sessionId: string;
  operatorId: string;
  operatorName: string;
  since: number;
}

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // modo privado o storage lleno: el POS sigue en memoria hasta recargar
  }
}

export const posDevice = {
  get: () => read<DeviceSession>(DEVICE_KEY),
  set: (d: DeviceSession) => write(DEVICE_KEY, d),
  clear: () => {
    try {
      localStorage.removeItem(DEVICE_KEY);
      localStorage.removeItem(OPERATOR_KEY);
    } catch {}
  },
};

export const posOperator = {
  get: () => read<OperatorSession>(OPERATOR_KEY),
  set: (o: OperatorSession) => write(OPERATOR_KEY, o),
  clear: () => {
    try {
      localStorage.removeItem(OPERATOR_KEY);
    } catch {}
  },
};

/** Minutos de inactividad tras los que se vuelve a pedir el PIN (§6.2). */
export const INACTIVITY_MIN = 5;
