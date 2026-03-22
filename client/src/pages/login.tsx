import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useLocation } from "wouter";
import { SiteLogo } from "@/components/site-logo";
import { useState } from "react";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/use-auth";
import { AuthErrorAlert } from "@/components/auth/auth-error-alert";
import { Sparkles, Loader2 } from "lucide-react";
import { SiGoogle } from "react-icons/si";
import * as AuthService from "@/services/auth.service";
import * as UserService from "@/services/user.service";
import { useQueryClient } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";

const schema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export default function Login() {
  const { login, loginPending } = useAuth();
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const [authError, setAuthError] = useState<Error | null>(null);
  const [googleLoading, setGoogleLoading] = useState(false);

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (data: z.infer<typeof schema>) => {
    setAuthError(null);
    try {
      await login(data);
      navigate("/dashboard");
    } catch (err: any) {
      setAuthError(err);
    }
  };

  const handleGoogleSignIn = async () => {
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
        navigate("/onboarding");
      } else {
        qc.invalidateQueries({ queryKey: ["user"] });
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
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <Helmet>
        <title>Log In | Strivo</title>
        <meta name="description" content="Log in to your Strivo account and continue building habits that survive real life." />
        <meta name="robots" content="noindex, follow" />
        <link rel="canonical" href="https://strivo.life/login" />
      </Helmet>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <SiteLogo className="h-12" />
          </div>
          <p className="text-muted-foreground text-sm mt-1">Build systems, not just goals.</p>
        </div>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Welcome back</CardTitle>
            <CardDescription>Sign in to continue building</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">

            {/* Inline error alert — shown above the form for visibility */}
            <AuthErrorAlert error={authError} />

            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={handleGoogleSignIn}
              disabled={googleLoading || loginPending}
              data-testid="button-google-signin"
            >
              {googleLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <SiGoogle className="w-4 h-4" />
              )}
              {googleLoading ? "Signing in..." : "Continue with Google"}
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
                      <div className="flex items-center justify-between">
                        <FormLabel>Password</FormLabel>
                        <Link
                          href="/forgot-password"
                          className="text-xs text-primary hover:underline"
                          data-testid="link-forgot-password"
                        >
                          Forgot password?
                        </Link>
                      </div>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="••••••••"
                          autoComplete="current-password"
                          data-testid="input-password"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  className="w-full"
                  disabled={loginPending || googleLoading}
                  data-testid="button-submit-login"
                >
                  {loginPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  {loginPending ? "Signing in..." : "Sign In"}
                </Button>
              </form>
            </Form>

            <div className="pt-2 border-t border-border text-center">
              <p className="text-sm text-muted-foreground">
                Don't have an account?{" "}
                <Link href="/signup" className="text-primary font-medium" data-testid="link-signup">
                  Sign up free
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
