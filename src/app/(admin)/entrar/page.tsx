import type { Metadata } from "next";
import { Suspense } from "react";
import { prisma } from "@/db/client";
import { LoginForm } from "@/features/auth/components/login-form";

export const metadata: Metadata = { title: "Entrar", robots: { index: false } };
export const instant = false;

export default async function EntrarPage() {
  const hasUsers = (await prisma.user.count().catch(() => 1)) > 0;
  return (
    <main className="flex min-h-svh items-center justify-center bg-muted/40 p-6">
      <Suspense>
        <LoginForm hasUsers={hasUsers} />
      </Suspense>
    </main>
  );
}
