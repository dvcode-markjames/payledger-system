import { Tier } from "./types";

/**
 * Calculates commission for tiered, block-based commission structures.
 *
 * Rule (as used by GCash / Maya-to-Maya cash in & cash out):
 * The top tier's `max` defines the "block size" (e.g. 1000). For every
 * full block in the amount, the top tier's fee is charged once. Whatever
 * is left over (the remainder under one block) is charged using whichever
 * tier bracket it falls into.
 *
 * Example with default tiers (1-100=5, 101-500=10, 501-1000=15):
 *   1230  -> one full block of 1000 (fee 15) + remainder 230 (fee 10) = 25
 *   1125  -> one full block of 1000 (fee 15) + remainder 125 (fee 10) = 25
 *   100   -> remainder only, 100 falls in 1-100 => 5
 */
export function calcTieredCommission(amount: number, tiers: Tier[]): number {
  if (!tiers || tiers.length === 0 || amount <= 0) return 0;

  const sorted = [...tiers].sort((a, b) => a.min - b.min);
  const top = sorted[sorted.length - 1];
  const blockSize = top.max;
  const blockFee = top.fee;

  const fullBlocks = Math.floor(amount / blockSize);
  const remainder = Math.round((amount - fullBlocks * blockSize) * 100) / 100;

  let remainderFee = 0;
  if (remainder > 0) {
    const bracket = sorted.find((t) => remainder >= t.min && remainder <= t.max);
    remainderFee = bracket ? bracket.fee : top.fee;
  }

  return fullBlocks * blockFee + remainderFee;
}

/** Maya Load: Maya's own fixed fee + our tiered commission (bracket-based, same rule as calcTieredCommission). */
export function calcLoadCommission(mayaFixedFee: number, tiers: Tier[], amount: number): number {
  return Math.max(0, mayaFixedFee) + calcTieredCommission(amount, tiers);
}

/** Maya Bank Transfer: Maya's own fixed fee + our tiered commission (bracket-based, same rule as calcTieredCommission). */
export function calcBankTransferCommission(mayaFixedFee: number, tiers: Tier[], amount: number): number {
  return Math.max(0, mayaFixedFee) + calcTieredCommission(amount, tiers);
}
