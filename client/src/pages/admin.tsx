import { useState } from "react";
import { useAppStore } from "@/store/auth.store";
import { updateUser } from "@/services/user.service";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, Crown, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";

const ADMIN_EMAILS = ["saifkhan13483@gmail.com"];

export default function AdminPage() {
  const { user, setUser } = useAppStore();
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const [, navigate] = useLocation();

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <AlertTriangle className="mx-auto h-10 w-10 text-yellow-500 mb-2" />
            <CardTitle>Not signed in</CardTitle>
            <CardDescription>Please sign in to access the admin panel.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" onClick={() => navigate("/login")}>Go to Login</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!ADMIN_EMAILS.includes(user.email)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <AlertTriangle className="mx-auto h-10 w-10 text-red-500 mb-2" />
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>You do not have permission to view this page.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  async function activateElite() {
    if (!user) return;
    setLoading(true);
    try {
      const updated = await updateUser(user.id, {
        plan: "elite",
        planUpdatedAt: new Date().toISOString(),
      });
      setUser(updated);
      queryClient.invalidateQueries();
      toast({
        title: "Elite plan activated!",
        description: `Plan is now set to Elite for ${user.email}.`,
      });
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to activate plan. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <ShieldCheck className="mx-auto h-10 w-10 text-violet-500 mb-2" />
          <CardTitle>Admin Panel</CardTitle>
          <CardDescription>Manage your account plan</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Signed in as</span>
              <span className="font-medium">{user.email}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Current plan</span>
              <Badge variant="outline" className="capitalize">{user.plan ?? "free"}</Badge>
            </div>
          </div>

          {user.plan === "elite" ? (
            <div className="flex items-center gap-2 rounded-lg bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-800 p-4 text-violet-700 dark:text-violet-300">
              <Crown className="h-5 w-5 flex-shrink-0" />
              <span className="text-sm font-medium">Elite plan is already active on this account.</span>
            </div>
          ) : (
            <Button
              className="w-full bg-violet-600 hover:bg-violet-700 text-white"
              onClick={activateElite}
              disabled={loading}
              data-testid="button-activate-elite"
            >
              <Crown className="mr-2 h-4 w-4" />
              {loading ? "Activating..." : "Activate Elite Plan"}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
