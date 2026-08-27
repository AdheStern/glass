# Escáner (§15)

Módulo reutilizable: inventario (Fase 4) y POS (Fase 5) montan el mismo `<ScanField>`.
**Nunca se importa desde `src/app/(shop)` ni `src/features/catalog`** — biome lo prohíbe.

## Piezas

| Archivo | Qué hace |
|---|---|
| `use-hid-scanner.ts` | Escucha `keydown` global. Un lector USB/Bluetooth (HID) teclea en ráfaga y termina en `Enter`; se distingue del humano con `isHidBurst` (dominio, intervalos < 30 ms). |
| `camera-scanner.tsx` | `BarcodeDetector` nativo donde exista; si no, `@zxing/browser` cargado con `import()` diferido. Modo continuo con dedupe de 1,5 s, pitido y `navigator.vibrate`. |
| `scan-field.tsx` | Une tipeo + HID + botón de cámara (en un `<Sheet>`). Un solo `onScan(code)`. |

## Cómo se prueba

- **HID / tipeo**: unitario sobre `isHidBurst` en `src/domain/barcode.test.ts`.
- **E2E**: se simula por teclado (`page.keyboard.type` rápido + `Enter`), como pide §23.1
  recorrido 4. El campo lleva `data-scan-field="true"`.
- **Cámara**: sin automatizar (hardware). Probar a mano en Chrome/Android (nativo) y
  forzar la rama zxing en un navegador sin `BarcodeDetector`.
