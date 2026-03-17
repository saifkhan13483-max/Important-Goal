/**
 * emailjs.ts — Welcome & drip email sending via EmailJS
 *
 * Configure in Replit Secrets (or .env):
 *   VITE_EMAILJS_SERVICE_ID    — EmailJS Service ID
 *   VITE_EMAILJS_PUBLIC_KEY    — EmailJS Public Key
 *   VITE_EMAILJS_WELCOME_TEMPLATE — Template ID for welcome/newsletter emails
 *   VITE_EMAILJS_SIGNUP_TEMPLATE  — Template ID for new account emails
 *
 * Set these up at https://www.emailjs.com/
 */

import emailjs from "@emailjs/browser";

const SERVICE_ID    = import.meta.env.VITE_EMAILJS_SERVICE_ID    as string | undefined;
const PUBLIC_KEY    = import.meta.env.VITE_EMAILJS_PUBLIC_KEY    as string | undefined;
const WELCOME_TPL   = import.meta.env.VITE_EMAILJS_WELCOME_TEMPLATE as string | undefined;
const SIGNUP_TPL    = import.meta.env.VITE_EMAILJS_SIGNUP_TEMPLATE  as string | undefined;

function isConfigured(): boolean {
  return !!(SERVICE_ID && PUBLIC_KEY);
}

function init() {
  if (isConfigured()) {
    emailjs.init({ publicKey: PUBLIC_KEY! });
  }
}

init();

/**
 * Send a welcome/drip email to a newsletter subscriber.
 * Called when a visitor submits the email capture form on the landing page.
 */
export async function sendNewsletterWelcome(email: string): Promise<void> {
  if (!isConfigured() || !WELCOME_TPL) return;
  try {
    await emailjs.send(SERVICE_ID!, WELCOME_TPL, {
      to_email: email,
      app_name: "SystemForge",
      app_url: "https://systemforge.app",
      unsubscribe_url: `https://systemforge.app/unsubscribe?email=${encodeURIComponent(email)}`,
    });
  } catch (err) {
    console.warn("[EmailJS] Newsletter welcome send failed:", err);
  }
}

/**
 * Send a welcome email to a newly signed-up user.
 * Called immediately after successful account creation.
 */
export async function sendSignupWelcome(name: string, email: string): Promise<void> {
  if (!isConfigured() || !SIGNUP_TPL) return;
  try {
    await emailjs.send(SERVICE_ID!, SIGNUP_TPL, {
      to_email: email,
      to_name: name || "there",
      app_name: "SystemForge",
      dashboard_url: "https://systemforge.app/dashboard",
      first_step_url: "https://systemforge.app/systems/new",
    });
  } catch (err) {
    console.warn("[EmailJS] Signup welcome send failed:", err);
  }
}
