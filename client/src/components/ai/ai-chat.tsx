import { useState, useRef, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAppStore } from "@/store/auth.store";
import { getSystems } from "@/services/systems.service";
import { getCheckins } from "@/services/checkins.service";
import { chatWithCoach, type ChatMessage } from "@/services/ai.service";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Bot, Send, X, MessageCircle, Loader2, Minimize2, User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getPlanFeatures } from "@/lib/plan-limits";
import type { System, Checkin } from "@/types/schema";

const STARTER_QUESTIONS = [
  "How do I stay consistent?",
  "Help me design a better trigger",
  "How do I recover after missing days?",
  "What's my minimum action for tomorrow?",
];

function renderInline(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith("**") && part.endsWith("**") ? (
          <strong key={i}>{part.slice(2, -2)}</strong>
        ) : (
          part
        )
      )}
    </>
  );
}

function parseMarkdown(text: string) {
  const lines = text.split("\n");
  const elements: JSX.Element[] = [];
  lines.forEach((line, idx) => {
    if (line.startsWith("### ")) {
      elements.push(
        <p key={idx} className="font-semibold text-xs mt-1.5 first:mt-0">
          {renderInline(line.slice(4))}
        </p>
      );
    } else if (line.startsWith("## ")) {
      elements.push(
        <p key={idx} className="font-bold text-xs mt-1.5 first:mt-0">
          {renderInline(line.slice(3))}
        </p>
      );
    } else if (line.startsWith("**") && line.endsWith("**") && line.length > 4) {
      elements.push(
        <p key={idx} className="font-semibold mt-1 first:mt-0">
          {line.slice(2, -2)}
        </p>
      );
    } else if (line.match(/^[\-\*•]\s/)) {
      elements.push(
        <li key={idx} className="ml-3 list-disc list-outside">
          {renderInline(line.replace(/^[\-\*•]\s/, ""))}
        </li>
      );
    } else if (line.match(/^\d+\.\s/)) {
      elements.push(
        <li key={idx} className="ml-3 list-decimal list-outside">
          {renderInline(line.replace(/^\d+\.\s/, ""))}
        </li>
      );
    } else if (line.startsWith("> ")) {
      elements.push(
        <p key={idx} className="border-l-2 border-primary/40 pl-2 italic text-muted-foreground">
          {renderInline(line.slice(2))}
        </p>
      );
    } else if (line.trim() === "") {
      if (idx > 0 && lines[idx - 1].trim() !== "") {
        elements.push(<div key={idx} className="h-1" />);
      }
    } else {
      elements.push(<p key={idx}>{renderInline(line)}</p>);
    }
  });
  return elements;
}

