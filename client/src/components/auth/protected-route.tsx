import { useState } from "react";
import { Redirect } from "wouter";
import { useAppStore } from "@/store/auth.store";
import { AppLayout } from "@/components/app/app-layout";
import { auth } from "@/lib/firebase";
import { sendEmailVerification } from "firebase/auth";
import { useToast } from "@/hooks/use-toast";
import { Mail, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface RouteProps {
  component: React.ComponentType;
}

function EmailVerificationBanner() {
  const [dismissed, setDismissed] = useState(
    () => sessionStorage.getItem("sf_ev_dismissed") === "1",
  );
  const [sending, setSending] = useState(false);
  const { toast } = useToast();

  const firebaseUser = auth.currentUser;
  if (!firebaseUser || firebaseUser.emailVerified || dismissed) return null;

  const handleResend = async () => {
    setSending(true);
    try {
      await sendEmailVerification(firebaseUser);
      toast({ title: "Verification email sent", description: "Check your inbox and click the link to verify your account." });
    } catch {
      toast({ title: "Couldn't send email", description: "Please try again in a few minutes.", variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const handleDismiss = () => {
    sessionStorage.setItem("sf_ev_dismissed", "1");
    setDismissed(true);
  };

  return (
    <div className="bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-800 px-4 py-2.5">
      <div className="max-w-5xl mx-auto flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 text-sm text-amber-800 dark:text-amber-200">
          <Mail className="w-4 h-4 flex-shrink-0" />
          <span>Please verify your email address to keep your account secure.</span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/50"
            onClick={handleResend}
            disabled={sending}
            data-testid="button-resend-verification"
          >
            {sending ? <Loader2 className="w-3 h-3 animate-spin" /> : "Resend email"}
          </Button>
          <button
            onClick={handleDismiss}
            className="text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-200 transition-colors"
            aria-label="Dismiss verification banner"
            data-testid="button-dismiss-verification-banner"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export function ProtectedRoute({ component: Component }: RouteProps) {
  const { user, isAuthLoading } = useAppStore();

  if (isAuthLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
    </div>
  );
  if (!user) return <Redirect to="/login" />;
  if (!user.onboardingCompleted) return <Redirect to="/onboarding" />;

  return (
    <AppLayout>
      <EmailVerificationBanner />
      <Component />
    </AppLayout>
  );
}

export function PublicOnlyRoute({ component: Component }: RouteProps) {
  const { user, isAuthLoading } = useAppStore();

  if (!isAuthLoading && user) {
    return <Redirect to={user.onboardingCompleted ? "/dashboard" : "/onboarding"} />;
  }

  return <Component />;
}
