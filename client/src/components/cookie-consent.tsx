import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Cookie } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const STORAGE_KEY = "sf_cookie_consent";

type ConsentState = "accepted" | "declined" | null;

export function CookieConsent() {
  const [consent, setConsent] = useState<ConsentState>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as ConsentState;
    setConsent(stored);
    setMounted(true);
  }, []);

  const handleAccept = () => {
    localStorage.setItem(STORAGE_KEY, "accepted");
    setConsent("accepted");
  };

  const handleDecline = () => {
    localStorage.setItem(STORAGE_KEY, "declined");
    setConsent("declined");
  };

  if (!mounted || consent !== null) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:max-w-sm"
        role="dialog"
        aria-label="Cookie consent"
        data-testid="cookie-consent-banner"
      >
        <div className="bg-card border border-border rounded-xl shadow-lg p-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Cookie className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold mb-1">We use cookies</p>
              <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                We use essential cookies for authentication and Firebase services. By continuing, you agree to our{" "}
                <Link href="/privacy" className="underline underline-offset-2 hover:text-foreground transition-colors">
                  Privacy Policy
                </Link>
                .
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="h-8 text-xs px-4"
                  onClick={handleAccept}
                  data-testid="button-cookie-accept"
                >
                  Accept
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs px-4"
                  onClick={handleDecline}
                  data-testid="button-cookie-decline"
                >
                  Decline
                </Button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

export function getCookieConsent(): ConsentState {
  try {
    return localStorage.getItem(STORAGE_KEY) as ConsentState;
  } catch {
    return null;
  }
}
