import { useEffect, useRef } from "react";
import { useChat } from "@/hooks/useChat";
import { ChatMessage } from "@/components/ChatMessage";
import { ChatInput } from "@/components/ChatInput";
import { BookOpen, Loader2, RotateCcw } from "lucide-react";
import { useGetAssistantInfo } from "@workspace/api-client-react";
import type { SessionConfig } from "@/pages/Setup";

interface ChatProps {
  config: SessionConfig;
  onReset: () => void;
}

// Pools of question-variety seeds so the model picks a different starting point each session
const TOPIC_SEEDS = [
  "Start with a question the student is unlikely to have seen before.",
  "Pick a question from a less commonly tested subtopic.",
  "Begin with a conceptual question rather than a computation.",
  "Start with a computation-heavy problem.",
  "Open with a question involving a graph or table interpretation.",
  "Begin with a limit, rate-of-change, or accumulation context.",
  "Choose a challenging question suitable for a high-scoring student.",
  "Start with a straightforward foundational question to build confidence.",
];

function buildInitialPrompt(config: SessionConfig): string {
  const { topic, quizType } = config;
  const topicLabel =
    topic === "General Review"
      ? "general AP Calculus AB review (all units)"
      : `Unit: ${topic}`;

  // Random seed injected each session so the model varies its question selection
  const seed = TOPIC_SEEDS[Math.floor(Math.random() * TOPIC_SEEDS.length)];
  const variety = `Session variety instruction (follow this): ${seed}`;

  if (quizType === "MCQ") {
    return `Please start a multiple choice quiz on ${topicLabel}. Give me one MCQ question at a time. Present the question with answer choices labeled A) B) C) D) on separate lines. Wait for my answer before giving feedback or the next question. ${variety}`;
  }
  if (quizType === "FRQ") {
    return `Please start a free response quiz on ${topicLabel}. Give me one FRQ question at a time in AP Calculus AB exam style with clearly labeled parts (a), (b), etc. Wait for my written response before providing feedback or the next question. ${variety}`;
  }
  return `Please start a mixed quiz on ${topicLabel}. Use a 4:1 ratio of MCQ to FRQ — for every 4 multiple choice questions, give 1 free response question. Format MCQ choices as A) B) C) D) on separate lines. Start with MCQ question 1. Present one question at a time and wait for my answer before continuing. ${variety}`;
}

export default function Chat({ config, onReset }: ChatProps) {
  const initialPrompt = buildInitialPrompt(config);
  const { messages, isStreaming, sendMessage, threadId } = useChat({
    initialPrompt,
  });
  const { data: assistantInfo } = useGetAssistantInfo();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isStreaming]);

  const quizLabel = {
    MCQ: "MCQ Quiz",
    FRQ: "FRQ Quiz",
    Mixed: "Mixed Quiz",
  }[config.quizType];

  const topicShort =
    config.topic === "General Review"
      ? "General Review"
      : config.topic.split(":")[0].trim();

  return (
    <div className="flex h-[100dvh] flex-col bg-background text-foreground overflow-hidden">
      {/* Header */}
      <header className="flex shrink-0 items-center justify-between border-b border-border/40 bg-card/50 px-6 py-3 backdrop-blur-sm z-10 relative">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/20 text-primary">
            <BookOpen className="h-4 w-4" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-sm font-semibold leading-none text-foreground">
              {assistantInfo?.name || "Brandon's Tutor"}
            </h1>
            <span className="text-xs text-muted-foreground mt-0.5">
              Your AP Calculus AB study partner
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-1.5 rounded-full border border-border/50 bg-card/40 px-3 py-1">
            <span className="text-xs text-muted-foreground">{topicShort}</span>
            <span className="text-muted-foreground/40 text-xs">·</span>
            <span className="text-xs font-medium text-primary">{quizLabel}</span>
          </div>
          <button
            onClick={onReset}
            data-testid="button-reset"
            title="New session"
            className="flex items-center gap-1.5 rounded-lg border border-border/50 bg-card/30 px-3 py-1.5 text-xs text-muted-foreground transition-all hover:bg-card hover:text-foreground"
          >
            <RotateCcw className="h-3 w-3" />
            <span className="hidden sm:inline">New session</span>
          </button>
        </div>
      </header>

      {/* Chat area */}
      <main className="flex-1 overflow-y-auto px-4 py-6 scroll-smooth">
        <div className="mx-auto flex max-w-3xl flex-col gap-1">
          {messages.filter((m) => !m.hidden).map((msg, idx, visible) => {
            // An assistant message is "answered" if the next visible message is a user message
            const nextMsg = visible[idx + 1];
            const isAnswered = msg.role === "assistant" && nextMsg?.role === "user";

            return (
              <ChatMessage
                key={msg.id}
                message={msg}
                isAnswered={isAnswered}
                onChoiceSelect={
                  !isAnswered && msg.role === "assistant"
                    ? (choice) => sendMessage(choice)
                    : undefined
                }
              />
            );
          })}

          {isStreaming && (
            <div className="flex w-full items-center gap-2 py-4 pl-12 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-xs font-medium uppercase tracking-widest">
                Thinking...
              </span>
            </div>
          )}

          <div ref={bottomRef} className="h-4" />
        </div>
      </main>

      {/* Input */}
      <div className="shrink-0 bg-background/80 pb-6 pt-2 backdrop-blur-xl px-4 z-10 relative">
        <div className="mx-auto max-w-3xl flex flex-col gap-3">
          <ChatInput
            onSend={sendMessage}
            disabled={isStreaming || !threadId}
            threadId={threadId}
          />
          <div className="text-center text-[10px] text-muted-foreground">
            AI can make mistakes. Verify important information.
          </div>
        </div>
      </div>
    </div>
  );
}
