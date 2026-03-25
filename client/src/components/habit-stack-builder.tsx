import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { System } from "@/types/schema";
import { updateSystem } from "@/services/systems.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  GripVertical, Layers, ChevronUp, ChevronDown, Zap, Clock,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface HabitStackBuilderProps {
  systems: System[];
  userId: string;
}

export function HabitStackBuilder({ systems, userId }: HabitStackBuilderProps) {
  const activeSystems = systems.filter(s => s.active !== false);
  const { toast } = useToast();
  const qc = useQueryClient();

  const [orderedSystems, setOrderedSystems] = useState<System[]>(() => {
    return [...activeSystems].sort((a, b) => {
      const aOrder = a.stackOrder ?? 999;
      const bOrder = b.stackOrder ?? 999;
      return aOrder - bOrder;
    });
  });

  const saveMutation = useMutation({
    mutationFn: async (systems: System[]) => {
      await Promise.all(
        systems.map((s, idx) =>
          updateSystem(s.id, { stackOrder: idx + 1, stackGroupId: `${userId}-stack` }),
        ),
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["systems", userId] });
      toast({ title: "Habit stack saved!", description: "Your systems are now ordered in sequence." });
    },
    onError: (err: any) => {
      toast({ title: "Error saving stack", description: err.message, variant: "destructive" });
    },
  });

  const moveUp = (idx: number) => {
    if (idx === 0) return;
    const newOrder = [...orderedSystems];
    [newOrder[idx - 1], newOrder[idx]] = [newOrder[idx], newOrder[idx - 1]];
    setOrderedSystems(newOrder);
  };

  const moveDown = (idx: number) => {
    if (idx === orderedSystems.length - 1) return;
    const newOrder = [...orderedSystems];
    [newOrder[idx], newOrder[idx + 1]] = [newOrder[idx + 1], newOrder[idx]];
    setOrderedSystems(newOrder);
  };

  if (activeSystems.length < 2) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Layers className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm font-semibold text-muted-foreground">Need at least 2 active systems</p>
          <p className="text-xs text-muted-foreground mt-1">Create more systems to build a habit stack.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Layers className="w-4 h-4 text-primary" />
          Habit Stack Order
        </CardTitle>
        <p className="text-xs text-muted-foreground mt-1">
          Arrange your systems in the order you want to do them each day. Each one triggers the next.
        </p>
      </CardHeader>
      <CardContent className="space-y-2">
        {orderedSystems.map((system, idx) => (
          <div
            key={system.id}
            className="flex items-center gap-3 p-3 rounded-xl border bg-card hover:bg-muted/30 transition-colors"
            data-testid={`habit-stack-item-${system.id}`}
          >
            <div className="flex flex-col items-center gap-0.5">
              <span className="text-xs font-bold text-muted-foreground w-5 text-center">{idx + 1}</span>
              <GripVertical className="w-3.5 h-3.5 text-muted-foreground/40" />
            </div>

            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm truncate">{system.title}</p>
              {system.minimumAction && (
                <p className="text-xs text-muted-foreground truncate mt-0.5">{system.minimumAction}</p>
              )}
              <div className="flex items-center gap-2 mt-1">
                {system.preferredTime && (
                  <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <Clock className="w-2.5 h-2.5" />
                    {system.preferredTime}
                  </span>
                )}
                {system.triggerStatement && (
                  <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <Zap className="w-2.5 h-2.5" />
                    Has trigger
                  </span>
                )}
              </div>
            </div>

            {idx < orderedSystems.length - 1 && (
              <Badge variant="outline" className="text-[10px] shrink-0">→ next</Badge>
            )}

            <div className="flex flex-col gap-0.5">
              <Button
                variant="ghost"
                size="icon"
                className="w-6 h-6"
                onClick={() => moveUp(idx)}
                disabled={idx === 0}
                data-testid={`habit-stack-up-${system.id}`}
              >
                <ChevronUp className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="w-6 h-6"
                onClick={() => moveDown(idx)}
                disabled={idx === orderedSystems.length - 1}
                data-testid={`habit-stack-down-${system.id}`}
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        ))}

        <div className="pt-2 flex gap-2">
          <Button
            className="flex-1"
            onClick={() => saveMutation.mutate(orderedSystems)}
            disabled={saveMutation.isPending}
            data-testid="button-save-habit-stack"
          >
            {saveMutation.isPending ? "Saving..." : "Save Stack Order"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
