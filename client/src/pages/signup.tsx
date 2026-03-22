import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { SiteLogo } from "@/components/site-logo";
import { z } from "zod";
import { Link, useLocation } from "wouter";
import { useState } from "react";
import { track } from "@/lib/track";
import { Helmet } from "react-helmet-async";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/hooks/use-auth";
import { AuthErrorAlert } from "@/components/auth/auth-error-alert";
import { Sparkles, Loader2 } from "lucide-react";
import { SiGoogle } from "react-icons/si";
import * as AuthService from "@/services/auth.service";
import * as UserService from "@/services/user.service";
import { useQueryClient } from "@tanstack/react-query";
import { sendSignupWelcome } from "@/lib/emailjs";

const schema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string(),
  agreeToTerms: z.boolean().refine(val => val === true, {
    message: "You must agree to the Terms and Privacy Policy",
  }),
}).refine(d => d.password === d.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export default function Signup() {
  const { signup, signupPending } = useAuth();
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const [authError, setAuthError] = useState<Error | null>(null);
  const [googleLoading, setGoogleLoading] = useState(false);

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", email: "", password: "", confirmPassword: "", agreeToTerms: false },
  });

  const onSubmit = async (data: z.infer<typeof schema>) => {
    setAuthError(null);
    try {
      await signup({ name: data.name, email: data.email, password: data.password });
      track("signup_completed", { method: "email" });
      sendSignupWelcome(data.name, data.email).catch(() => {});
      navigate("/onboarding");
    } catch (err: any) {
      setAuthError(err);
    }
  };

  const handleGoogleSignUp = async () => {
    setAuthError(null);
    setGoogleLoading(true);
    try {
      const cred = await AuthService.signInWithGoogle();
      let existing = null;
      try {
        existing = await UserService.getUser(cred.user.uid);
      } catch {
        // Firestore offline or unavailable — treat as new user and onboard
      }
      if (!existing) {
        try {
          await UserService.createUser(cred.user.uid, {
            id: cred.user.uid,
            email: cred.user.email || "",
            name: cred.user.displayName || "User",
            avatarUrl: cred.user.photoURL || null,
            onboardingCompleted: false,
            preferredTheme: "system",
            timezone: "UTC",
          });
        } catch {
          // If offline, still navigate — user can retry later
        }
        qc.invalidateQueries({ queryKey: ["user"] });
        track("signup_completed", { method: "google" });
        navigate("/onboarding");
      } else {
        qc.invalidateQueries({ queryKey: ["user"] });
        track("login", { method: "google" });
        navigate("/dashboard");
      }
    } catch (err: any) {
      if (err.code !== "auth/popup-closed-by-user") {
        setAuthError(err);
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-8">
      <Helmet>
        <title>Sign Up Free | Strivo</title>
        <link rel="canonical" href="https://strivo.life/signup" />
        <meta name="description" content="Create your free Strivo account and start building habits that actually stick — with a minimum action, a fallback plan, and a recovery path." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://strivo.life/signup" />
        <meta property="og:site_name" content="Strivo" />
        <meta property="og:title" content="Sign Up Free | Strivo" />
        <meta property="og:description" content="Create your free account and start building habits that actually stick. No credit card required." />
        <meta property="og:image" content="https://strivo.life/og-image.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@strivoapp" />
        <meta name="twitter:title" content="Sign Up Free | Strivo" />
        <meta name="twitter:description" content="Create your free account and start building habits that actually stick. No credit card required." />
        <meta name="twitter:image" content="https://strivo.life/og-image.png" />
      </Helmet>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <SiteLogo className="h-12" />
          </div>
          <p className="text-muted-foreground text-sm mt-1">Turn your goals into daily systems.</p>
        </div>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Create your account</CardTitle>
            <CardDescription>Free forever. No credit card needed.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">

            {/* Inline error alert — displayed above inputs for immediate visibility */}
            <AuthErrorAlert error={authError} />

            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={handleGoogleSignUp}
              disabled={googleLoading || signupPending}
              data-testid="button-google-signup"
            >
              {googleLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <SiGoogle className="w-4 h-4" />
              )}
              {googleLoading ? "Signing up..." : "Continue with Google"}
            </Button>

            <div className="flex items-center gap-3">
              <Separator className="flex-1" />
              <span className="text-xs text-muted-foreground">or</span>
              <Separator className="flex-1" />
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Alex Johnson" autoComplete="name" data-testid="input-name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="you@example.com"
                          autoComplete="email"
                          data-testid="input-email"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="At least 6 characters"
                          autoComplete="new-password"
                          data-testid="input-password"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm Password</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="Repeat your password"
                          autoComplete="new-password"
                          data-testid="input-confirm-password"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="agreeToTerms"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-start gap-2.5">
                        <FormControl>
                          <Checkbox
                            id="agreeToTerms"
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="checkbox-agree-terms"
                            className="mt-0.5"
                          />
                        </FormControl>
                        <label htmlFor="agreeToTerms" className="text-xs text-muted-foreground leading-relaxed cursor-pointer">
                          I agree to the{" "}
                          <Link href="/terms" className="text-primary underline underline-offset-2 hover:opacity-80" target="_blank">
                            Terms of Service
                          </Link>{" "}
                          and{" "}
                          <Link href="/privacy" className="text-primary underline underline-offset-2 hover:opacity-80" target="_blank">
                            Privacy Policy
                          </Link>
                        </label>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full"
                  disabled={signupPending || googleLoading}
                  data-testid="button-submit-signup"
                >
                  {signupPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  {signupPending ? "Creating account..." : "Create Account"}
                </Button>
              </form>
            </Form>

            <div className="pt-2 border-t border-border text-center">
              <p className="text-sm text-muted-foreground">
                Already have an account?{" "}
                <Link href="/login" className="text-primary font-medium" data-testid="link-login">
                  Sign in
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-6">
          <Link href="/" className="underline-offset-4 underline">Back to home</Link>
        </p>
      </div>
    </div>
  );
}
