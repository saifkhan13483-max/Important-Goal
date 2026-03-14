import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import type { System, Checkin } from "@/types/schema";
import { getSystems } from "@/services/systems.service";
import { getCheckinsByDate, upsertCheckin } from "@/services/checkins.service";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { CheckSquare, Check, Minus, X, Flame, Zap, MessageSquare, ChevronDown, ChevronUp } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

function getTodayKey() {
  return new Date().toISOString().split("T")[0];
}

const STATUS_CONFIG = {
  done: { label: "Done", icon: Check, color: "text-chart-3", bg: "bg-chart-3/10 border-chart-3/20" },
  partial: { label: "Partial", icon: Minus, color: "text-chart-4", bg: "bg-chart-4/10 border-chart-4/20" },
  missed: { label: "Missed", icon: X, color: "text-destructive", bg: "bg-destructive/10 border-destructive/20" },
};

function SystemCheckinCard({ system, existingCheckin, userId }: { system: System; existingCheckin?: Checkin; userId: string }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [showNote, setShowNote] = useState(false);
  const [note, setNote] = useState(existingCheckin?.note || "");
  const today = getTodayKey();

  const checkInMutation = useMutation({
    mutationFn: (status: string) =>
      upsertCheckin(userId, system.id, today, { status, note: note || undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["checkins-today", userId, today] });
      qc.invalidateQueries({ queryKey: ["checkins", userId] });
      toast({ title: "Checked in!" });
    },
  });

  const current = existingCheckin?.status as keyof typeof STATUS_CONFIG | undefined;

  return (
    <Card className={cn("transition-all", current === "done" ? "ring-1 ring-chart-3/30" : "")} data-testid={`checkin-card-${system.id}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0">
            <p className="font-medium text-sm">{system.title}</p>
            {system.triggerStatement && (
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{system.triggerStatement}</p>
            )}
          </div>
          {current && (
            <Badge variant="outline" className={`text-xs flex-shrink-0 ${STATUS_CONFIG[current]?.bg}`}>
              {STATUS_CONFIG[current]?.label}
            </Badge>
          )}
        </div>

        {system.minimumAction && (
          <div className="bg-muted/40 rounded-md px-3 py-2 mb-3">
            <p className="text-xs text-muted-foreground font-medium">Today's action</p>
            <p className="text-xs mt-0.5">{system.minimumAction}</p>
          </div>
        )}

        <div className="flex gap-2 flex-wrap">
          {(Object.keys(STATUS_CONFIG) as (keyof typeof STATUS_CONFIG)[]).map(status => {
            const cfg = STATUS_CONFIG[status];
            const Icon = cfg.icon;
            const isSelected = current === status;
            return (
              <Button
                key={status}
                variant={isSelected ? "default" : "outline"}
                size="sm"
                onClick={() => checkInMutation.mutate(status)}
                disabled={checkInMutation.isPending}
                className="gap-1.5"
                data-testid={`button-checkin-${status}-${system.id}`}
              >
                <Icon className="w-3.5 h-3.5" />
                {cfg.label}
              </Button>
            );
          })}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowNote(n => !n)}
            className="gap-1.5 ml-auto"
            data-testid={`button-checkin-note-${system.id}`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            Note
            {showNote ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </Button>
        </div>

        {showNote && (
          <div className="mt-3 space-y-2">
            <Textarea
              placeholder="How did it go? What did you notice?"
              value={note}
              onChange={e => setNote(e.target.value)}
              rows={2}
              className="text-sm"
              data-testid={`input-checkin-note-${system.id}`}
            />
            {current && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => checkInMutation.mutate(current)}
                data-testid={`button-save-note-${system.id}`}
              >
                Save note
              </Button>
            )}
          </div>
        )}

        {current === "missed" && system.fallbackPlan && (
          <div className="mt-3 p-3 rounded-md bg-chart-4/10 border border-chart-4/20">
            <p className="text-xs font-medium text-chart-4 mb-0.5">Fallback plan</p>
            <p className="text-xs text-foreground">{system.fallbackPlan}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function Checkins() {
  const { user } = useAuth();
  const userId = user?.id ?? "";
  const today = getTodayKey();

  const { data: systems = [], isLoading: systemsLoading } = useQuery<System[]>({
    queryKey: ["systems", userId],
    queryFn: () => getSystems(userId),
    enabled: !!userId,
  });

  const { data: todayCheckins = [], isLoading: checkinsLoading } = useQuery<Checkin[]>({
    queryKey: ["checkins-today", userId, today],
    queryFn: () => getCheckinsByDate(userId, today),
    enabled: !!userId,
  });

  const activeSystems = systems.filter(s => s.active);
  const doneCount = todayCheckins.filter(c => c.status === "done").length;
  const totalCount = activeSystems.length;
  const completionPct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

  const getCheckin = (systemId: string) => todayCheckins.find(c => c.systemId === systemId);

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Daily Check-ins</h1>
        <p className="text-muted-foreground text-sm mt-0.5">{format(new Date(), "EEEE, MMMM d, yyyy")}</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-chart-3">{doneCount}</p>
            <p className="text-xs text-muted-foreground">Done</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{totalCount}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-primary">{completionPct}%</p>
            <p className="text-xs text-muted-foreground">Complete</p>
          </CardContent>
        </Card>
      </div>

      {completionPct === 100 && totalCount > 0 && (
        <div className="p-4 rounded-xl gradient-brand text-white text-center">
          <Flame className="w-8 h-8 mx-auto mb-2" />
          <p className="font-bold text-lg">Perfect day!</p>
          <p className="text-white/80 text-sm">You completed all your systems today. Keep the streak going!</p>
        </div>
      )}

      {systemsLoading || checkinsLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}
        </div>
      ) : activeSystems.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <CheckSquare className="w-7 h-7 text-primary" />
            </div>
            <h3 className="font-semibold mb-2">No active systems</h3>
            <p className="text-muted-foreground text-sm mb-4">
              Build your first system to start tracking your daily actions.
            </p>
            <Button asChild>
              <a href="/systems/new" data-testid="button-go-build-system">Build a System</a>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {activeSystems.map(system => (
            <SystemCheckinCard
              key={system.id}
              system={system}
              existingCheckin={getCheckin(system.id)}
              userId={userId}
            />
          ))}
        </div>
      )}
    </div>
  );
}
