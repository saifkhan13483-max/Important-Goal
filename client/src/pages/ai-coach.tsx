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
  Bot, Send, Sparkles, User, RefreshCw, Flame,
  Copy, Check, ChevronRight, Brain, Target, Zap,
  TrendingUp, Clock, MessageSquare, Lightbulb,
} from "lucide-react";
import { cn } from "@/lib/utils";

const PROMPT_CATEGORIES = [
  {
    label: "Consistency",
    icon: TrendingUp,
    color: "text-blue-500",
    bg: "bg-blue-50 dark:bg-blue-950/30",
    border: "border-blue-200 dark:border-blue-800",
    questions: [
      "Why do I keep breaking my habits?",
      "How do I stay consistent when I have no motivation?",
      "How can I make my habit harder to skip?",
    ],
  },
  {
    label: "Design",
    icon: Target,
    color: "text-violet-500",
    bg: "bg-violet-50 dark:bg-violet-950/30",
    border: "border-violet-200 dark:border-violet-800",
    questions: [
      "Help me design a better trigger for my habit.",
      "What should my minimum action be?",
      "What does the science say about habit stacking?",
    ],
  },
  {
    label: "Recovery",
    icon: Zap,
    color: "text-amber-500",
    bg: "bg-amber-50 dark:bg-amber-950/30",
    border: "border-amber-200 dark:border-amber-800",
    questions: [
      "How do I recover after missing several days?",
      "My streak broke — what should I do now?",
      "How do I deal with guilt after skipping?",
    ],
  },
  {
    label: "Mindset",
    icon: Brain,
    color: "text-emerald-500",
    bg: "bg-emerald-50 dark:bg-emerald-950/30",
    border: "border-emerald-200 dark:border-emerald-800",
    questions: [
      "How do I build an identity around my habits?",
      "What's the difference between motivation and discipline?",
      "How do I stop relying on willpower?",
    ],
  },
];

function TypingDots() {
  return (
    <div className="flex items-center gap-1 py-1">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce"
          style={{ animationDelay: `${i * 150}ms`, animationDuration: "0.8s" }}
        />
      ))}
    </div>
  );
}

