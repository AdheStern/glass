// Glass — aplica todos los prisma/sql/*.sql en orden (idempotentes).
import { execSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { join } from "node:path";

const dir = "prisma/sql";
const files = readdirSync(dir)
  .filter((f) => f.endsWith(".sql"))
  .sort();

for (const file of files) {
  console.log(`glass/sql: aplicando ${file}`);
  execSync(
    `pnpm exec prisma db execute --file "${join(dir, file)}" --schema prisma/schema.prisma`,
    { stdio: "inherit" },
  );
}
