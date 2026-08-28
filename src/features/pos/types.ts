// Glass — tipos compartidos del POS (sin `server-only`: los usan también los
// componentes cliente).

export interface PosProduct {
  variantId: string;
  productName: string;
  variantLabel: string | null;
  basePriceBob: number;
  effectiveBob: number;
  stockQty: number;
}

export interface PosOrderItem {
  variantId: string;
  productName: string;
  variantLabel: string | null;
  qty: number;
  basePriceBob: number;
  effectiveBob: number;
}

export interface PosOrderLookup {
  id: string;
  folio: string;
  status: string;
  items: PosOrderItem[];
}

export interface PosBootstrap {
  device: { id: string; name: string };
  operators: { id: string; name: string; role: string }[];
  paymentMethods: { id: string; label: string; countsInDrawer: boolean }[];
  categories: { id: string; name: string }[];
  openSession: {
    id: string;
    operatorId: string;
    operatorName: string;
    openedAt: Date;
    openingBob: number;
  } | null;
  settings: {
    name: string;
    roundingMode: string;
    maxCashierDiscountPercent: number;
    cashDifferenceThresholdBob: number;
  };
  topSellers: PosProduct[];
}

export interface SessionSummary {
  id: string;
  operatorName: string;
  openedAt: Date;
  closedAt: Date | null;
  openingBob: number;
  countedBob: number | null;
  expectedBob: number;
  differenceBob: number | null;
  saleCount: number;
  voidedCount: number;
  byMethod: { label: string; countsInDrawer: boolean; totalBob: number }[];
  movements: {
    kind: string;
    amountBob: number;
    reason: string | null;
    occurredAt: Date;
  }[];
}