function parseMarkdown(text: string) {
  const lines = text.split("\n");
  const elements: JSX.Element[] = [];
  lines.forEach((line, idx) => {
    if (line.startsWith("### ")) {
      elements.push(
        <p key={idx} className="font-semibold text-sm mt-2 first:mt-0">
          {renderInline(line.slice(4))}
        </p>
      );
    } else if (line.startsWith("## ")) {
      elements.push(
        <p key={idx} className="font-bold text-sm mt-2 first:mt-0">
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
      const content = line.replace(/^\d+\.\s/, "");
      elements.push(
        <li key={idx} className="ml-3 list-decimal list-outside">
          {renderInline(content)}
        </li>
      );
    } else if (line.startsWith("> ")) {
      elements.push(
        <p key={idx} className="border-l-2 border-primary/40 pl-3 italic text-muted-foreground">
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

function MessageBubble({
  msg,
  index,
}: {
  msg: ChatMessage & { timestamp?: Date };
  index: number;
}) {
  const [copied, setCopied] = useState(false);
  const isAssistant = msg.role === "assistant";

  const handleCopy = () => {
    navigator.clipboard.writeText(msg.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const timeStr = msg.timestamp
    ? msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : "";

  return (
    <div
      className={cn("flex gap-2 sm:gap-3 group", !isAssistant && "flex-row-reverse")}
      data-testid={`ai-message-${msg.role}-${index}`}
    >
      {/* Avatar — hidden on very small screens to save space */}
      <div
        className={cn(
          "hidden xs:flex w-7 h-7 sm:w-8 sm:h-8 rounded-full items-center justify-center flex-shrink-0 mt-0.5",
          isAssistant
            ? "bg-primary/10 border border-primary/20"
            : "bg-muted border border-border"
        )}
      >
        {isAssistant ? (
          <Bot className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
        ) : (
          <User className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground" />
        )}
      </div>

      <div className={cn("flex flex-col gap-1 max-w-[88%] sm:max-w-[80%]", !isAssistant && "items-end")}>
        <div
          className={cn(
            "rounded-2xl px-3 sm:px-4 py-2.5 sm:py-3 text-sm leading-relaxed",
            isAssistant
              ? "bg-card border border-border/60 text-foreground rounded-tl-sm"
              : "bg-primary text-primary-foreground rounded-tr-sm"
          )}
        >
          {isAssistant ? (
            <div className="space-y-0.5">{parseMarkdown(msg.content)}</div>
          ) : (
            <p>{msg.content}</p>
          )}
        </div>

        <div className={cn("flex items-center gap-2 px-1", !isAssistant && "flex-row-reverse")}>
          {timeStr && (
            <span className="text-[10px] text-muted-foreground/60">{timeStr}</span>
          )}
          {isAssistant && (
            <button
              onClick={handleCopy}
              /* Always visible on touch; hover-revealed on pointer devices */
              className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity text-muted-foreground/50 hover:text-muted-foreground"
              aria-label="Copy message"
              data-testid={`button-copy-message-${index}`}
            >
              {copied ? (
                <Check className="w-3 h-3 text-emerald-500" />
              ) : (
                <Copy className="w-3 h-3" />
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AiCoach() {
  const { user } = useAppStore();
  const userId = user?.id ?? "";
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const [input, setInput] = useState("");
  const welcomeMessage = useMemo(() => {
    const name = user?.name ? `, ${user.name.split(" ")[0]}` : "";
    return `Hi${name}! I'm your AI habit coach — I know your systems, your streaks, and where you're headed.\n\nI'm here to help you build unbreakable consistency, work through setbacks, and keep your habits aligned with your goals. No generic advice — everything I tell you is specific to you.\n\nWhat's on your mind today?`;
  }, [user?.name]);

  const [messages, setMessages] = useState<(ChatMessage & { timestamp?: Date })[]>([
    {
      role: "assistant",
      content: welcomeMessage,
      timestamp: new Date(),
    },
  ]);
  const [loading, setLoading] = useState(false);
  const [sessionMsgCount, setSessionMsgCount] = useState(0);

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
    [allCheckins, systems]
  );

  const activeSystems = systems.filter((s) => s.active);
  const bestStreak = Math.max(0, ...Object.values(analytics.streaks).map(Number));
  const systemNames = activeSystems.map((s) => s.title);
  const totalCheckins = allCheckins.length;

  const avgCompletion = useMemo(() => {
    if (!totalCheckins) return 0;
    const done = allCheckins.filter((c) => c.status === "done").length;
    return Math.round((done / totalCheckins) * 100);
  }, [allCheckins, totalCheckins]);

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
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const sendMessage = async (content: string) => {
    if (!content.trim() || loading) return;
    setInput("");
    setActiveCategory(null);
    const userMsg: ChatMessage & { timestamp: Date } = {
      role: "user",
      content: content.trim(),
      timestamp: new Date(),
    };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setLoading(true);
    setSessionMsgCount((n) => n + 1);
    try {
      const reply = await chatWithCoach(
        updatedMessages.map(({ role, content }) => ({ role, content })),
        { systemNames, bestStreak, userName: user?.name, avgCompletion, consecutiveMissedDays }
      );
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: reply, timestamp: new Date() },
      ]);
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
    setMessages([
      {
        role: "assistant",
        content: welcomeMessage,
        timestamp: new Date(),
      },
    ]);
    setInput("");
    setActiveCategory(null);
    setSessionMsgCount(0);
    setTimeout(() => textareaRef.current?.focus(), 50);
  };

  const activeCat = PROMPT_CATEGORIES.find((c) => c.label === activeCategory);
  const isFirstMessage = messages.length === 1 && !loading;

  return (
    /* h-full fills the <main> which is flex-1 in the app shell's fixed h-screen column */
    <div className="flex h-full overflow-hidden">

      {/* ── Main chat column ── */}
      <div className="flex flex-col flex-1 min-w-0">

        {/* ── Chat header ── */}
        <div className="flex items-center justify-between px-3 sm:px-6 py-3 sm:py-4 border-b border-border bg-card/50 backdrop-blur-sm flex-shrink-0">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="relative">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                <Bot className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 sm:w-3 sm:h-3 bg-emerald-500 rounded-full border-2 border-background" />
            </div>
            <div>
              <h1 className="text-sm sm:text-base font-semibold leading-tight">AI Habit Coach</h1>
              <p className="text-[11px] sm:text-xs text-muted-foreground leading-tight">
                {loading ? "Thinking…" : "Online · Ready to help"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {sessionMsgCount > 0 && (
              <Badge variant="secondary" className="hidden sm:flex text-xs gap-1">
                <MessageSquare className="w-3 h-3" />
                {sessionMsgCount} {sessionMsgCount === 1 ? "exchange" : "exchanges"}
              </Badge>
            )}
            {messages.length > 1 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={resetChat}
                className="text-xs text-muted-foreground h-8 gap-1.5 px-2 sm:px-3"
                data-testid="button-reset-coach"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">New chat</span>
              </Button>
            )}
          </div>
        </div>

        {/* ── Mobile stats strip (hidden on lg where sidebar shows this info) ── */}
        <div className="lg:hidden flex items-center gap-2 px-3 py-2 border-b border-border/50 bg-muted/20 overflow-x-auto flex-shrink-0 scrollbar-none">
          {bestStreak > 0 && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-background border border-border/50 flex-shrink-0">
              <Flame className="w-3 h-3 text-orange-500" />
              <span className="text-xs font-medium tabular-nums">{bestStreak}d streak</span>
            </div>
          )}
          {totalCheckins > 0 && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-background border border-border/50 flex-shrink-0">
              <TrendingUp className="w-3 h-3 text-blue-500" />
              <span className="text-xs font-medium tabular-nums">{avgCompletion}% avg</span>
            </div>
          )}
          {activeSystems.length > 0 && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-background border border-border/50 flex-shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span className="text-xs font-medium">
                {activeSystems.length} active {activeSystems.length === 1 ? "system" : "systems"}
              </span>
            </div>
          )}
          {activeSystems.length === 0 && bestStreak === 0 && totalCheckins === 0 && (
            <p className="text-xs text-muted-foreground/60 px-1">
              Create habits to personalise your coaching
            </p>
          )}
        </div>

        {/* ── Messages ── */}
        <div
          className="flex-1 overflow-y-auto px-3 sm:px-6 scroll-smooth"
          data-testid="ai-coach-messages"
        >
          {/* inner flex col pushes messages to the bottom when few exist */}
          <div className="flex flex-col justify-end min-h-full py-4 sm:py-5 space-y-4 sm:space-y-5">
            {messages.map((msg, i) => (
              <MessageBubble key={i} msg={msg} index={i} />
            ))}

            {loading && (
              <div className="flex gap-2 sm:gap-3">
                <div className="hidden xs:flex w-7 h-7 sm:w-8 sm:h-8 rounded-full items-center justify-center flex-shrink-0 bg-primary/10 border border-primary/20">
                  <Bot className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
                </div>
                <div className="bg-card border border-border/60 rounded-2xl rounded-tl-sm px-3 sm:px-4 py-2.5 sm:py-3">
                  <TypingDots />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* ── Quick prompts (before first user message) ── */}
        {isFirstMessage && (
          <div className="px-3 sm:px-6 pb-3 space-y-2.5 sm:space-y-3 flex-shrink-0">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
              <Sparkles className="w-3 h-3" />
              Choose a topic to get started
            </p>

            {/* Category chips — scroll horizontally on very small screens */}
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none sm:flex-wrap sm:overflow-visible">
              {PROMPT_CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                const isActive = activeCategory === cat.label;
                return (
                  <button
                    key={cat.label}
                    onClick={() => setActiveCategory(isActive ? null : cat.label)}
                    className={cn(
                      "flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-all font-medium flex-shrink-0 sm:flex-shrink",
                      isActive
                        ? cn(cat.bg, cat.border, cat.color)
                        : "border-border bg-muted/40 text-muted-foreground hover:bg-muted/80"
                    )}
                    data-testid={`category-${cat.label.toLowerCase()}`}
                  >
                    <Icon className={cn("w-3 h-3", isActive ? cat.color : "")} />
                    {cat.label}
                  </button>
                );
              })}
            </div>

            {activeCat && (
              <div className={cn("rounded-xl border p-2.5 sm:p-3 space-y-1.5", activeCat.bg, activeCat.border)}>
                {activeCat.questions.map((q) => (
                  <button
                    key={q}
                    onClick={() => sendMessage(q)}
                    className="w-full text-left text-xs px-3 py-2 rounded-lg bg-background/70 hover:bg-background active:bg-background border border-border/40 hover:border-border transition-all flex items-center justify-between gap-2 group"
                    data-testid={`starter-question-${q.slice(0, 20).replace(/\s/g, "-")}`}
                  >
                    <span>{q}</span>
                    <ChevronRight className="w-3 h-3 text-muted-foreground group-hover:text-foreground flex-shrink-0 transition-colors" />
                  </button>
                ))}
              </div>
            )}

            {!activeCat && (
              <p className="text-xs text-muted-foreground/60 flex items-center gap-1">
                <Lightbulb className="w-3 h-3" />
                Or type your own question below
              </p>
            )}
          </div>
        )}

        {/* ── Input area ── */}
        <div className="px-3 sm:px-6 pb-4 sm:pb-5 pt-2.5 sm:pt-3 border-t border-border flex-shrink-0 bg-background/80 backdrop-blur-sm">
          <div className="flex gap-2 items-end">
            <div className="flex-1 relative">
              <Textarea
                ref={textareaRef}
                placeholder="Ask anything… (Enter to send)"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={2}
                className="resize-none text-sm pr-8 sm:pr-10"
                data-testid="input-ai-coach"
              />
              {input.length > 0 && (
                <span className="absolute bottom-2.5 right-3 text-[10px] text-muted-foreground/40 pointer-events-none">
                  {input.length}
                </span>
              )}
            </div>
            <Button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || loading}
              className="self-end h-9 w-9 sm:h-10 sm:w-10 p-0 flex-shrink-0 rounded-xl"
              data-testid="button-send-ai-coach"
              aria-label="Send message"
            >
              <Send className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </Button>
          </div>
          <p className="hidden sm:block text-[10px] text-muted-foreground/40 mt-1.5 text-center">
            Shift + Enter for new line
          </p>
        </div>
      </div>

      {/* ── Context sidebar (desktop only) ── */}
      <aside className="hidden lg:flex flex-col w-72 border-l border-border bg-card/40 flex-shrink-0 overflow-y-auto">
        <div className="p-5 space-y-5">

          {/* Coach card */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Your Coach
            </p>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-primary/5 border border-primary/15">
              <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                <Bot className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">AI Habit Coach</p>
                <p className="text-xs text-muted-foreground">Powered by behavioral science</p>
                <div className="flex items-center gap-1 mt-1">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">Online</span>
                </div>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Your Progress
            </p>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border border-border/50">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Flame className="w-3.5 h-3.5 text-orange-500" />
                  Best streak
                </div>
                <span className="text-sm font-semibold tabular-nums">
                  {bestStreak > 0 ? `${bestStreak}d` : "—"}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border border-border/50">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <TrendingUp className="w-3.5 h-3.5 text-blue-500" />
                  Avg completion
                </div>
                <span className="text-sm font-semibold tabular-nums">
                  {totalCheckins > 0 ? `${avgCompletion}%` : "—"}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border border-border/50">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="w-3.5 h-3.5 text-violet-500" />
                  Total check-ins
                </div>
                <span className="text-sm font-semibold tabular-nums">
                  {totalCheckins > 0 ? totalCheckins : "—"}
                </span>
              </div>
            </div>
          </div>

          {/* Active systems */}
          {activeSystems.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                Active Systems
              </p>
              <div className="space-y-1.5">
                {activeSystems.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/30 border border-border/40"
                    data-testid={`sidebar-system-${s.id}`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
                    <span className="text-xs truncate">{s.title}</span>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground/60 mt-2 px-1">
                The coach uses these to personalise responses.
              </p>
            </div>
          )}

          {activeSystems.length === 0 && (
            <div className="p-3 rounded-xl border border-dashed border-border text-center space-y-1">
              <Target className="w-4 h-4 text-muted-foreground mx-auto" />
              <p className="text-xs text-muted-foreground">No active systems yet.</p>
              <p className="text-[10px] text-muted-foreground/60">
                Create a habit system so the coach can give personalised advice.
              </p>
            </div>
          )}

          {/* Tips */}
          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 space-y-1.5">
            <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
              <Lightbulb className="w-3.5 h-3.5" />
              Coaching tips
            </p>
            <ul className="text-[11px] text-amber-700/80 dark:text-amber-400/80 space-y-1">
              <li>• Be specific about your situation</li>
              <li>• Share what you've already tried</li>
              <li>• Ask follow-up questions freely</li>
            </ul>
          </div>
        </div>
      </aside>
    </div>
  );
}
