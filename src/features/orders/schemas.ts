import { z } from "zod";

export const CreateOrderSchema = z.object({
  items: z
    .array(
      z.object({
        variantId: z.string().min(1),
        qty: z.number().int().min(1).max(999),
        note: z.string().trim().max(280).optional(),
      }),
    )
    .min(1, "El carrito está vacío")
    .max(80),
  customerName: z.string().trim().max(120).optional().or(z.literal("")),
  customerPhone: z.string().trim().max(30).optional().or(z.literal("")),
  note: z.string().trim().max(500).optional().or(z.literal("")),
  whatsappLabel: z.string().trim().max(40).optional(),
  source: z.string().trim().max(120).optional(),
});

export type CreateOrderInput = z.input<typeof CreateOrderSchema>;

export const ORDER_STATUS_FLOW = [
  "NUEVO",
  "CONFIRMADO",
  "PREPARADO",
  "ENTREGADO",
] as const;
export type OrderStatus = (typeof ORDER_STATUS_FLOW)[number] | "CANCELADO";

export const STATUS_LABEL: Record<OrderStatus, string> = {
  NUEVO: "Nuevo",
  CONFIRMADO: "Confirmado",
  PREPARADO: "Preparado",
  ENTREGADO: "Entregado",
  CANCELADO: "Cancelado",
};
