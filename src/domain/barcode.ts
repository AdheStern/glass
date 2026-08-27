// Glass — códigos de barras (§15). Puro: sin DOM, sin canvas. Devuelve anchos de
// barra en módulos para que la capa de dibujo (PDF/SVG) los rasterice.

export interface Barcode {
  /** Anchos de trazo alternando barra/espacio, empezando por barra. En módulos. */
  bars: number[];
  /** Suma de `bars`: ancho total del símbolo en módulos (sin zona muda). */
  modules: number;
  /** Texto legible a imprimir bajo las barras. */
  text: string;
}

// ---------------------------------------------------------------------------
// Code 128 (juego B) — cubre los códigos internos VIT-… y cualquier alfanumérico
// ---------------------------------------------------------------------------

// Patrones oficiales, índice = valor. Cada uno son 6 anchos (barra,espacio,…);
// el 106 (Stop) trae 7. Total 11 módulos por símbolo (13 el Stop).
const C128_PATTERNS = [
  "212222",
  "222122",
  "222221",
  "121223",
  "121322",
  "131222",
  "122213",
  "122312",
  "132212",
  "221213",
  "221312",
  "231212",
  "112232",
  "122132",
  "122231",
  "113222",
  "123122",
  "123221",
  "223211",
  "221132",
  "221231",
  "213212",
  "223112",
  "312131",
  "311222",
  "321122",
  "321221",
  "312212",
  "322112",
  "322211",
  "212123",
  "212321",
  "232121",
  "111323",
  "131123",
  "131321",
  "112313",
  "132113",
  "132311",
  "211313",
  "231113",
  "231311",
  "112133",
  "112331",
  "132131",
  "113123",
  "113321",
  "133121",
  "313121",
  "211331",
  "231131",
  "213113",
  "213311",
  "213131",
  "311123",
  "311321",
  "331121",
  "312113",
  "312311",
  "332111",
  "314111",
  "221411",
  "431111",
  "111224",
  "111422",
  "121124",
  "121421",
  "141122",
  "141221",
  "112214",
  "112412",
  "122114",
  "122411",
  "142112",
  "142211",
  "241211",
  "221114",
  "413111",
  "241112",
  "134111",
  "111242",
  "121142",
  "121241",
  "114212",
  "124112",
  "124211",
  "411212",
  "421112",
  "421211",
  "212141",
  "214121",
  "412121",
  "111143",
  "111341",
  "131141",
  "114113",
  "114311",
  "411113",
  "411311",
  "113141",
  "114131",
  "311141",
  "411131",
  "211412",
  "211214",
  "211232",
  "2331112",
];

const C128_START_B = 104;
const C128_STOP = 106;

/** Índice de un carácter ASCII 32-126 en el juego B. */
function code128BValue(ch: string): number {
  const code = ch.charCodeAt(0);
  if (code < 32 || code > 126) {
    throw new Error(
      `code128: carácter fuera del juego B: ${JSON.stringify(ch)}`,
    );
  }
  return code - 32;
}

export function code128(value: string): Barcode {
  if (value.length === 0) throw new Error("code128: cadena vacía");

  const values = [C128_START_B, ...[...value].map(code128BValue)];
  let checksum = C128_START_B;
  for (let i = 1; i < values.length; i++) checksum += values[i] * i;
  checksum %= 103;
  values.push(checksum, C128_STOP);

  const bars = values.flatMap((v) =>
    [...C128_PATTERNS[v]].map((d) => Number(d)),
  );
  return {
    bars,
    modules: bars.reduce((a, b) => a + b, 0),
    text: value,
  };
}

// ---------------------------------------------------------------------------
// EAN-13 — para reimprimir códigos de fábrica
// ---------------------------------------------------------------------------

const EAN_L = [
  "0001101",
  "0011001",
  "0010011",
  "0111101",
  "0100011",
  "0110001",
  "0101111",
  "0111011",
  "0110111",
  "0001011",
];
const EAN_G = [
  "0100111",
  "0110011",
  "0011011",
  "0100001",
  "0011101",
  "0111001",
  "0000101",
  "0010001",
  "0001001",
  "0010111",
];
const EAN_R = [
  "1110010",
  "1100110",
  "1101100",
  "1000010",
  "1011100",
  "1001110",
  "1010000",
  "1000100",
  "1001000",
  "1110100",
];
// Paridad de los 6 dígitos izquierdos según el primer dígito.
const EAN_PARITY = [
  "LLLLLL",
  "LLGLGG",
  "LLGGLG",
  "LLGGGL",
  "LGLLGG",
  "LGGLLG",
  "LGGGLL",
  "LGLGLG",
  "LGLGGL",
  "LGGLGL",
];

/** Dígito de control EAN-13 sobre los primeros 12 dígitos. */
export function ean13CheckDigit(twelve: string): number {
  if (!/^\d{12}$/.test(twelve)) {
    throw new Error("ean13: se esperan 12 dígitos");
  }
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += Number(twelve[i]) * (i % 2 === 0 ? 1 : 3);
  }
  return (10 - (sum % 10)) % 10;
}

function bitsToRuns(bits: string): number[] {
  const runs: number[] = [];
  let current = bits[0];
  let count = 0;
  for (const b of bits) {
    if (b === current) {
      count++;
    } else {
      runs.push(count);
      current = b;
      count = 1;
    }
  }
  runs.push(count);
  return runs;
}

export function ean13(value: string): Barcode {
  const digits = value.replace(/\D/g, "");
  let full: string;
  if (digits.length === 12) {
    full = digits + ean13CheckDigit(digits);
  } else if (digits.length === 13) {
    if (ean13CheckDigit(digits.slice(0, 12)) !== Number(digits[12])) {
      throw new Error(`ean13: dígito de control inválido en ${digits}`);
    }
    full = digits;
  } else {
    throw new Error("ean13: se esperan 12 o 13 dígitos");
  }

  const first = Number(full[0]);
  const parity = EAN_PARITY[first];
  let bits = "101"; // guarda inicial
  for (let i = 0; i < 6; i++) {
    const d = Number(full[1 + i]);
    bits += parity[i] === "L" ? EAN_L[d] : EAN_G[d];
  }
  bits += "01010"; // guarda central
  for (let i = 0; i < 6; i++) {
    bits += EAN_R[Number(full[7 + i])];
  }
  bits += "101"; // guarda final

  const bars = bitsToRuns(bits);
  return {
    bars,
    modules: bars.reduce((a, b) => a + b, 0),
    text: full,
  };
}

// ---------------------------------------------------------------------------
// Código interno para variantes sin código de fábrica (§15.2)
// ---------------------------------------------------------------------------

/** `VIT-{base36}` en mayúsculas. `seed` numérico o texto arbitrario. */
export function internalBarcode(seed: number | string): string {
  const n =
    typeof seed === "number"
      ? Math.floor(Math.abs(seed))
      : [...seed].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
  return `VIT-${n.toString(36).toUpperCase()}`;
}

// ---------------------------------------------------------------------------
// Lector HID (§15.1): distinguir una ráfaga de escáner del tipeo humano
// ---------------------------------------------------------------------------

/**
 * `true` si la secuencia de intervalos entre pulsaciones (ms) parece un lector
 * HID: al menos 3 intervalos y todos por debajo del umbral (30 ms por defecto).
 */
export function isHidBurst(
  intervalsMs: readonly number[],
  thresholdMs = 30,
): boolean {
  return (
    intervalsMs.length >= 3 &&
    intervalsMs.every((ms) => ms >= 0 && ms < thresholdMs)
  );
}
