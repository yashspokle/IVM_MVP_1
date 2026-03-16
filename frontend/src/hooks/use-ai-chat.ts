import { useState, useCallback } from "react";

const SCRAPER_URL = "http://localhost:3001";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export interface InventoryItem {
  name: string;
  quantity: number;
  expiry_date?: string | null;
}

function uid() {
  return Math.random().toString(36).slice(2);
}

export function useAiChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = useCallback(
    async (content: string, inventory: InventoryItem[] = []) => {
      if (!content.trim() || isLoading) return;

      const userMsg: ChatMessage = {
        id: uid(),
        role: "user",
        content: content.trim(),
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, userMsg]);
      setIsLoading(true);
      setError(null);

      try {
        const res = await fetch(`${SCRAPER_URL}/api/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [...messages, userMsg].map(m => ({
              role: m.role,
              content: m.content,
            })),
            inventory,
          }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || `Server error ${res.status}`);
        }

        const data = await res.json();
        const assistantMsg: ChatMessage = {
          id: uid(),
          role: "assistant",
          content: data.reply || "Sorry, I couldn't process that.",
          timestamp: new Date(),
        };

        setMessages(prev => [...prev, assistantMsg]);
      } catch (err: any) {
        const errorText =
          err.message?.includes("fetch")
            ? "Scraper server is offline. Run: cd scraper-server && npm start"
            : err.message || "Something went wrong";

        setError(errorText);

        const errorMsg: ChatMessage = {
          id: uid(),
          role: "assistant",
          content: `⚠️ ${errorText}`,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, errorMsg]);
      } finally {
        setIsLoading(false);
      }
    },
    [messages, isLoading]
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  return { messages, isLoading, error, sendMessage, clearMessages };
}