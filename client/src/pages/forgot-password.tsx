import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link } from "wouter";
import { SiteLogo } from "@/components/site-logo";
import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Sparkles, Loader2, CheckCircle2, Mail } from "lucide-react";
import * as AuthService from "@/services/auth.service";

const schema = z.object({
  email: z.string().email("Enter a valid email address"),
});

export default function ForgotPassword() {
  const { toast } = useToast();
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { email: "" },
  });

  const onSubmit = async (data: z.infer<typeof schema>) => {
    setLoading(true);
    try {
      await AuthService.sendPasswordResetEmail(data.email);
      setSent(true);
    } catch (err: any) {
      toast({
        title: "Could not send reset email",
        description: err.message || "Please check the email and try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <Helmet>
        <title>Reset Password | Strivo</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <SiteLogo className="h-12" />
          </div>
          <p className="text-muted-foreground text-sm mt-1">Reset your password</p>
        </div>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Forgot password?</CardTitle>
            <CardDescription>
              Enter your email and we'll send you a reset link.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {sent ? (
              <div className="space-y-4">
                <Alert className="border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-800">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-700 dark:text-green-400">
                    Password reset email sent! Check your inbox and follow the link to reset your password.
                  </AlertDescription>
                </Alert>
                <Button variant="outline" className="w-full" asChild data-testid="button-back-to-login">
                  <Link href="/login">Back to Sign In</Link>
                </Button>
              </div>
            ) : (
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
                            data-testid="input-email"
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
                    disabled={loading}
                    data-testid="button-submit-reset"
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <Mail className="w-4 h-4 mr-2" />
                    )}
                    {loading ? "Sending..." : "Send Reset Link"}
                  </Button>
                </form>
              </Form>
            )}

            {!sent && (
              <div className="mt-5 pt-4 border-t border-border text-center">
                <p className="text-sm text-muted-foreground">
                  Remember your password?{" "}
                  <Link href="/login" className="text-primary font-medium" data-testid="link-back-to-login">
                    Sign in
                  </Link>
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-6">
          <Link href="/" className="underline-offset-4 underline">Back to home</Link>
        </p>
      </div>
    </div>
  );
}
