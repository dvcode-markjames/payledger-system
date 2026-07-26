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
}

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
  maya_cash_in: "Cash In (Maya-Maya)",
  maya_cash_out: "Cash Out (Maya-Maya)",
  load: "Load",
  bank_transfer: "Bank Transfer",
};
