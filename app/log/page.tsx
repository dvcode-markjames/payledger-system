"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { fetchSettings } from "@/lib/settings";
import { useRole } from "@/lib/useRole";
import { calcTieredCommission, calcLoadCommission, calcBankTransferCommission } from "@/lib/commission";
import { AppSettings, DEFAULT_SETTINGS, Platform, TxType, TX_LABELS, APP_DEEP_LINKS, DEEP_LINK_PATHS } from "@/lib/types";
import AppShell from "@/components/AppShell";
import BalanceEditModal from "@/components/BalanceEditModal";
import { Pencil, Check, Lock, ArrowLeft, ExternalLink } from "lucide-react";

const GCASH_TYPES: TxType[] = ["cash_in", "cash_out"];
const MAYA_TYPES: TxType[] = ["maya_cash_in", "maya_cash_out", "load", "bank_transfer"];

type Step = "form" | "summary" | "verify";

const PH_MOBILE_RE = /^09\d{9}$/;

function money(n: number) {
  return `₱${n.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
}

export default function LogPage() {
  const supabase = createClient();
  const { isOwner } = useRole();
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  const [step, setStep] = useState<Step>("form");

  const [platform, setPlatform] = useState<Platform>("gcash");
  const [type, setType] = useState<TxType>("cash_in");
  const [customerMobile, setCustomerMobile] = useState("");
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [commissionIncluded, setCommissionIncluded] = useState(false);

  const [gcashBal, setGcashBal] = useState(0);
  const [mayaBal, setMayaBal] = useState(0);
  const [editingBalance, setEditingBalance] = useState<Platform | null>(null);

  const [openedApp, setOpenedApp] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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
  const mobileValid = PH_MOBILE_RE.test(customerMobile.trim());

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

  const isMoneyOut = type === "cash_in" || type === "maya_cash_in" || type === "load" || type === "bank_transfer";
  const netTotal = !commissionIncluded
    ? numericAmount
    : isMoneyOut
    ? numericAmount + commission
    : numericAmount - commission;

  const currentBalance = platform === "gcash" ? gcashBal : mayaBal;
  const isGcash = platform === "gcash";
  const deepLink = APP_DEEP_LINKS[platform];

  const formValid = numericAmount > 0 && mobileValid;

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

  function goToSummary() {
    if (!formValid) return;
    setErrorMsg(null);
    setStep("summary");
  }

  function openProviderApp() {
    // Best-effort: try the app's URL scheme first. Since these schemes
    // aren't officially published and vary by device, always give a
    // fallback link too in case nothing happens.
    // Screen-specific paths below are reverse-engineered (not officially
    // documented by GCash/Maya) and may need updating or removal if they
    // stop working after an app update — there's no way to detect failure
    // on web, so the "Open GCash"/"Open Maya" fallback link stays as-is.
    const path = DEEP_LINK_PATHS[type]?.[platform];
    const url = `${deepLink.app}${path ?? ""}`;
    window.open(url, "_blank");
    setOpenedApp(true);
  }

  async function handleComplete() {
    if (!confirmed) return;
    setSaving(true);
    setErrorMsg(null);

    const mayaFee =
      type === "load"
        ? settings.maya_load_fixed_fee
        : type === "bank_transfer"
        ? settings.maya_banktransfer_fixed_fee
        : 0;

    const { error } = await supabase.rpc("log_transaction", {
      p_platform: platform,
      p_type: type,
      p_amount: numericAmount,
      p_commission: commission,
      p_commission_included: commissionIncluded,
      p_reference_no: reference || null,
      p_note: note || null,
      p_maya_fee: mayaFee,
      p_customer_mobile: customerMobile.trim(),
      p_status: "completed",
    });

    if (error) {
      setErrorMsg(`Couldn't save transaction: ${error.message}`);
      setSaving(false);
      return;
    }

    // Reset everything for the next transaction
    setAmount("");
    setReference("");
    setNote("");
    setCustomerMobile("");
    setCommissionIncluded(false);
    setOpenedApp(false);
    setConfirmed(false);
    setSuccess(true);
    setStep("form");
    setTimeout(() => setSuccess(false), 1800);
    await load();
    setSaving(false);
  }

  const types = platform === "gcash" ? GCASH_TYPES : MAYA_TYPES;

  return (
    <AppShell>
      <div className="max-w-lg mx-auto px-4 py-6 md:py-8">
        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-4 text-xs text-text-low">
          {(["form", "summary", "verify"] as Step[]).map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center font-semibold ${
                  step === s
                    ? isGcash
                      ? "bg-gcash text-white"
                      : "bg-maya text-white"
                    : "bg-ink-card border border-ink-line text-text-low"
                }`}
              >
                {i + 1}
              </div>
              {i < 2 && <div className="w-6 h-px bg-ink-line" />}
            </div>
          ))}
        </div>

        {errorMsg && (
          <div className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {errorMsg}
          </div>
        )}

        {/* ───────────────────── STEP 1: FORM ───────────────────── */}
        {step === "form" && (
          <>
            <h1 className="font-display font-bold text-2xl mb-1">Log a transaction</h1>
            <p className="text-text-mid text-sm mb-6">Commission is calculated automatically from your settings.</p>

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

            <div className="flex items-center justify-between bg-ink-card border border-ink-line rounded-xl px-4 py-3 mb-4">
              <div>
                <div className="text-[11px] uppercase tracking-wide text-text-low">Current balance</div>
                <div className="font-mono tabular text-lg font-semibold">{money(currentBalance)}</div>
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

            <form
              onSubmit={(e) => {
                e.preventDefault();
                goToSummary();
              }}
              className="space-y-4"
            >
              <div>
                <label className="text-xs text-text-mid uppercase tracking-wide">Transaction type</label>
                <div className="grid grid-cols-2 gap-2 mt-1.5">
                  {types.map((t) => (
                    <button
                      type="button"
                      key={t}
                      onClick={() => setType(t)}
                      className={`py-2.5 rounded-lg border text-sm font-medium ${
                        type === t
                          ? isGcash
                            ? "border-gcash text-gcash bg-gcash/10"
                            : "border-maya text-maya bg-maya/10"
                          : "border-ink-line text-text-mid"
                      }`}
                    >
                      {TX_LABELS[t]}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs text-text-mid uppercase tracking-wide">Customer mobile number</label>
                <input
                  inputMode="numeric"
                  required
                  value={customerMobile}
                  onChange={(e) => setCustomerMobile(e.target.value.replace(/[^\d]/g, "").slice(0, 11))}
                  placeholder="09XXXXXXXXX"
                  className={`mt-1 w-full rounded-lg bg-ink-card border px-3 py-3 font-mono tabular outline-none ${
                    customerMobile && !mobileValid
                      ? "border-red-500/60"
                      : isGcash
                      ? "border-ink-line focus:border-gcash"
                      : "border-ink-line focus:border-maya"
                  }`}
                />
                {customerMobile && !mobileValid && (
                  <p className="text-xs text-red-400 mt-1">Enter an 11-digit mobile number starting with 09.</p>
                )}
              </div>

              <div>
                <label className="text-xs text-text-mid uppercase tracking-wide">Amount (₱)</label>
                <input
                  inputMode="decimal"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className={`mt-1 w-full rounded-lg bg-ink-card border border-ink-line px-3 py-3 font-mono tabular text-xl outline-none ${
                    isGcash ? "focus:border-gcash" : "focus:border-maya"
                  }`}
                />
              </div>

              <div className="bg-ink-card border border-ink-line rounded-xl p-4 space-y-2 divide-y divide-dashed divide-ink-line">
                <div className="flex justify-between text-sm pb-2">
                  <span className="text-text-mid">Commission</span>
                  <span className="font-mono tabular text-in">{money(commission)}</span>
                </div>
                <div className="flex justify-between text-sm py-2">
                  <span className="text-text-mid">{isMoneyOut ? "Customer pays (cash)" : "Customer receives (cash)"}</span>
                  <span className="font-mono tabular font-semibold">{money(netTotal)}</span>
                </div>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setCommissionIncluded((v) => !v)}
                    className={`w-full flex items-center justify-between rounded-lg border px-3 py-2.5 text-sm transition-colors ${
                      commissionIncluded
                        ? isGcash
                          ? "border-gcash bg-gcash/10 text-gcash"
                          : "border-maya bg-maya/10 text-maya"
                        : "border-ink-line text-text-mid"
                    }`}
                  >
                    <span>
                      {isMoneyOut ? "Net commission into what customer pays" : "Net commission into customer's payout"}
                    </span>
                    <span
                      className={`relative w-9 h-5 rounded-full transition-colors shrink-0 ml-3 ${
                        commissionIncluded ? (isGcash ? "bg-gcash" : "bg-maya") : "bg-ink-line"
                      }`}
                    >
                      <span
                        className={`absolute left-0.5 top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                          commissionIncluded ? "translate-x-4" : "translate-x-0"
                        }`}
                      />
                    </span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <input
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="Reference no. (optional)"
                  className={`rounded-lg bg-ink-card border border-ink-line px-3 py-2.5 text-sm outline-none ${
                    isGcash ? "focus:border-gcash" : "focus:border-maya"
                  }`}
                />
                <input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Note (optional)"
                  className={`rounded-lg bg-ink-card border border-ink-line px-3 py-2.5 text-sm outline-none ${
                    isGcash ? "focus:border-gcash" : "focus:border-maya"
                  }`}
                />
              </div>

              <button
                type="submit"
                disabled={!formValid}
                className={`w-full rounded-xl text-white font-semibold py-3.5 disabled:opacity-50 ${
                  isGcash ? "bg-gcash" : "bg-maya"
                }`}
              >
                Next
              </button>
            </form>
          </>
        )}

        {/* ───────────────────── STEP 2: SUMMARY ───────────────────── */}
        {step === "summary" && (
          <>
            <button onClick={() => setStep("form")} className="flex items-center gap-1.5 text-sm text-text-mid mb-4">
              <ArrowLeft size={15} /> Back
            </button>
            <h1 className="font-display font-bold text-2xl mb-1">Transaction summary</h1>
            <p className="text-text-mid text-sm mb-6">
              Review the details, then open {platform === "gcash" ? "GCash" : "Maya"} to complete it.
            </p>

            <div className="bg-ink-card border border-ink-line rounded-xl divide-y divide-dashed divide-ink-line">
              <SummaryRow label="Customer number" value={customerMobile} mono />
              <SummaryRow label="Provider" value={platform === "gcash" ? "GCash" : "Maya"} />
              <SummaryRow label="Transaction" value={TX_LABELS[type]} />
              <SummaryRow label="Amount" value={money(numericAmount)} mono />
              <SummaryRow label="Commission" value={money(commission)} mono />
              <SummaryRow
                label={isMoneyOut ? "Customer pays" : "Customer receives"}
                value={money(netTotal)}
                mono
                highlight
              />
              <SummaryRow label="Reference number" value={reference || "—"} mono />
              <SummaryRow label="Note" value={note || "—"} />
            </div>

            <button
              onClick={openProviderApp}
              className={`w-full mt-6 rounded-xl text-white font-semibold py-3.5 flex items-center justify-center gap-2 ${
                isGcash ? "bg-gcash" : "bg-maya"
              }`}
            >
              <ExternalLink size={18} /> {deepLink.label}
            </button>
            <p className="text-xs text-text-low mt-2 text-center">
              If the app doesn't open,{" "}
              <a href={deepLink.fallback} target="_blank" rel="noreferrer" className="underline">
                open it manually
              </a>{" "}
              and complete the transaction there.
            </p>

            <button
              onClick={() => setStep("verify")}
              className="w-full mt-3 rounded-xl border border-ink-line text-text-mid font-medium py-3"
            >
              {openedApp ? "Continue to verification" : "Skip and verify manually"}
            </button>
          </>
        )}

        {/* ───────────────────── STEP 3: VERIFY ───────────────────── */}
        {step === "verify" && (
          <>
            <button onClick={() => setStep("summary")} className="flex items-center gap-1.5 text-sm text-text-mid mb-4">
              <ArrowLeft size={15} /> Back
            </button>
            <h1 className="font-display font-bold text-2xl mb-1">Verification</h1>
            <p className="text-text-mid text-sm mb-6">
              Confirm the transaction went through in the {platform === "gcash" ? "GCash" : "Maya"} app before saving it.
            </p>

            <div className="bg-ink-card border border-ink-line rounded-xl p-4 space-y-4">
              <div>
                <label className="text-xs text-text-mid uppercase tracking-wide">Reference number</label>
                <input
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="Verify against the app receipt (optional)"
                  className={`mt-1 w-full rounded-lg bg-ink-bg border border-ink-line px-3 py-2.5 text-sm outline-none ${
                    isGcash ? "focus:border-gcash" : "focus:border-maya"
                  }`}
                />
              </div>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                  className="mt-0.5 w-4 h-4"
                />
                <span className="text-sm text-text-mid">
                  I confirm that the transaction was completed successfully in the {platform === "gcash" ? "GCash" : "Maya"} app.
                </span>
              </label>
            </div>

            <button
              onClick={handleComplete}
              disabled={!confirmed || saving}
              className={`w-full mt-6 rounded-xl text-white font-semibold py-3.5 disabled:opacity-50 flex items-center justify-center gap-2 ${
                isGcash ? "bg-gcash" : "bg-maya"
              }`}
            >
              {success ? (
                <>
                  <Check size={18} /> Saved
                </>
              ) : saving ? (
                "Saving…"
              ) : (
                "Transaction Completed"
              )}
            </button>
          </>
        )}
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

function SummaryRow({
  label,
  value,
  mono,
  highlight,
}: {
  label: string;
  value: string;
  mono?: boolean;
  highlight?: boolean;
}) {
  return (
    <div className="flex justify-between items-center px-4 py-3">
      <span className="text-sm text-text-mid">{label}</span>
      <span
        className={`text-sm ${mono ? "font-mono tabular" : ""} ${
          highlight ? "font-semibold text-base" : "text-text-high"
        }`}
      >
        {value}
      </span>
    </div>
  );
}
