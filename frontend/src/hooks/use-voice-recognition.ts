import { useState, useRef, useCallback } from "react";

export type VoiceCommandAction =
  | { type: "add";     name: string; quantity: number; expiry?: string | null; category?: string }
  | { type: "remove";  name: string; quantity: number }
  | { type: "restock"; name: string; store?: string | null }
  | { type: "unknown"; transcript: string };

const SCRAPER_URL = "http://localhost:3001";

// ─── AI command parser — calls scraper server (avoids browser CORS) ───────────
export async function parseVoiceCommandAI(
  transcript: string,
  inventoryNames: string[] = []
): Promise<VoiceCommandAction> {
  try {
    const res = await fetch(`${SCRAPER_URL}/api/voice`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transcript, inventoryNames }),
    });
    if (!res.ok) throw new Error(`Server error ${res.status}`);
    return await res.json() as VoiceCommandAction;
  } catch {
    return { type: "unknown", transcript };
  }
}

// ─── Speech recognition hook ───────────────────────────────────────────────────
export interface VoiceState {
  isListening: boolean;
  isParsing: boolean;
  transcript: string;
  error: string | null;
}

export function useVoiceRecognition() {
  const [state, setState] = useState<VoiceState>({
    isListening: false, isParsing: false, transcript: "", error: null,
  });
  const recRef = useRef<any>(null);

  const isSupported =
    typeof window !== "undefined" &&
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

  const startListening = useCallback(
    (onResult: (cmd: VoiceCommandAction, raw: string) => void, inventoryNames: string[] = []) => {
      if (!isSupported) {
        setState(s => ({ ...s, error: "Speech recognition not supported. Use Chrome or Edge." }));
        return;
      }

      const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const rec = new SR();
      recRef.current = rec;
      rec.continuous = false;
      rec.interimResults = true;
      rec.lang = "en-IN";

      rec.onstart = () =>
        setState({ isListening: true, isParsing: false, transcript: "", error: null });

      rec.onresult = (e: any) => {
        const interim = Array.from(e.results as any[])
          .map((r: any) => r[0].transcript)
          .join("");
        setState(s => ({ ...s, transcript: interim }));

        if (e.results[e.results.length - 1].isFinal) {
          const final = e.results[e.results.length - 1][0].transcript;
          setState(s => ({ ...s, isListening: false, isParsing: true, transcript: final }));
          parseVoiceCommandAI(final, inventoryNames).then(cmd => {
            setState(s => ({ ...s, isParsing: false }));
            onResult(cmd, final);
          });
        }
      };

      rec.onerror = (e: any) => {
        setState({ isListening: false, isParsing: false, transcript: "", error: e.error });
      };

      rec.onend = () => {
        setState(s => ({ ...s, isListening: false }));
      };

      rec.start();
    },
    [isSupported]
  );

  const stopListening = useCallback(() => {
    recRef.current?.stop();
    setState(s => ({ ...s, isListening: false }));
  }, []);

  return { ...state, isSupported, startListening, stopListening };
}