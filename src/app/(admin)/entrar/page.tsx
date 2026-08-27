import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "@/features/auth/components/login-form";

export const metadata: Metadata = { title: "Entrar", robots: { index: false } };

export default function EntrarPage() {
  return (
    <main className="flex min-h-svh items-center justify-center bg-muted/40 p-6">
      <Suspense>
        <LoginForm />
      </Suspense>
    </main>
  );
}
