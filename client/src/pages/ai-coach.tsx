import { useState, useRef, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAppStore } from "@/store/auth.store";
import type { System, Checkin } from "@/types/schema";
import { getSystems } from "@/services/systems.service";
import { getCheckins } from "@/services/checkins.service";
import { chatWithCoach, type ChatMessage } from "@/services/ai.service";
import { computeAnalytics } from "@/services/analytics.service";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Bot, Send, Sparkles, User, Loader2, RefreshCw, Flame,
} from "lucide-react";
import { cn } from "@/lib/utils";

const STARTER_QUESTIONS = [
  "Why do I keep breaking my habits?",
  "How do I stay consistent when I have no motivation?",
  "Help me design a better trigger for my habit.",
  "What should my minimum action be?",
  "How do I recover after missing several days?",
  "What does the science say about habit stacking?",
  "My streak broke — what should I do now?",
  "How can I make my habit harder to skip?",
];

export default function AiCoach() {
  const { user } = useAppStore();
  const userId = user?.id ?? "";
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "Hi! I'm your AI habit coach. I know about your systems and can help you design better habits, stay consistent, and work through any challenges. What's on your mind?",
    },
  ]);
  const [loading, setLoading] = useState(false);

  const { data: systems = [] } = useQuery<System[]>({
    queryKey: ["systems", userId],
    queryFn: () => getSystems(userId),
    enabled: !!userId,
  });

  const { data: allCheckins = [] } = useQuery<Checkin[]>({
    queryKey: ["checkins", userId],
    queryFn: () => getCheckins(userId),
    enabled: !!userId,
  });

  const analytics = useMemo(
    () => computeAnalytics(allCheckins, systems, []),
    [allCheckins, systems],
  );

  const activeSystems = systems.filter(s => s.active);
  const bestStreak = Math.max(0, ...Object.values(analytics.streaks).map(Number));
  const systemNames = activeSystems.map(s => s.title);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const sendMessage = async (content: string) => {
    if (!content.trim() || loading) return;
    setInput("");
    const userMsg: ChatMessage = { role: "user", content: content.trim() };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setLoading(true);
    try {
      const reply = await chatWithCoach(updatedMessages, {
        systemNames,
        bestStreak,
        userName: user?.name,
      });
      setMessages(prev => [...prev, { role: "assistant", content: reply }]);
    } catch (err: any) {
      toast({
        title: "Couldn't reach AI coach",
        description: err?.message ?? "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const resetChat = () => {
    setMessages([messages[0]]);
    setInput("");
    setTimeout(() => textareaRef.current?.focus(), 50);
  };

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Bot className="w-4 h-4 text-primary" />
          </div>
          AI Habit Coach
        </h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Personalized coaching powered by AI — ask anything about your habits
        </p>
      </div>

      {/* Context: active systems + streak */}
      {(activeSystems.length > 0 || bestStreak > 0) && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">Coaching context:</span>
          {activeSystems.slice(0, 4).map(s => (
            <Badge key={s.id} variant="secondary" className="text-xs">
              {s.title}
            </Badge>
          ))}
          {activeSystems.length > 4 && (
            <Badge variant="secondary" className="text-xs">
              +{activeSystems.length - 4} more
            </Badge>
          )}
          {bestStreak > 0 && (
            <Badge
              variant="outline"
              className="text-xs text-primary border-primary/30 flex items-center gap-1"
            >
              <Flame className="w-3 h-3" />
              {bestStreak}d streak
            </Badge>
          )}
        </div>
      )}

      {/* Chat messages */}
      <div
        className="space-y-4 min-h-[280px] max-h-[480px] overflow-y-auto pr-1 scroll-smooth"
        data-testid="ai-coach-messages"
      >
        {messages.map((msg, i) => (
          <div
            key={i}
            className={cn("flex gap-3", msg.role === "user" && "flex-row-reverse")}
            data-testid={`ai-message-${msg.role}-${i}`}
          >
            {/* Avatar */}
            <div
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5",
                msg.role === "assistant"
                  ? "bg-primary/10 border border-primary/20"
                  : "bg-muted border border-border",
              )}
            >
              {msg.role === "assistant" ? (
                <Bot className="w-4 h-4 text-primary" />
              ) : (
                <User className="w-4 h-4 text-muted-foreground" />
              )}
            </div>

            {/* Bubble */}
            <div
              className={cn(
                "rounded-2xl px-4 py-3 text-sm leading-relaxed max-w-[82%]",
                msg.role === "assistant"
                  ? "bg-card border border-border/60 text-foreground"
                  : "bg-primary text-primary-foreground",
              )}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {/* Thinking indicator */}
        {loading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-primary/10 border border-primary/20">
              <Bot className="w-4 h-4 text-primary" />
            </div>
            <div className="bg-card border border-border/60 rounded-2xl px-4 py-3 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Thinking…</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Starter questions — only shown before first user message */}
      {messages.length === 1 && !loading && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
            <Sparkles className="w-3 h-3" />
            Try asking…
          </p>
          <div className="flex flex-wrap gap-2">
            {STARTER_QUESTIONS.map(q => (
              <button
                key={q}
                onClick={() => sendMessage(q)}
                className="text-xs px-3 py-1.5 rounded-lg border border-border bg-muted/40 hover:bg-primary/8 hover:border-primary/30 hover:text-primary transition-all text-left"
                data-testid={`starter-question-${q.slice(0, 20).replace(/\s/g, "-")}`}
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input area */}
      <div className="flex gap-2 items-end">
        <Textarea
          ref={textareaRef}
          placeholder="Ask your coach anything… (Enter to send, Shift+Enter for new line)"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={2}
          className="resize-none text-sm flex-1"
          data-testid="input-ai-coach"
        />
        <Button
          onClick={() => sendMessage(input)}
          disabled={!input.trim() || loading}
          className="self-end h-10 w-10 p-0 flex-shrink-0"
          data-testid="button-send-ai-coach"
          aria-label="Send message"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </Button>
      </div>

      {/* Reset */}
      {messages.length > 1 && (
        <div className="text-center">
          <button
            onClick={resetChat}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5 mx-auto"
            data-testid="button-reset-coach"
          >
            <RefreshCw className="w-3 h-3" />
            Start a new conversation
          </button>
        </div>
      )}
    </div>
  );
}
