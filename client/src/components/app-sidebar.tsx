import { Link, useLocation } from "wouter";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard, Target, Zap, CheckSquare, BarChart2, BookOpen, Settings,
  Sparkles, LogOut, LayoutGrid,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

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
];

export function AppSidebar() {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const { toast } = useToast();

  const handleLogout = async () => {
    await logout();
    toast({ title: "Logged out", description: "See you soon!" });
  };

  const initials = user?.name
    ? user.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
    : "SF";

  return (
    <Sidebar>
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

      <SidebarContent className="py-3">
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground px-3 mb-1 uppercase tracking-wider">
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const isActive = location === item.url || location.startsWith(item.url + "/");
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive}>
                      <Link
                        href={item.url}
                        data-testid={`nav-${item.title.toLowerCase().replace(/ /g, "-").replace(/'/g, "")}`}
                        title={item.hint}
                      >
                        <item.icon className="w-4 h-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
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
