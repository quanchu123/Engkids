-- Track whether a paid transaction has already been applied to a user's premium expiry.
ALTER TABLE public.transactions
ADD COLUMN IF NOT EXISTS premium_applied_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS premium_until_after TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_transactions_premium_applied
ON public.transactions (premium_applied_at);
