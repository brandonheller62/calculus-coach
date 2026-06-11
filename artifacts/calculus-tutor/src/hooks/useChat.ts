import { useState, useEffect, useRef, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";

export type Citation = {
  fileId: string;
  sourceText?: string;
};

export type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
  hidden?: boolean;
};

interface UseChatOptions {
  initialPrompt?: string;
}

export function useChat({ initialPrompt }: UseChatOptions = {}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [threadId, setThreadId] = useState<string | null>(null);
  const { toast } = useToast();
  const initialSentRef = useRef(false);

  const sendMessage = useCallback(
    async (content: string, fileIds: string[] = [], hidden = false) => {
      if (!threadId) return;

      const userMsgId = Date.now().toString();
      setMessages((prev) => [
        ...prev,
        { id: userMsgId, role: "user", content, hidden },
      ]);

      const assistantMsgId = (Date.now() + 1).toString();
      setMessages((prev) => [
        ...prev,
        { id: assistantMsgId, role: "assistant", content: "" },
      ]);

      setIsStreaming(true);

      try {
        const response = await fetch(`/api/chat/thread/${threadId}/message`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "text/event-stream",
          },
          body: JSON.stringify({ content, fileIds }),
        });

        if (!response.ok) {
          throw new Error("Failed to send message");
        }

        const reader = response.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split("\n\n");
          buffer = parts.pop()!;

          for (const part of parts) {
            const lines = part.split("\n");
            const eventLine = lines.find((l) => l.startsWith("event:"));
            const dataLine = lines.find((l) => l.startsWith("data:"));

            if (!eventLine || !dataLine) continue;

            const event = eventLine.slice(6).trim();
            const dataStr = dataLine.slice(5).trim();

            let data: unknown;
            try {
              data = JSON.parse(dataStr);
            } catch {
              continue;
            }

            if (event === "delta") {
              const delta = data as { text?: string };
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMsgId
                    ? { ...m, content: m.content + (delta.text ?? "") }
                    : m
                )
              );
            } else if (event === "annotation") {
              const ann = data as { file_id?: string; quote?: string };
              setMessages((prev) =>
                prev.map((m) => {
                  if (m.id === assistantMsgId) {
                    const citations = m.citations || [];
                    return {
                      ...m,
                      citations: [
                        ...citations,
                        { fileId: ann.file_id ?? "", sourceText: ann.quote },
                      ],
                    };
                  }
                  return m;
                })
              );
            } else if (event === "error") {
              const err = data as { message?: string };
              throw new Error(err.message || "Streaming error");
            }
          }
        }
      } catch (error: unknown) {
        const msg =
          error instanceof Error ? error.message : "Failed to send message";
        toast({
          title: "Error",
          description: msg,
          variant: "destructive",
        });
        setMessages((prev) =>
          prev.filter((m) => m.content !== "" || m.role === "user")
        );
      } finally {
        setIsStreaming(false);
      }
    },
    [threadId, toast]
  );

  useEffect(() => {
    async function initThread() {
      try {
        const res = await fetch("/api/chat/thread", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });
        if (!res.ok) throw new Error("Failed to create thread");
        const data = (await res.json()) as { threadId: string };
        setThreadId(data.threadId);
      } catch (error) {
        console.error("Error creating thread:", error);
        toast({
          title: "Connection Error",
          description: "Could not connect to the tutoring session. Please refresh.",
          variant: "destructive",
        });
      }
    }
    initThread();
  }, [toast]);

  // Fire initial prompt once thread is ready — mark it hidden so it never renders
  useEffect(() => {
    if (threadId && initialPrompt && !initialSentRef.current) {
      initialSentRef.current = true;
      sendMessage(initialPrompt, [], true);
    }
  }, [threadId, initialPrompt, sendMessage]);

  return {
    messages,
    isStreaming,
    sendMessage,
    threadId,
  };
}
