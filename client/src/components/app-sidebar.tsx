import { Link, useLocation } from "wouter";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard, Target, Zap, CheckSquare, BarChart2, BookOpen, Settings,
  Sparkles, LogOut, LayoutGrid, Plus, Calendar, Bot, Users,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { useAppStore } from "@/store/auth.store";
import { getSystems } from "@/services/systems.service";
import { getCheckinsByDate } from "@/services/checkins.service";
import type { System, Checkin } from "@/types/schema";
import { cn } from "@/lib/utils";
import { getPlanFeatures } from "@/lib/plan-limits";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function getTodayKey() {
  return new Date().toISOString().split("T")[0];
}

const navItems = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: LayoutDashboard,
    hint: "Your overview",
  },
  {
    title: "My Goals",
    url: "/goals",
    icon: Target,
    hint: "What you want to achieve",
  },
  {
    title: "My Systems",
    url: "/systems",
    icon: Zap,
    hint: "Your daily habits",
  },
  {
    title: "Templates",
    url: "/templates",
    icon: LayoutGrid,
    hint: "Start from proven habits",
  },
  {
    title: "Today's Progress",
    url: "/checkins",
    icon: CheckSquare,
    hint: "Log today's check-ins",
  },
  {
    title: "Progress Insights",
    url: "/analytics",
    icon: BarChart2,
    hint: "Charts & streaks",
  },
  {
    title: "Reflections",
    url: "/journal",
    icon: BookOpen,
    hint: "Your daily journal",
  },
  {
    title: "AI Coach",
    url: "/ai-coach",
    icon: Bot,
    hint: "Get personalized habit coaching",
  },
  {
    title: "Team Workspace",
    url: "/workspace",
    icon: Users,
    hint: "Collaborate with your team",
  },
];

