"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { fetchSettings } from "@/lib/settings";
import { useRole } from "@/lib/useRole";
import { useToast } from "@/components/Toast";
import { calcTieredCommission } from "@/lib/commission";
import {
  AppSettings,
  DEFAULT_SETTINGS,
  Platform,
  TxType,
  TX_LABELS,
  APP_DEEP_LINKS,
  DEEP_LINK_PATHS,
  PLATFORM_LABELS,
  PLATFORM_STYLES,
} from "@/lib/types";
import AppShell from "@/components/AppShell";
import BalanceEditModal from "@/components/BalanceEditModal";
import { Pencil, Check, Lock, ArrowLeft, ExternalLink, Copy } from "lucide-react";

const GCASH_TYPES: TxType[] = ["cash_in", "cash_out", "load", "bank_transfer"];
const MAYA_TYPES: TxType[] = ["maya_cash_in", "maya_cash_out", "load", "bank_transfer"];
const DITO_TYPES: TxType[] = ["dito_load"];

type Step = "form" | "summary" | "verify";

const PH_MOBILE_RE = /^09\d{9}$/;

function money(n: number) {
  return `₱${n.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
}

// Bank account numbers vary in length by bank (e.g. "0121 3969 3190"),
// unlike GCash/Maya mobile numbers which are always 11 digits -- so this
// just groups whatever digits are typed into 4s for readability instead
// of enforcing a fixed length.
function formatAccountNumber(raw: string) {
  const digits = raw.replace(/[^\d]/g, "").slice(0, 20);
  return digits.replace(/(.{4})/g, "$1 ").trim();
}

export default function LogPage() {
  const supabase = createClient();
  const { isOwner } = useRole();
  const { showToast } = useToast();
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  const [step, setStep] = useState<Step>("form");

  const [platform, setPlatform] = useState<Platform>("gcash");
  const [type, setType] = useState<TxType>("cash_in");
  const [customerMobile, setCustomerMobile] = useState("");
  const [accountName, setAccountName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [commissionIncluded, setCommissionIncluded] = useState(false);

  const [gcashBal, setGcashBal] = useState(0);
  const [mayaBal, setMayaBal] = useState(0);
  const [ditoBal, setDitoBal] = useState(0);
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
    setDitoBal(balances?.find((b) => b.platform === "dito")?.amount ?? 0);
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setType(platform === "gcash" ? "cash_in" : platform === "maya" ? "maya_cash_in" : "dito_load");
  }, [platform]);

  useEffect(() => {
    setCommissionIncluded(false);
    setCustomerMobile("");
    setAccountName("");
    setAccountNumber("");
  }, [type]);

  const isBankTransfer = type === "bank_transfer";

  const numericAmount = parseFloat(amount) || 0;
  const mobileValid = PH_MOBILE_RE.test(customerMobile.trim());
  const accountValid = accountName.trim().length > 0 && accountNumber.replace(/[^\d]/g, "").length >= 4;

  const commission = useMemo(() => {
    if (numericAmount <= 0) return 0;
    if (type === "cash_in" || type === "cash_out") {
      return calcTieredCommission(numericAmount, settings.gcash_tiers);
    }
    if (type === "maya_cash_in" || type === "maya_cash_out") {
      return calcTieredCommission(numericAmount, settings.maya_tiers);
    }
    if (type === "load") {
      return calcTieredCommission(numericAmount, platform === "gcash" ? settings.gcash_load_tiers : settings.maya_load_tiers);
    }
    if (type === "bank_transfer") {
      return calcTieredCommission(
        numericAmount,
        platform === "gcash" ? settings.gcash_banktransfer_tiers : settings.maya_banktransfer_tiers
      );
    }
    if (type === "dito_load") {
      return calcTieredCommission(numericAmount, settings.dito_load_tiers);
    }
    return 0;
  }, [numericAmount, type, platform, settings]);

  // Maya/DITO's own fixed fee, deducted by their app straight from our
  // float on top of the transaction amount. This is a cost to us, not our
  // commission -- kept separate everywhere (UI, RPC call, and its own
  // `provider_fee` column in History) so it never gets counted as
  // earnings on the Dashboard.
  const providerFee = useMemo(() => {
    if (type === "load") {
      return Math.max(0, platform === "gcash" ? settings.gcash_load_fixed_fee : settings.maya_load_fixed_fee);
    }
    if (type === "bank_transfer") {
      return Math.max(
        0,
        platform === "gcash" ? settings.gcash_banktransfer_fixed_fee : settings.maya_banktransfer_fixed_fee
      );
    }
    if (type === "dito_load") return Math.max(0, settings.dito_load_fixed_fee);
    return 0;
  }, [type, platform, settings]);

  const isMoneyOut =
    type === "cash_in" || type === "maya_cash_in" || type === "load" || type === "bank_transfer" || type === "dito_load";
  const netTotal = !commissionIncluded
    ? numericAmount
    : isMoneyOut
    ? numericAmount + commission + providerFee
    : numericAmount - commission - providerFee;

  const currentBalance = platform === "gcash" ? gcashBal : platform === "maya" ? mayaBal : ditoBal;
  const style = PLATFORM_STYLES[platform];
  const platformLabel = PLATFORM_LABELS[platform];
  const deepLink = APP_DEEP_LINKS[platform];

  const formValid = numericAmount > 0 && (isBankTransfer ? accountValid : mobileValid);

  async function handleBalanceSave(platformToEdit: Platform, value: number, reason: string) {
    setErrorMsg(null);
    const { error } = await supabase.rpc("adjust_balance", {
      p_platform: platformToEdit,
      p_new_amount: value,
      p_reason: reason,
    });
    if (error) {
      setErrorMsg(`Couldn't save balance: ${error.message}`);
      showToast("Couldn't save balance", "error");
      return;
    }
    showToast(`${PLATFORM_LABELS[platformToEdit]} balance updated`);
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
    // on web ahead of time, so the tab we open is redirected to the
    // fallback website below if the scheme turns out to be wrong or the
    // app isn't installed (instead of leaving it stuck on the browser's
    // "address is invalid" error page).
    const path = DEEP_LINK_PATHS[type]?.[platform];
    const url = `${deepLink.app}${path ?? ""}`;
    const win = window.open(url, "_blank");
    setOpenedApp(true);

    window.setTimeout(() => {
      try {
        // If the OS handed off to the app, most mobile browsers auto-close
        // this helper tab, so `win.closed` is true and we leave it alone.
        // If the scheme failed, the tab is still open on an error page --
        // redirect it forward to the real site instead.
        if (win && !win.closed) {
          win.location.href = deepLink.fallback;
        }
      } catch {
        // Cross-origin/security restrictions on accessing `win` are safe
        // to ignore here -- worst case the tab is just left as-is.
      }
    }, 1500);
  }

  async function handleComplete() {
    if (!confirmed) return;
    setSaving(true);
    setErrorMsg(null);

    // providerFee is computed once above (alongside `commission`) so the
    // same number is used for what's shown in the Summary and what's sent
    // here. The RPC parameter is still named p_maya_fee for backward
    // compatibility, but it's a generic "float fee" regardless of which
    // provider (Maya, DITO) is charging it.
    const { error } = await supabase.rpc("log_transaction", {
      p_platform: platform,
      p_type: type,
      p_amount: numericAmount,
      p_commission: commission,
      p_commission_included: commissionIncluded,
      p_reference_no: reference || null,
      p_note: note || null,
      p_maya_fee: providerFee,
      p_customer_mobile: isBankTransfer ? null : customerMobile.trim(),
      p_account_name: isBankTransfer ? accountName.trim() : null,
      p_account_number: isBankTransfer ? accountNumber.replace(/[^\d]/g, "") : null,
      p_status: "completed",
    });

    if (error) {
      setErrorMsg(`Couldn't save transaction: ${error.message}`);
      setSaving(false);
      return;
    }

    showToast("Transaction saved");

    // Reset everything for the next transaction
    setAmount("");
    setReference("");
    setNote("");
    setAccountName("");
    setAccountNumber("");
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

  const types = platform === "gcash" ? GCASH_TYPES : platform === "maya" ? MAYA_TYPES : DITO_TYPES;

  return (
    <AppShell>
      <div className="max-w-lg mx-auto px-4 py-6 md:py-8">
        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-4 text-xs text-text-low">
          {(["form", "summary", "verify"] as Step[]).map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center font-semibold ${
                  step === s ? `${style.solidBg} text-white` : "bg-ink-card border border-ink-line text-text-low"
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

            <div data-tour="log-platform" className="grid grid-cols-3 gap-2 mb-4">
              {(["gcash", "maya", "dito"] as Platform[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setPlatform(p)}
                  className={`py-3 rounded-xl border font-display font-semibold transition-colors ${
                    platform === p
                      ? `${PLATFORM_STYLES[p].bg15} ${PLATFORM_STYLES[p].border} ${PLATFORM_STYLES[p].text}`
                      : "border-ink-line text-text-mid"
                  }`}
                >
                  {PLATFORM_LABELS[p]}
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
                <div className={`grid gap-2 mt-1.5 ${types.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
                  {types.map((t) => (
                    <button
                      type="button"
                      key={t}
                      onClick={() => setType(t)}
                      className={`py-2.5 rounded-lg border text-sm font-medium ${
                        type === t
                          ? `${style.border} ${style.text} ${style.bg10}`
                          : "border-ink-line text-text-mid"
                      }`}
                    >
                      {TX_LABELS[t]}
                    </button>
                  ))}
                </div>
              </div>

              {isBankTransfer ? (
                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <label className="text-xs text-text-mid uppercase tracking-wide">Account name</label>
                    <input
                      required
                      value={accountName}
                      onChange={(e) => setAccountName(e.target.value)}
                      placeholder="Juan Dela Cruz"
                      className={`mt-1 w-full rounded-lg bg-ink-card border border-ink-line px-3 py-3 text-text-hi placeholder:text-text-low outline-none ${style.focusBorder}`}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-text-mid uppercase tracking-wide">Account number</label>
                    <input
                      inputMode="numeric"
                      required
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(formatAccountNumber(e.target.value))}
                      placeholder="0121 3969 3190"
                      className={`mt-1 w-full rounded-lg bg-ink-card border px-3 py-3 font-mono tabular text-text-hi placeholder:text-text-low outline-none ${
                        accountNumber && !accountValid ? "border-red-500/60" : `border-ink-line ${style.focusBorder}`
                      }`}
                    />
                    <p className="text-xs text-text-low mt-1">
                      Account numbers vary in length by bank — type it as shown on the receiving account.
                    </p>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="text-xs text-text-mid uppercase tracking-wide">Customer mobile number</label>
                  <input
                    inputMode="numeric"
                    required
                    value={customerMobile}
                    onChange={(e) => setCustomerMobile(e.target.value.replace(/[^\d]/g, "").slice(0, 11))}
                    placeholder="09XXXXXXXXX"
                    className={`mt-1 w-full rounded-lg bg-ink-card border px-3 py-3 font-mono tabular text-text-hi placeholder:text-text-low outline-none ${
                      customerMobile && !mobileValid ? "border-red-500/60" : `border-ink-line ${style.focusBorder}`
                    }`}
                  />
                  {customerMobile && !mobileValid && (
                    <p className="text-xs text-red-400 mt-1">Enter an 11-digit mobile number starting with 09.</p>
                  )}
                </div>
              )}

              <div data-tour="log-amount">
                <label className="text-xs text-text-mid uppercase tracking-wide">Amount (₱)</label>
                <input
                  inputMode="decimal"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className={`mt-1 w-full rounded-lg bg-ink-card border border-ink-line px-3 py-3 font-mono tabular text-xl text-text-hi placeholder:text-text-low outline-none ${style.focusBorder}`}
                />
              </div>

              <div className="bg-ink-card border border-ink-line rounded-xl p-4 space-y-2 divide-y divide-dashed divide-ink-line">
                <div className="flex justify-between text-sm pb-2">
                  <span className="text-text-mid">Commission</span>
                  <span className="font-mono tabular text-in">{money(commission)}</span>
                </div>
                {providerFee > 0 && (
                  <div className="flex justify-between text-sm py-2">
                    <span className="text-text-mid">{platformLabel} fee</span>
                    <span className="font-mono tabular text-out">{money(providerFee)}</span>
                  </div>
                )}
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
                        ? `${style.border} ${style.bg10} ${style.text}`
                        : "border-ink-line text-text-mid"
                    }`}
                  >
                    <span>
                      {isMoneyOut ? "Net commission into what customer pays" : "Net commission into customer's payout"}
                    </span>
                    <span
                      className={`relative w-9 h-5 rounded-full transition-colors shrink-0 ml-3 ${
                        commissionIncluded ? style.solidBg : "bg-ink-line"
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
                  className={`rounded-lg bg-ink-card border border-ink-line px-3 py-2.5 text-sm text-text-hi placeholder:text-text-low outline-none ${style.focusBorder}`}
                />
                <input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Note (optional)"
                  className={`rounded-lg bg-ink-card border border-ink-line px-3 py-2.5 text-sm text-text-hi placeholder:text-text-low outline-none ${style.focusBorder}`}
                />
              </div>

              <button
                type="submit"
                disabled={!formValid}
                className={`w-full rounded-xl text-white font-semibold py-3.5 disabled:opacity-50 ${style.solidBg}`}
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
              Review the details, then open {platformLabel} to complete it.
            </p>

            <div className="bg-ink-card border border-ink-line rounded-xl divide-y divide-dashed divide-ink-line">
              {isBankTransfer ? (
                <>
                  <SummaryRow label="Account name" value={accountName} copyable />
                  <SummaryRow label="Account number" value={accountNumber} mono copyable />
                </>
              ) : (
                <SummaryRow label="Customer number" value={customerMobile} mono copyable />
              )}
              <SummaryRow label="Provider" value={platformLabel} />
              <SummaryRow label="Transaction" value={TX_LABELS[type]} />
              <SummaryRow label="Amount" value={money(numericAmount)} mono />
              <SummaryRow label="Commission" value={money(commission)} mono />
              {providerFee > 0 && (
                <SummaryRow label={`${platformLabel} fee`} value={money(providerFee)} mono />
              )}
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
              className={`w-full mt-6 rounded-xl text-white font-semibold py-3.5 flex items-center justify-center gap-2 ${style.solidBg}`}
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
              Confirm the transaction went through in the {platformLabel} app before saving it.
            </p>

            <div className="bg-ink-card border border-ink-line rounded-xl p-4 space-y-4">
              {isBankTransfer ? (
                <>
                  <div>
                    <label className="text-xs text-text-mid uppercase tracking-wide">Account name</label>
                    <div className="mt-1 w-full rounded-lg bg-ink border border-ink-line px-3 py-2.5 text-sm text-text-hi">
                      {accountName || "—"}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-text-mid uppercase tracking-wide">Account number</label>
                    <div className="mt-1 w-full rounded-lg bg-ink border border-ink-line px-3 py-2.5 text-sm font-mono tabular text-text-hi">
                      {accountNumber || "—"}
                    </div>
                  </div>
                </>
              ) : (
                <div>
                  <label className="text-xs text-text-mid uppercase tracking-wide">Customer number</label>
                  <div className="mt-1 w-full rounded-lg bg-ink border border-ink-line px-3 py-2.5 text-sm font-mono tabular text-text-hi">
                    {customerMobile || "—"}
                  </div>
                </div>
              )}

              <div>
                <label className="text-xs text-text-mid uppercase tracking-wide">Reference number</label>
                <input
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="Verify against the app receipt (optional)"
                  className={`mt-1 w-full rounded-lg bg-ink border border-ink-line px-3 py-2.5 text-sm text-text-hi placeholder:text-text-low outline-none ${style.focusBorder}`}
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
                  I confirm that the transaction was completed successfully in the {platformLabel} app.
                </span>
              </label>
            </div>

            <button
              onClick={handleComplete}
              disabled={!confirmed || saving}
              className={`w-full mt-6 rounded-xl text-white font-semibold py-3.5 disabled:opacity-50 flex items-center justify-center gap-2 ${style.solidBg}`}
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
          label={PLATFORM_LABELS[editingBalance]}
          currentBalance={editingBalance === "gcash" ? gcashBal : editingBalance === "maya" ? mayaBal : ditoBal}
          onClose={() => setEditingBalance(null)}
          onSave={async (v, reason) => {
            await handleBalanceSave(editingBalance, v, reason);
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
  copyable,
}: {
  label: string;
  value: string;
  mono?: boolean;
  highlight?: boolean;
  copyable?: boolean;
}) {
  const { showToast } = useToast();
  const [justCopied, setJustCopied] = useState(false);

  // Nothing sensible to copy -- render as a normal (non-interactive) row.
  const canCopy = copyable && value && value !== "—";

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // navigator.clipboard needs a secure context (https/localhost) and
      // isn't available on some very old browsers/webviews -- fall back
      // to the legacy selection-based copy trick instead of failing silently.
      const el = document.createElement("textarea");
      el.value = value;
      el.style.position = "fixed";
      el.style.opacity = "0";
      document.body.appendChild(el);
      el.focus();
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
    setJustCopied(true);
    showToast("Copied to clipboard");
    setTimeout(() => setJustCopied(false), 1500);
  }

  return (
    <div className="flex justify-between items-center px-4 py-3">
      <span className="text-sm text-text-mid">{label}</span>
      {canCopy ? (
        <button
          type="button"
          onClick={handleCopy}
          className={`flex items-center gap-1.5 text-sm rounded-md -mr-2 px-2 py-1 active:bg-ink transition-colors ${
            mono ? "font-mono tabular" : ""
          } ${highlight ? "font-semibold text-base" : "text-text-hi"}`}
        >
          {value}
          {justCopied ? (
            <Check size={14} className="text-green-400 shrink-0" />
          ) : (
            <Copy size={14} className="text-text-low shrink-0" />
          )}
        </button>
      ) : (
        <span
          className={`text-sm ${mono ? "font-mono tabular" : ""} ${
            highlight ? "font-semibold text-base" : "text-text-hi"
          }`}
        >
          {value}
        </span>
      )}
    </div>
  );
}
