import { loadStripe } from "@stripe/stripe-js";

const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;

let stripePromise: ReturnType<typeof loadStripe> | null = null;

export function getStripe() {
  if (!stripePromise && publishableKey) {
    stripePromise = loadStripe(publishableKey);
  }
  return stripePromise;
}

export const STRIPE_PAYMENT_LINKS = {
  starter: {
    monthly: "https://buy.stripe.com/test_starter_monthly",
    yearly: "https://buy.stripe.com/test_starter_yearly",
  },
  pro: {
    monthly: "https://buy.stripe.com/test_pro_monthly",
    yearly: "https://buy.stripe.com/test_pro_yearly",
  },
};
