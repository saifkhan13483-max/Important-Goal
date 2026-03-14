/**
 * app-layout.tsx — Authenticated app shell layout
 *
 * Wraps every authenticated page with the sidebar + sticky header.
 * The sidebar is provided by shadcn/ui SidebarProvider and AppSidebar.
 * The header contains the sidebar toggle trigger and theme toggle button.
 */

import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Button } from "@/components/ui/button";
import { Moon, Sun, Monitor } from "lucide-react";
import { useTheme } from "@/components/theme-provider";

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const next = theme === "light" ? "dark" : theme === "dark" ? "system" : "light";
  const Icon = theme === "light" ? Sun : theme === "dark" ? Moon : Monitor;
  return (
    <Button
      size="icon"
      variant="ghost"
      onClick={() => setTheme(next)}
      data-testid="button-theme-toggle"
      aria-label={`Switch to ${next} mode`}
    >
      <Icon className="w-4 h-4" />
    </Button>
  );
}

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const style = { "--sidebar-width": "17rem", "--sidebar-width-icon": "3.5rem" };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full overflow-hidden">
        <AppSidebar />
        <div className="flex flex-col flex-1 min-w-0">
          <header className="flex items-center justify-between px-4 py-2 border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-50">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <ThemeToggle />
          </header>
          <main className="flex-1 overflow-y-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
