import React, { useRef, useEffect, useState } from "react";
import { Paperclip, Send, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface ChatInputProps {
  onSend: (content: string, fileIds: string[]) => void;
  disabled: boolean;
  threadId: string | null;
}

export function ChatInput({ onSend, disabled, threadId }: ChatInputProps) {
  const [content, setContent] = useState("");
  const [uploadedFile, setUploadedFile] = useState<{ id: string; name: string } | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const adjustHeight = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
  };

  useEffect(() => {
    adjustHeight();
  }, [content]);

  const handleSend = () => {
    if (!content.trim() || disabled) return;
    const fileIds = uploadedFile ? [uploadedFile.id] : [];
    onSend(content.trim(), fileIds);
    setContent("");
    setUploadedFile(null);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !threadId) return;

    // Allowed extensions check (optional frontend validation)
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['pdf', 'txt', 'docx', 'md'].includes(ext || '')) {
      toast({
        title: "Invalid file",
        description: "Only PDF, TXT, DOCX, and MD files are supported.",
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(`/api/chat/thread/${threadId}/upload`, {
        method: "POST",
        body: formData,
      });
      
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      setUploadedFile({ id: data.fileId, name: data.filename });
    } catch (error) {
      toast({
        title: "Upload Error",
        description: "Could not upload the file.",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="flex w-full flex-col gap-2">
      {uploadedFile && (
        <div className="flex items-center gap-2 self-start rounded-full bg-muted px-3 py-1 text-xs">
          <Paperclip className="h-3 w-3" />
          <span className="truncate max-w-[200px]">{uploadedFile.name}</span>
          <button 
            onClick={() => setUploadedFile(null)}
            className="rounded-full p-0.5 hover:bg-background/50 transition-colors"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}
      
      <div className="relative flex w-full items-end gap-2 rounded-xl border border-border bg-card p-2 shadow-sm focus-within:ring-1 focus-within:ring-primary transition-all">
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept=".pdf,.txt,.docx,.md"
          onChange={handleFileUpload}
          disabled={disabled || isUploading || !threadId}
        />
        
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground mb-1"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || isUploading || !threadId}
          data-testid="button-upload"
        >
          {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
        </Button>

        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Message Brandon's Tutor..."
          className="max-h-[120px] min-h-[40px] w-full resize-none bg-transparent py-2.5 text-sm outline-none placeholder:text-muted-foreground"
          rows={1}
          disabled={disabled}
          data-testid="input-chat"
        />

        <Button
          onClick={handleSend}
          disabled={!content.trim() || disabled}
          size="icon"
          className="h-8 w-8 shrink-0 rounded-lg mb-1 transition-all"
          data-testid="button-send"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}