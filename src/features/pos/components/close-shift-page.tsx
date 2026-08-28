"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { posDevice, posOperator } from "../pos-session";
import { CashMovements } from "./cash-movements";
import { ShiftClose } from "./shift-close";

export function CloseShiftPage() {
  const router = useRouter();
  const [ready, setReady] = useState<{
    token: string;
    sessionId: string;
  } | null>(null);

  useEffect(() => {
    const device = posDevice.get();
    const operator = posOperator.get();
    if (!device || !operator) {
      router.replace("/pos");
      return;
    }
    setReady({ token: device.token, sessionId: operator.sessionId });
  }, [router]);

  if (!ready) return null;

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6 p-6">
      <Button
        variant="ghost"
        size="sm"
        className="self-start"
        onClick={() => router.push("/pos")}
      >
        ← Volver a la venta
      </Button>
      <CashMovements token={ready.token} sessionId={ready.sessionId} />
      <ShiftClose token={ready.token} sessionId={ready.sessionId} />
    </div>
  );
}
