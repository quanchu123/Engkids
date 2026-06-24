/**
 * Payment configuration for Engkids
 *
 * Uses VietQR Quick Link to generate bank transfer QR codes.
 * Each order is identified by a unique transfer description (e.g. EK1A2B3C).
 * Admin manually confirms payment through the admin panel.
 */

// ── Bank account ────────────────────────────────────────────────────────
export const BANK_CONFIG = {
  bankId: '970422', // MBBank BIN
  accountNo: '000000000014',
  accountName: 'CHU MINH QUAN',
  bankName: 'MBBank',
  branch: 'MB',
} as const;

// ── Subscription plans ──────────────────────────────────────────────────
export const SUBSCRIPTION_PLANS = {
  '1_month': {
    id: '1_month',
    name: 'Gói 1 Tháng',
    price: 49000,
    durationMonths: 1,
    pricePerMonth: 49000,
  },
  '3_months': {
    id: '3_months',
    name: 'Gói 3 Tháng',
    price: 124950,
    durationMonths: 3,
    pricePerMonth: 41650,
  },
  '6_months': {
    id: '6_months',
    name: 'Gói 6 Tháng',
    price: 188160,
    durationMonths: 6,
    pricePerMonth: 31360,
  },
} as const;

export type PlanId = keyof typeof SUBSCRIPTION_PLANS;

// ── Freemium config ─────────────────────────────────────────────────────
/** Free users get 20 minutes of learning per day. */
export const FREEMIUM_DAILY_MINUTES = 20;

// ── Order code generation ───────────────────────────────────────────────

/** Generate a unique numeric order code (must be < 9007199254740991 to fit in BIGINT) */
export function generateOrderCode(): string {
  // Use a timestamp + random 3 digits to ensure uniqueness (e.g. 12 digits total)
  const timestampPart = String(Date.now()).slice(-9);
  const randomPart = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return timestampPart + randomPart;
}

// ── VietQR URL builder ──────────────────────────────────────────────────
/**
 * Build a VietQR Quick Link image URL.
 * The resulting URL returns a PNG image with a scannable QR code
 * that pre-fills the bank, account, amount and transfer description
 * in the payer's banking app.
 *
 * @see https://www.vietqr.io/danh-sach-api/link-tao-ma-nhanh
 */
export function buildVietQrUrl(amount: number, orderCode: string): string {
  const params = new URLSearchParams({
    amount: String(amount),
    addInfo: orderCode,
    accountName: BANK_CONFIG.accountName,
  });
  return `https://img.vietqr.io/image/${BANK_CONFIG.bankId}-${BANK_CONFIG.accountNo}-compact2.png?${params}`;
}
