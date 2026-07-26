"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { fetchSettings } from "@/lib/settings";
import { useRole } from "@/lib/useRole";
import { calcTieredCommission, calcLoadCommission, calcBankTransferCommission } from "@/lib/commission";
import { AppSettings, DEFAULT_SETTINGS, Platform, TxType, TX_LABELS } from "@/lib/types";
import AppShell from "@/components/AppShell";
import BalanceEditModal from "@/components/BalanceEditModal";
import { Pencil, Check, Lock } from "lucide-react";

const GCASH_TYPES: TxType[] = ["cash_in", "cash_out"];
const MAYA_TYPES: TxType[] = ["maya_cash_in", "maya_cash_out", "load", "bank_transfer"];

export default function LogPage() {
  const supabase = createClient();
  const { isOwner } = useRole();
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [platform, setPlatform] = useState<Platform>("gcash");
  const [type, setType] = useState<TxType>("cash_in");
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [gcashBal, setGcashBal] = useState(0);
  const [mayaBal, setMayaBal] = useState(0);
  const [editingBalance, setEditingBalance] = useState<Platform | null>(null);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [commissionIncluded, setCommissionIncluded] = useState(false);

  const load = useCallback(async () => {
    const [s, { data: balances }] = await Promise.all([
      fetchSettings(supabase),
      supabase.from("balances").select("*"),
    ]);
    setSettings(s);
    setGcashBal(balances?.find((b) => b.platform === "gcash")?.amount ?? 0);
    setMayaBal(balances?.find((b) => b.platform === "maya")?.amount ?? 0);
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setType(platform === "gcash" ? "cash_in" : "maya_cash_in");
  }, [platform]);

  useEffect(() => {
    setCommissionIncluded(false);
  }, [type]);

  const numericAmount = parseFloat(amount) || 0;

  const commission = useMemo(() => {
    if (numericAmount <= 0) return 0;
    if (type === "cash_in" || type === "cash_out") {
      return calcTieredCommission(numericAmount, settings.gcash_tiers);
    }
    if (type === "maya_cash_in" || type === "maya_cash_out") {
      return calcTieredCommission(numericAmount, settings.maya_tiers);
    }
    if (type === "load") {
      return calcLoadCommission(settings.maya_load_fixed_fee, settings.maya_load_tiers, numericAmount);
    }
    if (type === "bank_transfer") {
      return calcBankTransferCommission(
        settings.maya_banktransfer_fixed_fee,
        settings.maya_banktransfer_tiers,
        numericAmount
      );
    }
    return 0;
  }, [numericAmount, type, settings]);

  const isCashIn = type === "cash_in" || type === "maya_cash_in";
  const netTotal = !commissionIncluded
    ? numericAmount
    : isCashIn
    ? numericAmount + commission
    : numericAmount - commission;

  const currentBalance = platform === "gcash" ? gcashBal : mayaBal;

  async function handleBalanceSave(platformToEdit: Platform, value: number) {
    setErrorMsg(null);
    const { error } = await supabase
      .from("balances")
      .upsert({ platform: platformToEdit, amount: value, updated_at: new Date().toISOString() });
    if (error) {
      setErrorMsg(`Couldn't save balance: ${error.message}`);
      return;
    }
    await load();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (numericAmount <= 0) return;
    setSaving(true);
    setErrorMsg(null);

    const { error } = await supabase.rpc("log_transaction", {
      p_platform: platform,
      p_type: type,
      p_amount: numericAmount,
      p_commission: commission,
      p_commission_included: commissionIncluded,
      p_reference_no: reference || null,
      p_note: note || null,
    });

    if (error) {
      setErrorMsg(`Couldn't save transaction: ${error.message}`);
      setSaving(false);
      return;
    }

    setAmount("");
    setReference("");
    setNote("");
    setCommissionIncluded(false);
    setSuccess(true);
    setTimeout(() => setSuccess(false), 1800);
    await load();
    setSaving(false);
  }

  const types = platform === "gcash" ? GCASH_TYPES : MAYA_TYPES;

  return (
    <AppShell>
      <div className="max-w-lg mx-auto px-4 py-6 md:py-8">
        <h1 className="font-display font-bold text-2xl mb-1">Log a transaction</h1>
        <p className="text-text-mid text-sm mb-6">Commission is calculated automatically from your settings.</p>

        {/* Platform toggle */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          {(["gcash", "maya"] as Platform[]).map((p) => (
            <button
              key={p}
              onClick={() => setPlatform(p)}
              className={`py-3 rounded-xl border font-display font-semibold capitalize transition-colors ${
                platform === p
                  ? p === "gcash"
                    ? "bg-gcash/15 border-gcash text-gcash"
                    : "bg-maya/15 border-maya text-maya"
                  : "border-ink-line text-text-mid"
              }`}
            >
              {p}
            </button>
          ))}
        </div>

        {errorMsg && (
          <div className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {errorMsg}
          </div>
        )}

        {/* Balance display + edit */}
        <div className="flex items-center justify-between bg-ink-card border border-ink-line rounded-xl px-4 py-3 mb-4">
          <div>
            <div className="text-[11px] uppercase tracking-wide text-text-low">Current balance</div>
            <div className="font-mono tabular text-lg font-semibold">
              ₱{currentBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
          </div>
          {isOwner ? (
            <button
              onClick={() => setEditingBalance(platform)}
              className="flex items-center gap-1.5 text-sm text-text-mid border border-ink-line rounded-lg px-3 py-2"
            >
              <Pencil size={13} /> Edit
            </button>
          ) : (
            <div className="flex items-center gap-1.5 text-sm text-text-low border border-ink-line rounded-lg px-3 py-2">
              <Lock size={13} /> Owner only
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Type selector */}
          <div>
            <label className="text-xs text-text-mid uppercase tracking-wide">Transaction type</label>
            <div className="grid grid-cols-2 gap-2 mt-1.5">
              {types.map((t) => (
                <button
                  type="button"
                  key={t}
                  onClick={() => setType(t)}
                  className={`py-2.5 rounded-lg border text-sm font-medium ${
                    type === t ? "border-gcash text-gcash bg-gcash/10" : "border-ink-line text-text-mid"
                  }`}
                >
                  {TX_LABELS[t]}
                </button>
              ))}
            </div>
          </div>

          {/* Amount */}
          <div>
            <label className="text-xs text-text-mid uppercase tracking-wide">Amount (₱)</label>
            <input
              inputMode="decimal"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="mt-1 w-full rounded-lg bg-ink-card border border-ink-line px-3 py-3 font-mono tabular text-xl outline-none focus:border-gcash"
            />
          </div>

          {/* Live preview */}
          <div className="bg-ink-card border border-ink-line rounded-xl p-4 space-y-2 divide-y divide-dashed divide-ink-line">
            <div className="flex justify-between text-sm pb-2">
              <span className="text-text-mid">Commission</span>
              <span className="font-mono tabular text-in">₱{commission.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm py-2">
              <span className="text-text-mid">{isCashIn ? "Customer pays (cash)" : "Customer receives (cash)"}</span>
              <span className="font-mono tabular font-semibold">
                ₱{netTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setCommissionIncluded((v) => !v)}
                className={`w-full flex items-center justify-between rounded-lg border px-3 py-2.5 text-sm transition-colors ${
                  commissionIncluded
                    ? "border-gcash bg-gcash/10 text-gcash"
                    : "border-ink-line text-text-mid"
                }`}
              >
                <span>
                  {isCashIn
                    ? "Net commission into what customer pays"
                    : "Net commission into customer's payout"}
                </span>
                <span
                  className={`relative w-9 h-5 rounded-full transition-colors shrink-0 ml-3 ${
                    commissionIncluded ? "bg-gcash" : "bg-ink-line"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                      commissionIncluded ? "translate-x-4" : "translate-x-0.5"
                    }`}
                  />
                </span>
              </button>
              <p className="text-xs text-text-low mt-1.5">
                {commissionIncluded
                  ? isCashIn
                    ? `Off by default, the customer would pay ₱${numericAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })} and the commission separately. With this on, they pay ₱${netTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })} total instead.`
                    : `Off by default, the customer would receive the full ₱${numericAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })} and pay the commission separately. With this on, they receive ₱${netTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })} instead.`
                  : "Default: commission is collected separately and only recorded here, not netted in."}
              </p>
            </div>
          </div>

          {/* Reference + note */}
          <div className="grid grid-cols-2 gap-3">
            <input
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="Reference no."
              className="rounded-lg bg-ink-card border border-ink-line px-3 py-2.5 text-sm outline-none focus:border-gcash"
            />
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Note (optional)"
              className="rounded-lg bg-ink-card border border-ink-line px-3 py-2.5 text-sm outline-none focus:border-gcash"
            />
          </div>

          <button
            type="submit"
            disabled={saving || numericAmount <= 0}
            className="w-full rounded-xl bg-gcash text-white font-semibold py-3.5 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {success ? (
              <>
                <Check size={18} /> Saved
              </>
            ) : saving ? (
              "Saving…"
            ) : (
              "Save transaction"
            )}
          </button>
        </form>
      </div>

      {isOwner && editingBalance && (
        <BalanceEditModal
          label={editingBalance === "gcash" ? "GCash" : "Maya"}
          currentBalance={editingBalance === "gcash" ? gcashBal : mayaBal}
          onClose={() => setEditingBalance(null)}
          onSave={async (v) => {
            await handleBalanceSave(editingBalance, v);
          }}
        />
      )}
    </AppShell>
  );
}
