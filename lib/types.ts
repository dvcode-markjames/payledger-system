export type Platform = "gcash" | "maya" | "dito";

export type TxType =
  | "cash_in"
  | "cash_out"
  | "maya_cash_in"
  | "maya_cash_out"
  | "load"
  | "bank_transfer"
  | "dito_load"
  | "balance_adjustment";

export const PLATFORM_LABELS: Record<Platform, string> = {
  gcash: "GCash",
  maya: "Maya",
  dito: "DITO",
};

// Tailwind class lookups per platform. Kept as literal strings (not built
// with template interpolation) so Tailwind's content scanner can actually
// find and generate them — see the `content` globs in tailwind.config.ts.
export const PLATFORM_STYLES: Record<
  Platform,
  { text: string; border: string; bg10: string; bg15: string; solidBg: string; focusBorder: string }
> = {
  gcash: {
    text: "text-gcash",
    border: "border-gcash",
    bg10: "bg-gcash/10",
    bg15: "bg-gcash/15",
    solidBg: "bg-gcash",
    focusBorder: "focus:border-gcash",
  },
  maya: {
    text: "text-maya",
    border: "border-maya",
    bg10: "bg-maya/10",
    bg15: "bg-maya/15",
    solidBg: "bg-maya",
    focusBorder: "focus:border-maya",
  },
  dito: {
    text: "text-dito",
    border: "border-dito",
    bg10: "bg-dito/10",
    bg15: "bg-dito/15",
    solidBg: "bg-dito",
    focusBorder: "focus:border-dito",
  },
};

export interface Tier {
  min: number;
  max: number;
  fee: number;
}

export type TxStatus = "pending" | "completed" | "failed";

export interface Transaction {
  id: string;
  created_at: string;
  platform: Platform;
  type: TxType;
  amount: number;
  commission: number;
  commission_included: boolean; // true if commission was netted into net_total instead of charged separately
  net_total: number; // what the customer actually receives / pays
  balance_before: number | null;
  balance_after: number | null;
  reference_no: string | null;
  note: string | null;
  customer_mobile: string | null;
  status: TxStatus;
  note_edited_at?: string | null;
  note_edited_by?: string | null;
}

// Best-effort app deep links. These schemes aren't officially published by
// GCash/Maya and can change, so we always fall back to opening the app's
// web/store link in a new tab if the scheme doesn't launch the app.
export const APP_DEEP_LINKS: Record<Platform, { app: string; fallback: string; label: string }> = {
  gcash: { app: "gcash://", fallback: "https://www.gcash.com/", label: "Open GCash" },
  maya: { app: "maya://", fallback: "https://www.maya.ph/", label: "Open Maya" },
  dito: { app: "dito://", fallback: "https://dito.ph/", label: "Open DITO" },
};

// UNOFFICIAL, reverse-engineered screen deep-link paths, appended after the
// app scheme (e.g. "gcash://" + "send"). Not documented by GCash/Maya, not
// verified against current app builds, and may break or need updating after
// an app update — treat as a best-effort guess, not a supported API.
export const DEEP_LINK_PATHS: Partial<Record<TxType, { gcash?: string; maya?: string; dito?: string }>> = {
  // Guessed "send money" screen path for a bank transfer.
  bank_transfer: { gcash: "send", maya: "send" },
};

export interface AppSettings {
  gcash_tiers: Tier[];
  maya_tiers: Tier[];
  maya_load_fixed_fee: number;
  maya_banktransfer_fixed_fee: number;
  maya_load_tiers: Tier[];
  maya_banktransfer_tiers: Tier[];
  dito_load_fixed_fee: number;
  dito_load_tiers: Tier[];
}

export const DEFAULT_SETTINGS: AppSettings = {
  gcash_tiers: [
    { min: 1, max: 100, fee: 5 },
    { min: 101, max: 500, fee: 10 },
    { min: 501, max: 1000, fee: 15 },
  ],
  maya_tiers: [
    { min: 1, max: 100, fee: 5 },
    { min: 101, max: 500, fee: 10 },
    { min: 501, max: 1000, fee: 15 },
  ],
  maya_load_fixed_fee: 10,
  maya_banktransfer_fixed_fee: 10,
  maya_load_tiers: [{ min: 1, max: 1000, fee: 5 }],
  maya_banktransfer_tiers: [{ min: 1, max: 1000, fee: 0 }],
  dito_load_fixed_fee: 0,
  dito_load_tiers: [{ min: 1, max: 1000, fee: 5 }],
};

export const TX_LABELS: Record<TxType, string> = {
  cash_in: "Cash In",
  cash_out: "Cash Out",
  maya_cash_in: "Cash In (Maya-Maya)",
  maya_cash_out: "Cash Out (Maya-Maya)",
  load: "Load",
  bank_transfer: "Bank Transfer",
  dito_load: "Load",
  balance_adjustment: "Balance Adjustment",
};
