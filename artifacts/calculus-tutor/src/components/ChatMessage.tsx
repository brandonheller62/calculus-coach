import { useState } from "react";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { motion } from "framer-motion";
import { BookOpen, User, ChevronDown } from "lucide-react";
import type { Message } from "@/hooks/useChat";

interface MCQChoice {
  label: string;
  text: string;
}

/**
 * Convert standard LaTeX delimiters to remark-math format.
 * \[...\]  → $$...$$ (always display)
 * \(...\)  → $$...$$ if multiline, else $...$ (inline)
 */
function preprocessLatex(content: string): string {
  return content
    // \[...\] → display math
    .replace(/\\\[([\s\S]*?)\\\]/g, (_, inner: string) => `\n$$\n${inner.trim()}\n$$\n`)
    // \(...\) → display if multiline, inline otherwise
    .replace(/\\\(([\s\S]*?)\\\)/g, (_, inner: string) =>
      inner.includes("\n") ? `\n$$\n${inner.trim()}\n$$\n` : `$${inner}$`
    );
}

/**
 * Parse MCQ choices out of message content.
 * Returns the question text (without choice lines) and the choices array,
 * or null choices if the message doesn't contain exactly 4 A-D options.
 */
function parseQuestion(raw: string): {
  questionText: string;
  choices: MCQChoice[] | null;
} {
  const lines = raw.split("\n");
  const choiceIndices: number[] = [];
  const choices: MCQChoice[] = [];

  lines.forEach((line, idx) => {
    // Match: "A) text", "A. text", "(A) text"
    const m = line.match(/^\s*\(?([A-D])\)?[.)]\s+(.+)$/);
    if (m) {
      choiceIndices.push(idx);
      choices.push({ label: m[1], text: m[2].trim() });
    }
  });

  if (choices.length !== 4) {
    return { questionText: raw, choices: null };
  }

  const questionLines = lines.filter((_, i) => !choiceIndices.includes(i));
  return {
    questionText: questionLines.join("\n").trim(),
    choices,
  };
}

interface ChatMessageProps {
  message: Message;
  /** Called when user clicks an MCQ choice button */
  onChoiceSelect?: (choice: string) => void;
  /** Whether this message has already been responded to */
  isAnswered?: boolean;
}

export function ChatMessage({
  message,
  onChoiceSelect,
  isAnswered = false,
}: ChatMessageProps) {
  const isUser = message.role === "user";
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);

  const processed = preprocessLatex(message.content);
  const { questionText, choices } = isUser
    ? { questionText: processed, choices: null }
    : parseQuestion(processed);

  function handleChoice(label: string) {
    if (isAnswered || selectedChoice) return;
    setSelectedChoice(label);
    onChoiceSelect?.(`${label}`);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
      className={cn(
        "flex w-full gap-3 py-3",
        isUser ? "justify-end" : "justify-start"
      )}
      data-testid={`message-${message.role}`}
    >
      {!isUser && (
        <div className="flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-md bg-primary/20 text-primary mt-1">
          <BookOpen className="h-4 w-4" />
        </div>
      )}

      <div
        className={cn(
          "relative flex max-w-[85%] flex-col gap-3 rounded-2xl px-5 py-3.5 text-sm",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-muted/50 text-foreground"
        )}
      >
        {/* Markdown + math content */}
        <div className="prose prose-sm dark:prose-invert prose-p:leading-relaxed prose-pre:bg-black/50 max-w-none">
          <ReactMarkdown
            remarkPlugins={[remarkGfm, remarkMath]}
            rehypePlugins={[rehypeKatex]}
          >
            {questionText}
          </ReactMarkdown>
        </div>

        {/* Interactive MCQ choices */}
        {choices && (
          <div className="flex flex-col gap-2 mt-1">
            {choices.map(({ label, text }) => {
              const isSelected = selectedChoice === label || (isAnswered && message.content.includes(`\n${label})`));
              const chosen = selectedChoice === label;
              return (
                <button
                  key={label}
                  onClick={() => handleChoice(label)}
                  disabled={isAnswered || !!selectedChoice}
                  data-testid={`choice-${label}`}
                  className={cn(
                    "flex items-start gap-3 rounded-xl border px-4 py-3 text-left text-sm transition-all",
                    chosen
                      ? "border-primary bg-primary/20 text-foreground"
                      : isAnswered && !chosen
                      ? "border-border/30 bg-background/20 text-muted-foreground opacity-50 cursor-default"
                      : "border-border/50 bg-background/30 text-foreground hover:border-primary/50 hover:bg-background/50 cursor-pointer"
                  )}
                >
                  <span
                    className={cn(
                      "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
                      chosen
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-muted-foreground/40 text-muted-foreground"
                    )}
                  >
                    {label}
                  </span>
                  <span className="flex-1 leading-snug">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm, remarkMath]}
                      rehypePlugins={[rehypeKatex]}
                      components={{ p: ({ children }) => <span>{children}</span> }}
                    >
                      {preprocessLatex(text)}
                    </ReactMarkdown>
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Citations */}
        {!isUser && message.citations && message.citations.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-2">
            {message.citations.map((citation, idx) => (
              <CitationPill key={idx} idx={idx} fileId={citation.fileId} />
            ))}
          </div>
        )}
      </div>

      {isUser && (
        <div className="flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-md bg-muted text-muted-foreground mt-1">
          <User className="h-4 w-4" />
        </div>
      )}
    </motion.div>
  );
}

function CitationPill({ idx, fileId }: { idx: number; fileId: string }) {
  const [open, setOpen] = useState(false);
  return (
    <button
      onClick={() => setOpen((o) => !o)}
      data-testid={`citation-${idx}`}
      className="flex flex-col rounded-lg border border-border/50 bg-background/50 px-3 py-1.5 text-xs text-muted-foreground hover:bg-background transition-colors text-left"
    >
      <span className="flex items-center gap-1 font-medium">
        Source [{idx + 1}]
        <ChevronDown
          className={cn(
            "h-3 w-3 transition-transform",
            open && "rotate-180"
          )}
        />
      </span>
      {open && (
        <span className="mt-1 opacity-70 text-[10px]">File: {fileId}</span>
      )}
    </button>
  );
}
