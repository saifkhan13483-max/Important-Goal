import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAppStore } from "@/store/auth.store";
import { getNotifications, markNotificationRead, markAllRead } from "@/services/notifications.service";
import type { AppNotification } from "@/types/schema";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Bell, Trophy, Flame, Users, Gift, Sparkles, CheckCircle2, BellOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { Link } from "wouter";

const TYPE_ICONS: Record<AppNotification["type"], React.ReactNode> = {
  achievement: <Trophy className="w-3.5 h-3.5 text-yellow-500" />,
  streak: <Flame className="w-3.5 h-3.5 text-orange-500" />,
  partner: <Users className="w-3.5 h-3.5 text-blue-500" />,
  referral: <Gift className="w-3.5 h-3.5 text-green-500" />,
  system: <Sparkles className="w-3.5 h-3.5 text-primary" />,
  weekly_report: <CheckCircle2 className="w-3.5 h-3.5 text-chart-3" />,
};

export function NotificationsCenter() {
  const [open, setOpen] = useState(false);
  const { user } = useAppStore();
  const userId = user?.id ?? "";
  const qc = useQueryClient();

  const { data: notifications = [] } = useQuery<AppNotification[]>({
    queryKey: ["notifications", userId],
    queryFn: () => getNotifications(userId),
    enabled: !!userId,
    refetchInterval: 60_000,
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  const markReadMutation = useMutation({
    mutationFn: (id: string) => markNotificationRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications", userId] }),
  });

  const markAllMutation = useMutation({
    mutationFn: () => markAllRead(userId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications", userId] }),
  });

  const handleOpen = (isOpen: boolean) => {
    setOpen(isOpen);
  };

  return (
    <Popover open={open} onOpenChange={handleOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="w-7 h-7 relative"
          title="Notifications"
          data-testid="button-notifications"
        >
          <Bell className="w-3.5 h-3.5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold flex items-center justify-center leading-none">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-80 p-0"
        align="end"
        data-testid="notifications-popover"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="font-semibold text-sm">Notifications</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-6 px-2 text-muted-foreground hover:text-foreground"
              onClick={() => markAllMutation.mutate()}
              data-testid="button-mark-all-read"
            >
              Mark all read
            </Button>
          )}
        </div>

        {notifications.length === 0 ? (
          <div className="py-10 flex flex-col items-center gap-3 text-center px-4">
            <BellOff className="w-8 h-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No notifications yet</p>
            <p className="text-xs text-muted-foreground/70">Achievements, streaks, and partner updates will appear here.</p>
          </div>
        ) : (
          <ScrollArea className="max-h-80">
            <div className="divide-y divide-border">
              {notifications.map(notif => (
                <div
                  key={notif.id}
                  className={cn(
                    "flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-muted/40 transition-colors",
                    !notif.read && "bg-primary/5",
                  )}
                  onClick={() => {
                    if (!notif.read) markReadMutation.mutate(notif.id);
                  }}
                  data-testid={`notification-${notif.id}`}
                >
                  <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center flex-shrink-0 mt-0.5">
                    {TYPE_ICONS[notif.type]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <p className="text-sm font-semibold leading-tight">{notif.title}</p>
                      {!notif.read && (
                        <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{notif.message}</p>
                    <p className="text-[10px] text-muted-foreground/60 mt-1">
                      {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true })}
                    </p>
                    {notif.href && (
                      <Link href={notif.href}>
                        <span className="text-xs text-primary font-medium mt-1 inline-block hover:underline">
                          View →
                        </span>
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </PopoverContent>
    </Popover>
  );
}
