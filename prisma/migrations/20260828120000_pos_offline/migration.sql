-- CreateEnum: estado de un comando sincronizado (§17.5, cuarentena)
CREATE TYPE "SyncCommandStatus" AS ENUM ('APPLIED', 'QUARANTINED', 'REJECTED');

-- AlterTable: device — orden por dispositivo y cuarentena (§17.2 reglas 3 y 6)
ALTER TABLE "device"
  ADD COLUMN "last_applied_seq" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "quarantined_at" TIMESTAMP(3);

-- AlterTable: site_settings — caducidad del paquete (§17.2 regla 6)
ALTER TABLE "site_settings"
  ADD COLUMN "package_warn_hours" INTEGER NOT NULL DEFAULT 24,
  ADD COLUMN "package_block_hours" INTEGER NOT NULL DEFAULT 72;

-- AlterTable: cash_movement — idempotencia del comando de la cola (§17.2 regla 2)
ALTER TABLE "cash_movement" ADD COLUMN "client_id" TEXT;
CREATE UNIQUE INDEX "cash_movement_client_id_key" ON "cash_movement"("client_id");

-- CreateTable: sync_command — libro de comandos recibidos por lote (§17.1)
CREATE TABLE "sync_command" (
  "id" TEXT NOT NULL,
  "device_id" TEXT NOT NULL,
  "seq" INTEGER NOT NULL,
  "kind" TEXT NOT NULL,
  "client_id" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "status" "SyncCommandStatus" NOT NULL DEFAULT 'APPLIED',
  "error" TEXT,
  "occurred_at_device" TIMESTAMP(3) NOT NULL,
  "received_at_server" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "sync_command_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "sync_command_client_id_key" ON "sync_command"("client_id");
CREATE UNIQUE INDEX "sync_command_device_id_seq_key" ON "sync_command"("device_id", "seq");
CREATE INDEX "sync_command_status_idx" ON "sync_command"("status");

ALTER TABLE "sync_command"
  ADD CONSTRAINT "sync_command_device_id_fkey"
  FOREIGN KEY ("device_id") REFERENCES "device"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
