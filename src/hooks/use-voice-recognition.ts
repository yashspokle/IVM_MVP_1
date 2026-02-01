import { useCallback, useState, useRef } from "react";

// Type declarations for Web Speech API
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

interface VoiceRecognitionResult {
  transcript: string;
  confidence: number;
}

export const useVoiceRecognition = () => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const startListening = useCallback((onResult?: (result: VoiceRecognitionResult) => void) => {
    if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
      console.warn("Speech recognition not supported");
      return;
    }

    const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognitionClass();
    recognitionRef.current = recognition;

    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onstart = () => setIsListening(true);
    
    recognition.onresult = (event) => {
      const result = event.results[0][0];
      const text = result.transcript;
      setTranscript(text);
      onResult?.({ transcript: text, confidence: result.confidence });
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error:", event.error);
      setIsListening(false);
    };

    recognition.onend = () => setIsListening(false);

    recognition.start();
  }, []);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  return { startListening, stopListening, isListening, transcript };
};

// Parse voice commands for inventory management
export const parseVoiceCommand = (transcript: string): { action: string; item: string; quantity: number } | null => {
  const lower = transcript.toLowerCase();
  
  // Patterns: "add 3 apples", "remove 2 bananas", "delete all oranges", "clear list"
  const addMatch = lower.match(/add\s+(\d+)?\s*(.+)/);
  const removeMatch = lower.match(/remove\s+(\d+)?\s*(.+)/);
  const deleteMatch = lower.match(/delete\s+(?:all\s+)?(.+)/);
  
  if (lower.includes("clear") && (lower.includes("list") || lower.includes("all"))) {
    return { action: "clear", item: "", quantity: 0 };
  }
  
  if (addMatch) {
    const qty = addMatch[1] ? parseInt(addMatch[1]) : 1;
    const item = addMatch[2]?.trim().replace(/s$/, "") || "";
    return { action: "add", item, quantity: qty };
  }
  
  if (removeMatch) {
    const qty = removeMatch[1] ? parseInt(removeMatch[1]) : 1;
    let item = removeMatch[2]?.trim() || "";
    // Handle "one of them" -> use last context
    if (item.includes("of them") || item === "one") {
      return { action: "remove", item: "__last__", quantity: qty };
    }
    item = item.replace(/s$/, "");
    return { action: "remove", item, quantity: qty };
  }
  
  if (deleteMatch) {
    const item = deleteMatch[1]?.trim().replace(/s$/, "") || "";
    return { action: "delete", item, quantity: 0 };
  }
  
  return null;
};
