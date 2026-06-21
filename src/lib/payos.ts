import { PayOS } from '@payos/node';

// We ensure that we only initialize PayOS if the keys are present,
// to avoid breaking the build if the user hasn't set them up yet.
const clientId = process.env.PAYOS_CLIENT_ID || 'dummy_client_id';
const apiKey = process.env.PAYOS_API_KEY || 'dummy_api_key';
const checksumKey = process.env.PAYOS_CHECKSUM_KEY || 'dummy_checksum_key';

export const payos = new PayOS({ clientId, apiKey, checksumKey });

// Product packages
export const SUBSCRIPTION_PLANS = {
  '1_month': {
    id: '1_month',
    name: 'Gói 1 Tháng',
    price: 49000,
    durationMonths: 1,
  },
  '3_months': {
    id: '3_months',
    name: 'Gói 3 Tháng',
    price: 136000,
    durationMonths: 3,
  },
  '6_months': {
    id: '6_months',
    name: 'Gói 6 Tháng',
    price: 259000,
    durationMonths: 6,
  },
} as const;

export type PlanId = keyof typeof SUBSCRIPTION_PLANS;
