export type Platform = "gcash" | "maya";

export type TxType =
  | "cash_in"
  | "cash_out"
  | "maya_cash_in"
  | "maya_cash_out"
  | "load"
  | "bank_transfer";

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
};

// UNOFFICIAL, reverse-engineered screen deep-link paths, appended after the
// app scheme (e.g. "gcash://" + "send"). Not documented by GCash/Maya, not
// verified against current app builds, and may break or need updating after
// an app update — treat as a best-effort guess, not a supported API.
export const DEEP_LINK_PATHS: Partial<Record<TxType, { gcash?: string; maya?: string }>> = {
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
};

export const TX_LABELS: Record<TxType, string> = {
  cash_in: "Cash In",
  cash_out: "Cash Out",
  maya_cash_in: "Cash In",
  maya_cash_out: "Cash Out",
  load: "Load",
  bank_transfer: "Bank Transfer",
};
