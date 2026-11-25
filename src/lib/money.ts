/** Money is an integer count of minor units (paise). Rates are basis points. No floats. */
export type Minor = bigint;

const HALF_UP = (num: bigint, den: bigint): bigint => {
  const neg = num < 0n;
  const n = neg ? -num : num;
  const q = (2n * n + den) / (2n * den);
  return neg ? -q : q;
};

export const toMinor = (decimal: string): Minor => {
  const m = /^(-?)(\d+)(?:\.(\d{1,2}))?$/.exec(decimal.trim());
  if (!m) throw new Error(`Invalid money amount: ${decimal}`);
  const [, sign, whole, frac = ""] = m;
  const v = BigInt(whole! + frac.padEnd(2, "0"));
  return sign ? -v : v;
};

export const fromMinor = (v: Minor): string => {
  const neg = v < 0n;
  const s = (neg ? -v : v).toString().padStart(3, "0");
  return `${neg ? "-" : ""}${s.slice(0, -2)}.${s.slice(-2)}`;
};

/** quantity is thousandths (1500 = 1.5 units). */
export const lineTotal = (unitPrice: Minor, qtyMilli: number): Minor => {
  if (!Number.isInteger(qtyMilli) || qtyMilli < 0) throw new Error("Invalid quantity");
  return HALF_UP(unitPrice * BigInt(qtyMilli), 1000n);
};

export const applyBps = (amount: Minor, bps: number): Minor => {
  if (!Number.isInteger(bps) || bps < 0 || bps > 10_000) throw new Error("Invalid rate");
  return HALF_UP(amount * BigInt(bps), 10_000n);
};
