import { useState, useCallback, useRef } from "react";

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

const uid = () =>
crypto.randomUUID
? crypto.randomUUID()
: Math.random().toString(36).slice(2);

export function useAiChat() {
const [messages, setMessages] = useState<ChatMessage[]>([]);
const [isLoading, setIsLoading] = useState(false);
const [error, setError] = useState<string | null>(null);

const messagesRef = useRef<ChatMessage[]>([]);

const sendMessage = useCallback(
async (
content: string,
inventory: InventoryItem[] = []
) => {
const trimmed = content.trim();

  if (!trimmed || isLoading) return;

  const userMsg: ChatMessage = {
    id: uid(),
    role: "user",
    content: trimmed,
    timestamp: new Date(),
  };

  const updatedMessages = [
    ...messagesRef.current,
    userMsg,
  ];

  messagesRef.current = updatedMessages;

  setMessages(updatedMessages);
  setError(null);
  setIsLoading(true);

  try {
    const controller =
      new AbortController();

    const timeout = setTimeout(
      () => controller.abort(),
      20000
    );

    const res = await fetch(
      `${SCRAPER_URL}/api/chat`,
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json",
        },
        signal: controller.signal,
        body: JSON.stringify({
          messages:
            updatedMessages.map(
              (m) => ({
                role: m.role,
                content: m.content,
              })
            ),
          inventory,
        }),
      }
    );

    clearTimeout(timeout);

    if (!res.ok) {
      const err = await res
        .json()
        .catch(() => ({}));

      throw new Error(
        err.error ||
          `Server error ${res.status}`
      );
    }

    const data = await res.json();

    const assistantMsg: ChatMessage = {
      id: uid(),
      role: "assistant",
      content:
        data.reply ||
        "Sorry, I couldn't process that.",
      timestamp: new Date(),
    };

    messagesRef.current = [
      ...messagesRef.current,
      assistantMsg,
    ];

    setMessages([
      ...messagesRef.current,
    ]);
  } catch (err: any) {
    const errorText =
      err.name === "AbortError"
        ? "Request timed out"
        : err.message?.includes(
            "fetch"
          )
        ? "Scraper server offline"
        : err.message ||
          "Something went wrong";

    setError(errorText);

    const errorMsg: ChatMessage = {
      id: uid(),
      role: "assistant",
      content: `⚠️ ${errorText}`,
      timestamp: new Date(),
    };

    messagesRef.current = [
      ...messagesRef.current,
      errorMsg,
    ];

    setMessages([
      ...messagesRef.current,
    ]);
  } finally {
    setIsLoading(false);
  }
},
[isLoading]

);

const clearMessages =
useCallback(() => {
messagesRef.current = [];
setMessages([]);
setError(null);
}, []);

return {
messages,
isLoading,
error,
sendMessage,
clearMessages,
};
}
