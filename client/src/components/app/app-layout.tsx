/**
 * app-layout.tsx — Authenticated app shell layout
 *
 * Wraps every authenticated page with the sidebar + sticky header.
 * The sidebar is provided by shadcn/ui SidebarProvider and AppSidebar.
 * The header contains the sidebar toggle trigger and theme toggle button.
 *
 * Phase 5 — Accessibility additions:
 *  - Skip-to-content link (keyboard users bypass nav in one Tab press)
 *  - aria-live polite region for async status announcements
 *  - Semantic landmarks: <header aria-label>, <main id + tabIndex>
 *  - Descriptive aria-label on every icon-only interactive element
 */

import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { AiChatWidget } from "@/components/ai/ai-chat";
import { Button } from "@/components/ui/button";
import { Moon, Sun, Monitor } from "lucide-react";
import { useTheme } from "@/components/theme-provider";

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const next = theme === "light" ? "dark" : theme === "dark" ? "system" : "light";
  const Icon = theme === "light" ? Sun : theme === "dark" ? Moon : Monitor;
  const label = `Switch to ${next} mode`;
  return (
    <Button
      size="icon"
      variant="ghost"
      onClick={() => setTheme(next)}
      data-testid="button-theme-toggle"
      aria-label={label}
      title={label}
      data-touch-target="compact"
      className="h-9 w-9 rounded-lg"
    >
      <Icon className="w-4 h-4" aria-hidden="true" />
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
      {/* Phase 5 — Skip link: visible only on keyboard focus, bypasses nav */}
      <a href="#main-content" className="skip-to-content">
        Skip to main content
      </a>

      <div className="flex h-screen w-full overflow-hidden">
        {/* AppSidebar renders a <nav> landmark internally via shadcn/ui Sidebar */}
        <AppSidebar />

        <div className="flex flex-col flex-1 min-w-0">
          {/* Phase 5 — <header> landmark */}
          <header
            aria-label="Application header"
            className="flex items-center justify-between px-4 py-2 border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-50"
          >
            <SidebarTrigger
              data-testid="button-sidebar-toggle"
              aria-label="Toggle navigation sidebar"
            />
            <ThemeToggle />
          </header>

          {/* Phase 5 — <main> with id for skip-link target; tabIndex=-1 lets focus move here */}
          <main
            id="main-content"
            tabIndex={-1}
            className="flex-1 overflow-y-auto focus:outline-none"
            aria-label="Main content"
          >
            {children}
          </main>

          {/* Phase 5 — Polite live region: screen readers announce status changes */}
          <div
            role="status"
            aria-live="polite"
            aria-atomic="true"
            className="sr-only"
            id="live-region"
          />
        </div>
      </div>

      {/* AI floating chat widget */}
      <AiChatWidget />
    </SidebarProvider>
  );
}