export function AiChatWidget() {
  const { user } = useAppStore();
  const userId = user?.id ?? "";
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const features = getPlanFeatures(user?.plan);

  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");

  const welcomeMessage = useMemo(() => {
    const name = user?.name ? `, ${user.name.split(" ")[0]}` : "";
    return `Hi${name}! I'm your AI habit coach. Ask me anything about building better habits or staying consistent.`;
  }, [user?.name]);

  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", content: welcomeMessage },
  ]);
  const [loading, setLoading] = useState(false);

  const { data: systems = [] } = useQuery<System[]>({
    queryKey: ["systems", userId],
    queryFn: () => getSystems(userId),
    enabled: !!userId && open,
  });

  const { data: allCheckins = [] } = useQuery<Checkin[]>({
    queryKey: ["checkins", userId],
    queryFn: () => getCheckins(userId),
    enabled: !!userId && open,
  });

  const activeSystems = systems.filter((s) => s.active);
  const systemNames = activeSystems.map((s) => s.title);

  const bestStreak = useMemo(() => {
    if (!allCheckins.length) return 0;
    const grouped: Record<string, string[]> = {};
    for (const c of allCheckins) {
      if (!grouped[c.systemId]) grouped[c.systemId] = [];
      if (c.status === "done") grouped[c.systemId].push(c.dateKey);
    }
    let best = 0;
    for (const dates of Object.values(grouped)) {
      const sorted = dates.sort();
      let streak = 1;
      let max = 1;
      for (let i = 1; i < sorted.length; i++) {
        const prev = new Date(sorted[i - 1]);
        const curr = new Date(sorted[i]);
        const diff = (curr.getTime() - prev.getTime()) / 86400000;
        streak = diff === 1 ? streak + 1 : 1;
        max = Math.max(max, streak);
      }
      best = Math.max(best, max);
    }
    return best;
  }, [allCheckins]);

  const avgCompletion = useMemo(() => {
    if (!allCheckins.length) return 0;
    const done = allCheckins.filter((c) => c.status === "done").length;
    return Math.round((done / allCheckins.length) * 100);
  }, [allCheckins]);

  const consecutiveMissedDays = useMemo(() => {
    if (!allCheckins.length) return 0;
    const today = new Date();
    let missed = 0;
    for (let i = 1; i <= 7; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const dayCheckins = allCheckins.filter((c) => c.dateKey === key);
      const hasDone = dayCheckins.some((c) => c.status === "done" || c.status === "partial");
      if (!hasDone && activeSystems.length > 0) {
        missed++;
      } else {
        break;
      }
    }
    return missed;
  }, [allCheckins, activeSystems]);

  useEffect(() => {
    if (open) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, loading, open]);

  useEffect(() => {
    if (open) {
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  }, [open]);

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
        avgCompletion,
        consecutiveMissedDays,
      });
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch (err: any) {
      toast({
        title: "AI coach unavailable",
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

  const [location] = useLocation();
  if (!userId || !features.aiCoach || location === "/ai-coach") return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3">
      {open && (
        <div
          className="w-[340px] sm:w-[380px] bg-background border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-slide-up"
          style={{ maxHeight: "520px" }}
          role="dialog"
          aria-label="AI habit coach chat"
          data-testid="ai-chat-widget"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                <Bot className="w-3.5 h-3.5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold leading-tight">AI Habit Coach</p>
                <p className="text-[10px] text-muted-foreground leading-tight">
                  {activeSystems.length > 0
                    ? `${activeSystems.length} active system${activeSystems.length !== 1 ? "s" : ""}`
                    : "Ready to help"}
                </p>
              </div>
            </div>
            <Button
              size="icon"
              variant="ghost"
              className="w-7 h-7"
              onClick={() => setOpen(false)}
              data-testid="button-ai-chat-close"
              aria-label="Close chat"
            >
              <Minimize2 className="w-3.5 h-3.5" />
            </Button>
          </div>

          {/* Messages */}
          <div
            className="flex-1 overflow-y-auto p-4 space-y-3 scroll-smooth"
            style={{ minHeight: "200px" }}
            data-testid="ai-chat-messages"
          >
            {messages.map((msg, i) => (
              <div
                key={i}
                className={cn("flex gap-2", msg.role === "user" && "flex-row-reverse")}
                data-testid={`ai-widget-message-${msg.role}-${i}`}
              >
                <div
                  className={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5",
                    msg.role === "assistant"
                      ? "bg-primary/10 border border-primary/20"
                      : "bg-muted border border-border",
                  )}
                >
                  {msg.role === "assistant" ? (
                    <Bot className="w-3 h-3 text-primary" />
                  ) : (
                    <User className="w-3 h-3 text-muted-foreground" />
                  )}
                </div>
                <div
                  className={cn(
                    "rounded-2xl px-3 py-2 text-xs leading-relaxed max-w-[85%]",
                    msg.role === "assistant"
                      ? "bg-muted/60 border border-border/40 text-foreground"
                      : "bg-primary text-primary-foreground",
                  )}
                >
                  {msg.role === "assistant" ? (
                    <div className="space-y-0.5">{parseMarkdown(msg.content)}</div>
                  ) : (
                    msg.content
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex gap-2">
                <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 bg-primary/10 border border-primary/20">
                  <Bot className="w-3 h-3 text-primary" />
                </div>
                <div className="bg-muted/60 border border-border/40 rounded-2xl px-3 py-2 flex items-center gap-1.5">
                  <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
                  <span className="text-[11px] text-muted-foreground">Thinking…</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Starter questions */}
          {messages.length === 1 && !loading && (
            <div className="px-4 pb-2 flex flex-wrap gap-1.5">
              {STARTER_QUESTIONS.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => sendMessage(q)}
                  className="text-[11px] px-2.5 py-1 rounded-lg border border-border bg-muted/40 hover:bg-primary/8 hover:border-primary/30 hover:text-primary transition-all"
                  data-testid={`ai-widget-starter-${q.slice(0, 15).replace(/\s/g, "-")}`}
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="flex gap-2 items-end p-3 border-t border-border">
            <Textarea
              ref={textareaRef}
              placeholder="Ask anything… (Enter to send)"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              className="resize-none text-xs flex-1 min-h-0"
              data-testid="input-ai-chat-widget"
              style={{ lineHeight: "1.5", paddingTop: "8px", paddingBottom: "8px" }}
            />
            <Button
              size="icon"
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || loading}
              className="flex-shrink-0 h-9 w-9"
              data-testid="button-ai-chat-send"
              aria-label="Send message"
            >
              {loading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Toggle button */}
      <Button
        size="icon"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "w-12 h-12 rounded-full shadow-lg transition-all",
          open ? "bg-muted text-muted-foreground border border-border hover:bg-muted/80" : "",
        )}
        data-testid="button-ai-chat-toggle"
        aria-label={open ? "Close AI coach" : "Open AI habit coach"}
        title={open ? "Close" : "AI Habit Coach"}
      >
        {open ? <X className="w-5 h-5" /> : <MessageCircle className="w-5 h-5" />}
      </Button>
    </div>
  );
}
