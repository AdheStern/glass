import "server-only";
import { prisma } from "@/db/client";

export async function listRecentImports() {
  const batches = await prisma.importBatch.findMany({
    orderBy: { createdAt: "desc" },
    take: 10,
  });
  const now = Date.now();
  return batches.map((b) => ({
    id: b.id,
    createdAt: b.createdAt,
    rowCount: b.rowCount,
    createdCount: b.createdCount,
    updatedCount: b.updatedCount,
    status: b.status,
    canUndo:
      b.status === "APPLIED" && now - b.createdAt.getTime() < 24 * 3600 * 1000,
  }));
}
