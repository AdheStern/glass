import "server-only";
// Glass — aplicación de un lote de comandos sin conexión (§17.2). Idempotente por
// `clientId`, en orden estricto por `seq`, con cuarentena para dispositivos
// revocados. La venta cobrada nunca se rechaza.
import { revalidateTag } from "next/cache";
import { prisma } from "@/db/client";
import { planBatch } from "@/domain/sync";
import { applyCommand, type CommandAck } from "./sync-apply";
import { buildFreshPackage, type FreshPackage } from "./sync-package";
import { SyncBatchSchema, type SyncCommandDto } from "./sync-schemas";

export interface BatchResponse {
  status: number;
  body: {
    acks?: CommandAck[];
    alerts?: { variantId: string; name: string; onHand: number }[];
    package?: FreshPackage;
    gapAt?: number;
    quarantined?: boolean;
    error?: string;
    seq?: number;
  };
}

async function quarantine(deviceId: string, commands: SyncCommandDto[]) {
  for (const cmd of commands) {
    await prisma.syncCommand.upsert({
      where: { clientId: cmd.clientId },
      create: {
        deviceId,
        seq: cmd.seq,
        kind: cmd.kind,
        clientId: cmd.clientId,
        payload: cmd.payload as object,
        occurredAtDevice: new Date(cmd.occurredAtDevice),
        status: "QUARANTINED",
      },
      update: { status: "QUARANTINED" },
    });
  }
}

async function recordCommand(
  deviceId: string,
  cmd: SyncCommandDto,
  status: "APPLIED" | "REJECTED",
  error: string | null,
) {
  await prisma.syncCommand.upsert({
    where: { clientId: cmd.clientId },
    create: {
      deviceId,
      seq: cmd.seq,
      kind: cmd.kind,
      clientId: cmd.clientId,
      payload: cmd.payload as object,
      occurredAtDevice: new Date(cmd.occurredAtDevice),
      status,
      error,
    },
    update: { status, error },
  });
}

async function reAck(deviceId: string, seqs: number[]): Promise<CommandAck[]> {
  if (seqs.length === 0) return [];
  const cmds = await prisma.syncCommand.findMany({
    where: { deviceId, seq: { in: seqs } },
    select: { clientId: true, seq: true, kind: true },
  });
  const saleClientIds = cmds
    .filter((c) => c.kind === "SALE")
    .map((c) => c.clientId);
  const sales = saleClientIds.length
    ? await prisma.sale.findMany({
        where: { clientSaleId: { in: saleClientIds } },
        select: { id: true, folio: true, clientSaleId: true },
      })
    : [];
  const byClient = new Map(sales.map((s) => [s.clientSaleId, s]));
  return cmds.map((c) => {
    const s = byClient.get(c.clientId);
    return {
      clientId: c.clientId,
      seq: c.seq,
      folio: s?.folio ?? null,
      serverId: s?.id ?? "",
    };
  });
}

async function resolveAlerts(variantIds: string[]) {
  const rows = await prisma.variantStock.findMany({
    where: { variantId: { in: variantIds }, qty: { lt: 0 } },
    select: {
      variantId: true,
      qty: true,
      variant: { select: { product: { select: { name: true } } } },
    },
  });
  return rows.map((r) => ({
    variantId: r.variantId,
    name: r.variant.product.name,
    onHand: r.qty,
  }));
}

export async function runBatch(
  token: string,
  rawBody: unknown,
): Promise<BatchResponse> {
  const device = token
    ? await prisma.device.findUnique({ where: { token } })
    : null;
  if (!device) {
    return { status: 401, body: { error: "dispositivo no reconocido" } };
  }

  const parsed = SyncBatchSchema.safeParse(rawBody);
  if (!parsed.success) {
    return { status: 400, body: { error: "lote inválido" } };
  }
  const commands = parsed.data.commands;

  if (device.revokedAt) {
    await quarantine(device.id, commands);
    return { status: 200, body: { quarantined: true } };
  }

  const plan = planBatch(commands, device.lastAppliedSeq);
  if (plan.duplicateSeq != null) {
    return {
      status: 409,
      body: { error: "duplicate", seq: plan.duplicateSeq },
    };
  }

  const acks: CommandAck[] = [...(await reAck(device.id, plan.alreadyApplied))];
  const negatives = new Set<string>();
  let lastSeq = device.lastAppliedSeq;

  for (const cmd of plan.toApply) {
    const outcome = await applyCommand(device, cmd);
    if (!outcome.ok) {
      await recordCommand(device.id, cmd, "REJECTED", outcome.error);
      break; // el orden importa: no se salta un comando
    }
    await recordCommand(device.id, cmd, "APPLIED", null);
    acks.push(outcome.ack);
    for (const v of outcome.negativeVariantIds ?? []) negatives.add(v);
    lastSeq = cmd.seq;
  }

  await prisma.device.update({
    where: { id: device.id },
    data: {
      lastSyncAt: new Date(),
      ...(lastSeq !== device.lastAppliedSeq ? { lastAppliedSeq: lastSeq } : {}),
    },
  });
  if (lastSeq !== device.lastAppliedSeq) revalidateTag("catalog", "max");

  return {
    status: 200,
    body: {
      acks,
      alerts: negatives.size ? await resolveAlerts([...negatives]) : [],
      package: await buildFreshPackage(),
      gapAt: plan.gapAt,
    },
  };
}
