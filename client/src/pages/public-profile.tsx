import { useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { getPublicProfile } from "@/services/public-profile.service";
import { ALL_ACHIEVEMENTS } from "@/lib/achievements";
import { SiteLogo } from "@/components/site-logo";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Flame, Target, CheckSquare, Trophy, Lock, ExternalLink } from "lucide-react";
import { Link } from "wouter";
import { Helmet } from "react-helmet-async";
import { format } from "date-fns";

export default function PublicProfile() {
  const [, params] = useRoute("/profile/:code");
  const code = params?.code ?? "";

  const { data: profile, isLoading, isError } = useQuery({
    queryKey: ["public-profile", code],
    queryFn: () => getPublicProfile(code),
    enabled: !!code,
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="w-full max-w-lg space-y-4">
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-32 rounded-2xl" />
          <Skeleton className="h-48 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (isError || !profile) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 p-6 text-center">
        <Lock className="w-12 h-12 text-muted-foreground/40" />
        <h1 className="text-xl font-bold">Profile Not Found</h1>
        <p className="text-muted-foreground max-w-sm">
          This profile doesn't exist or the user has made it private.
        </p>
        <Link href="/">
          <Button variant="outline">Go to Strivo</Button>
        </Link>
      </div>
    );
  }

  const unlockedAchievements = ALL_ACHIEVEMENTS.filter(a => profile.achievements.includes(a.id));

  const stats = [
    { label: "Active Systems", value: profile.activeSystems, icon: Target },
    { label: "Best Streak", value: `${profile.bestStreak}d`, icon: Flame },
    { label: "Total Check-ins", value: profile.totalCheckins, icon: CheckSquare },
    { label: "Achievements", value: unlockedAchievements.length, icon: Trophy },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-background py-12 px-4">
      <Helmet>
        <title>{profile.name}'s Habit Profile | Strivo</title>
        <meta name="description" content={`${profile.name} is building systems on Strivo — ${profile.bestStreak} day best streak, ${profile.totalCheckins} check-ins completed.`} />
      </Helmet>

      <div className="max-w-lg mx-auto space-y-6">
        <div className="text-center mb-2">
          <Link href="/">
            <SiteLogo className="h-8 mx-auto" />
          </Link>
        </div>

        <Card className="overflow-hidden">
          <div className="bg-gradient-to-br from-primary/20 via-primary/10 to-transparent px-6 pt-8 pb-6">
            <div className="flex flex-col items-center text-center gap-3">
              <div className="w-20 h-20 rounded-2xl bg-primary text-primary-foreground text-3xl font-bold flex items-center justify-center shadow-lg">
                {profile.name.slice(0, 1).toUpperCase()}
              </div>
              <div>
                <h1 className="text-2xl font-bold">{profile.name}</h1>
                {profile.identityStatement && (
                  <p className="text-muted-foreground text-sm mt-1 max-w-xs leading-relaxed italic">
                    "{profile.identityStatement}"
                  </p>
                )}
                {profile.focusArea && (
                  <Badge variant="outline" className="mt-2 text-xs">{profile.focusArea}</Badge>
                )}
              </div>
              {profile.joinedAt && (
                <p className="text-xs text-muted-foreground">
                  Strivo member since {format(new Date(profile.joinedAt), "MMMM yyyy")}
                </p>
              )}
            </div>
          </div>

          <CardContent className="pt-5">
            <div className="grid grid-cols-2 gap-3">
              {stats.map(({ label, value, icon: Icon }) => (
                <div key={label} className="flex flex-col items-center gap-1 p-3 rounded-xl bg-muted/50 text-center">
                  <Icon className="w-4 h-4 text-primary" />
                  <span className="font-bold text-lg">{value}</span>
                  <span className="text-xs text-muted-foreground">{label}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {unlockedAchievements.length > 0 && (
          <Card>
            <CardContent className="pt-5">
              <div className="flex items-center gap-2 mb-4">
                <Trophy className="w-4 h-4 text-yellow-500" />
                <h2 className="font-semibold">{unlockedAchievements.length} Achievements Unlocked</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                {unlockedAchievements.map(a => (
                  <div
                    key={a.id}
                    title={`${a.title}: ${a.description}`}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-muted text-sm cursor-help"
                  >
                    <span>{a.icon}</span>
                    <span className="text-xs font-medium">{a.title}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="text-center space-y-3">
          <p className="text-sm text-muted-foreground">
            Want to build habits like {profile.name.split(" ")[0]}?
          </p>
          <Link href="/signup">
            <Button className="gap-2">
              <ExternalLink className="w-4 h-4" />
              Start Building on Strivo — Free
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