export function AppSidebar() {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const { user: appUser } = useAppStore();
  const { toast } = useToast();
  const userId = appUser?.id ?? "";
  const features = getPlanFeatures(appUser?.plan);
  const today = getTodayKey();

  const { data: systems = [] } = useQuery<System[]>({
    queryKey: ["systems", userId],
    queryFn: () => getSystems(userId),
    enabled: !!userId,
  });

  const { data: todayCheckins = [] } = useQuery<Checkin[]>({
    queryKey: ["checkins-today", userId, today],
    queryFn: () => getCheckinsByDate(userId, today),
    enabled: !!userId,
  });

  const activeSystems = systems.filter(s => s.active);
  const todayDone = todayCheckins.filter(c => c.status === "done").length;
  const todayTotal = activeSystems.length;
  const completionPct = todayTotal > 0 ? Math.round((todayDone / todayTotal) * 100) : null;
  const allDone = todayTotal > 0 && todayDone === todayTotal;

  const handleLogout = async () => {
    await logout();
    toast({ title: "Logged out", description: "See you soon!" });
  };

  const initials = user?.name
    ? user.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
    : "SF";

  return (
    <Sidebar role="navigation" aria-label="Application navigation">
      <SidebarHeader className="px-4 py-4 border-b border-sidebar-border">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg gradient-brand flex items-center justify-center flex-shrink-0 shadow-sm">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="font-bold text-sm text-sidebar-foreground leading-tight">SystemForge</p>
            <p className="text-xs text-muted-foreground leading-tight">Goals → Daily Systems</p>
          </div>
        </div>
      </SidebarHeader>

      {/* Today's progress summary */}
      {todayTotal > 0 && (
        <div className="px-4 py-2.5 border-b border-sidebar-border">
          <Link href="/checkins">
            <div className={cn(
              "rounded-lg p-2.5 cursor-pointer transition-colors",
              allDone ? "bg-chart-3/10" : "bg-muted/40 hover:bg-muted/60",
            )}>
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3 h-3 text-muted-foreground" />
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Today</span>
                </div>
                <span className={cn(
                  "text-[10px] font-bold",
                  allDone ? "text-chart-3" : "text-foreground",
                )}>
                  {allDone ? "All done! 🔥" : `${todayDone}/${todayTotal}`}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className={cn("h-full rounded-full transition-all", allDone ? "bg-chart-3" : "bg-primary")}
                  style={{ width: `${completionPct ?? 0}%` }}
                />
              </div>
            </div>
          </Link>
        </div>
      )}

      <SidebarContent className="py-3">
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground px-3 mb-1 uppercase tracking-wider">
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const isActive = location === item.url || location.startsWith(item.url + "/");

                const showBadge = item.url === "/checkins" && completionPct !== null && !allDone;
                const showComplete = item.url === "/checkins" && allDone;
                const showProBadge = item.url === "/ai-coach" && !features.aiCoach;
                const showEliteBadge = item.url === "/workspace" && !features.teamWorkspace;

                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive}>
                      <Link
                        href={item.url}
                        data-testid={`nav-${item.title.toLowerCase().replace(/ /g, "-").replace(/'/g, "")}`}
                        title={item.hint}
                      >
                        <item.icon className="w-4 h-4" />
                        <span className="flex-1">{item.title}</span>
                        {showComplete && (
                          <span className="ml-auto text-chart-3 text-[10px] font-bold">✓</span>
                        )}
                        {showBadge && (
                          <Badge
                            variant="secondary"
                            className="ml-auto text-[10px] px-1.5 py-0 h-4 bg-primary/15 text-primary"
                          >
                            {todayDone}/{todayTotal}
                          </Badge>
                        )}
                        {showProBadge && (
                          <Badge
                            variant="outline"
                            className="ml-auto text-[10px] px-1.5 py-0 h-4 border-primary/30 text-primary bg-primary/5"
                            data-testid="badge-ai-coach-pro"
                          >
                            Pro
                          </Badge>
                        )}
                        {showEliteBadge && (
                          <Badge
                            className="ml-auto text-[10px] px-1.5 py-0 h-4 bg-amber-500/20 text-amber-700 dark:text-amber-300 border-0"
                            data-testid="badge-workspace-elite"
                          >
                            Elite
                          </Badge>
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Quick-add group */}
        <SidebarGroup className="mt-auto pt-3">
          <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground px-3 mb-1 uppercase tracking-wider">
            Quick Add
          </SidebarGroupLabel>
          <SidebarGroupContent className="px-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2 text-xs h-8"
                  data-testid="button-quick-add"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Build or add something...
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="right" align="end" className="w-48">
                <DropdownMenuItem asChild>
                  <Link href="/systems/new" data-testid="quick-add-system">
                    <Zap className="w-3.5 h-3.5 mr-2 text-primary" />
                    New System
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/goals" data-testid="quick-add-goal">
                    <Target className="w-3.5 h-3.5 mr-2 text-chart-2" />
                    New Goal
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/journal" data-testid="quick-add-journal">
                    <BookOpen className="w-3.5 h-3.5 mr-2 text-chart-4" />
                    New Journal Entry
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-3">
        <div className="flex items-center gap-3 px-1 py-2">
          <Avatar className="w-8 h-8 flex-shrink-0">
            <AvatarFallback className="text-xs bg-primary text-primary-foreground font-bold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate text-sidebar-foreground leading-tight">
              {user?.name || "User"}
            </p>
            <p className="text-xs text-muted-foreground truncate leading-tight">{user?.email}</p>
          </div>
          <div className="flex gap-1">
            <Link href="/settings">
              <Button size="icon" variant="ghost" className="w-7 h-7" data-testid="nav-settings" title="Settings">
                <Settings className="w-3.5 h-3.5" />
              </Button>
            </Link>
            <Button
              size="icon"
              variant="ghost"
              className="w-7 h-7"
              onClick={handleLogout}
              data-testid="button-logout"
              title="Sign out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
