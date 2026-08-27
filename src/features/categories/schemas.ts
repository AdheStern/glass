import { z } from "zod";
import { slugify } from "@/features/products/schemas";

export const CategoryInputSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(2, "El nombre es obligatorio").max(80),
  parentId: z.string().nullable().optional(),
});

export type CategoryInput = z.input<typeof CategoryInputSchema>;

export { slugify };
