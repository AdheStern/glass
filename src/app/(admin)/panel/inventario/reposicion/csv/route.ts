// Glass — lista de reposición exportable como pedido al proveedor (§14.4).
import { AuthError, INVENTORY_ROLES, requireRole } from "@/features/auth/roles";
import { getReorderList } from "@/features/inventory/queries";

function cell(v: string | number): string {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET() {
  try {
    await requireRole(...INVENTORY_ROLES);
  } catch (e) {
    if (e instanceof AuthError)
      return new Response("No autorizado", { status: 401 });
    throw e;
  }

  const rows = await getReorderList();
  const header = ["producto", "sku", "existencia", "minimo", "sugerido"];
  const body = rows.map((r) =>
    [r.productName, r.sku ?? "", r.qty, r.minStock, r.suggestedQty]
      .map(cell)
      .join(","),
  );
  const csv = `${header.join(",")}\n${body.join("\n")}\n`;

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="reposicion.csv"',
    },
  });
}
