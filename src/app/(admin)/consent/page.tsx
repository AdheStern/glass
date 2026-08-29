import type { Metadata } from "next";
import { Suspense } from "react";
import { ConsentForm } from "@/features/auth/components/consent-form";

export const metadata: Metadata = {
  title: "Autorizar acceso",
  robots: { index: false },
};
export const instant = false;

export default function ConsentPage() {
  return (
    <main className="flex min-h-svh items-center justify-center bg-muted/40 p-6">
      <Suspense>
        <ConsentForm />
      </Suspense>
    </main>
  );
}
