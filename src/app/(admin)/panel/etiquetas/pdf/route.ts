// Glass — descarga del PDF de etiquetas por lote (§15.2).
import { AuthError, INVENTORY_ROLES, requireRole } from "@/features/auth/roles";
import { buildLabelsPdf, type LabelSize } from "@/features/labels/pdf";
import { getLabelData } from "@/features/labels/queries";

export async function GET(request: Request) {
  try {
    await requireRole(...INVENTORY_ROLES);
  } catch (e) {
    if (e instanceof AuthError) {
      return new Response("No autorizado", { status: 401 });
    }
    throw e;
  }

  const { searchParams } = new URL(request.url);
  const ids = (searchParams.get("ids") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const size: LabelSize =
    searchParams.get("size") === "38x19" ? "38x19" : "50x25";

  if (ids.length === 0) {
    return new Response("Sin variantes seleccionadas", { status: 400 });
  }

  const labels = await getLabelData(ids);
  if (labels.length === 0) {
    return new Response(
      "Las variantes elegidas no tienen código. Generá los códigos internos primero.",
      { status: 409 },
    );
  }

  const bytes = await buildLabelsPdf(labels, size);
  return new Response(bytes as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="etiquetas-${size}.pdf"`,
    },
  });
}
