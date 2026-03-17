import { loadStripe } from "@stripe/stripe-js";

const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;

let stripePromise: ReturnType<typeof loadStripe> | null = null;

export function getStripe() {
  if (!stripePromise && publishableKey) {
    stripePromise = loadStripe(publishableKey);
  }
  return stripePromise;
}

export type BillingInterval = "monthly" | "yearly";

interface PaymentLinks {
  monthly: string | null;
  yearly: string | null;
}

export const PLAN_PAYMENT_LINKS: Record<string, PaymentLinks> = {
  starter: {
    monthly: import.meta.env.VITE_STRIPE_STARTER_MONTHLY_LINK || null,
    yearly: import.meta.env.VITE_STRIPE_STARTER_YEARLY_LINK || null,
  },
  pro: {
    monthly: import.meta.env.VITE_STRIPE_PRO_MONTHLY_LINK || null,
    yearly: import.meta.env.VITE_STRIPE_PRO_YEARLY_LINK || null,
  },
  elite: {
    monthly: import.meta.env.VITE_STRIPE_ELITE_MONTHLY_LINK || null,
    yearly: import.meta.env.VITE_STRIPE_ELITE_YEARLY_LINK || null,
  },
};

export const STRIPE_CUSTOMER_PORTAL_URL =
  import.meta.env.VITE_STRIPE_CUSTOMER_PORTAL_URL || null;

export function buildPaymentLinkUrl(
  baseUrl: string,
  opts: { email?: string; userId?: string; plan: string }
): string {
  const url = new URL(baseUrl);
  if (opts.email) url.searchParams.set("prefilled_email", opts.email);
  if (opts.userId) url.searchParams.set("client_reference_id", opts.userId);
  return url.toString();
}
