// Minimal Stripe REST client for Connect payouts (no SDK dependency).
// Requires STRIPE_SECRET_KEY in the environment. Uses Express connected
// accounts: partners onboard on Stripe-hosted pages, and the platform sends
// them money with Transfers.

const STRIPE_API = 'https://api.stripe.com/v1';

export class StripeNotConfiguredError extends Error {
  constructor() {
    super('Stripe is not configured. Add STRIPE_SECRET_KEY in Vercel.');
    this.name = 'StripeNotConfiguredError';
  }
}

export function isStripeConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

interface Params { [key: string]: string | number | boolean | undefined | Params }

function encode(params: Params, prefix = ''): string[] {
  const parts: string[] = [];
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) continue;
    const name = prefix ? `${prefix}[${key}]` : key;
    if (typeof value === 'object') {
      parts.push(...encode(value, name));
    } else {
      parts.push(`${encodeURIComponent(name)}=${encodeURIComponent(String(value))}`);
    }
  }
  return parts;
}

export async function stripeRequest<T = any>(
  method: 'GET' | 'POST',
  path: string,
  params?: Params,
  idempotencyKey?: string
): Promise<T> {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new StripeNotConfiguredError();

  const body = params ? encode(params).join('&') : undefined;
  const url = method === 'GET' && body ? `${STRIPE_API}${path}?${body}` : `${STRIPE_API}${path}`;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/x-www-form-urlencoded',
  };
  if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey;

  const response = await fetch(url, {
    method,
    headers,
    body: method === 'POST' ? body : undefined,
    cache: 'no-store',
  });
  const data = await response.json();
  if (!response.ok) {
    const message = data?.error?.message || `Stripe request failed (${response.status})`;
    throw new Error(message);
  }
  return data as T;
}

export type StripeAccount = {
  id: string;
  details_submitted: boolean;
  payouts_enabled: boolean;
  charges_enabled: boolean;
  capabilities?: { transfers?: string };
};

export async function createExpressAccount(email: string, affiliateId: string) {
  return stripeRequest<StripeAccount>('POST', '/accounts', {
    type: 'express',
    country: 'US',
    email,
    business_type: 'individual',
    capabilities: { transfers: { requested: true } },
    metadata: { affiliate_id: affiliateId },
  });
}

export async function getAccount(accountId: string) {
  return stripeRequest<StripeAccount>('GET', `/accounts/${encodeURIComponent(accountId)}`);
}

export async function createOnboardingLink(accountId: string, origin: string) {
  return stripeRequest<{ url: string }>('POST', '/account_links', {
    account: accountId,
    refresh_url: `${origin}/affiliate?stripe=refresh`,
    return_url: `${origin}/affiliate?stripe=return`,
    type: 'account_onboarding',
  });
}

export async function createLoginLink(accountId: string) {
  return stripeRequest<{ url: string }>('POST', `/accounts/${encodeURIComponent(accountId)}/login_links`);
}

export async function createTransfer(
  params: { amountCents: number; destination: string; description: string; metadata: Record<string, string> },
  idempotencyKey: string
) {
  return stripeRequest<{ id: string }>('POST', '/transfers', {
    amount: params.amountCents,
    currency: 'usd',
    destination: params.destination,
    description: params.description,
    metadata: params.metadata,
  }, idempotencyKey);
}

// Stripe details kept in affiliates.payout_details (JSON), so no schema change.
export type StripePayoutDetails = {
  stripeAccountId?: string;
  stripePayoutsEnabled?: boolean;
};

export function readStripeDetails(payoutDetails: unknown): StripePayoutDetails {
  if (!payoutDetails || typeof payoutDetails !== 'object') return {};
  const d = payoutDetails as Record<string, unknown>;
  return {
    stripeAccountId: typeof d.stripeAccountId === 'string' ? d.stripeAccountId : undefined,
    stripePayoutsEnabled: d.stripePayoutsEnabled === true,
  };
}
