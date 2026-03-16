import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Bot, User, Loader2, Trash2, Mic, MicOff, Volume2 } from "lucide-react";
import { useAiChat } from "@/hooks/use-ai-chat";
import { useVoiceRecognition } from "@/hooks/use-voice-recognition";
import { useTextToSpeech } from "@/hooks/use-text-to-speech";
import { InventoryItem, ChatMessage } from "@/types/grocero";
import ReactMarkdown from "react-markdown";

interface AIChatbotProps {
  inventory: InventoryItem[];
}

const AIChatbot = ({ inventory }: AIChatbotProps) => {
  const [input, setInput] = useState("");
  const { messages, isLoading, sendMessage, clearChat } = useAiChat(inventory);
  const { startListening, stopListening, isListening } = useVoiceRecognition();
  const { speak, isSpeaking } = useTextToSpeech();
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const message = input;
    setInput("");
    await sendMessage(message);
  };

  const handleVoiceInput = () => {
    if (isListening) {
      stopListening();
      return;
    }

    startListening((result) => {
      setInput(result.transcript);
      inputRef.current?.focus();
    });
  };

  const handleSpeakResponse = (content: string) => {
    // Strip markdown for speech
    const plainText = content
      .replace(/#{1,6}\s/g, "")
      .replace(/\*\*/g, "")
      .replace(/\*/g, "")
      .replace(/`/g, "")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .replace(/\n/g, " ");
    speak(plainText);
  };

  const suggestedQuestions = [
    "What items are running low?",
    "What's expiring soon?",
    "Suggest a recipe with my ingredients",
    "What should I buy this week?",
  ];

  return (
    <Card className="flex flex-col h-[500px] shadow-lg border-2 border-emerald-200">
      <CardHeader className="bg-gradient-to-r from-emerald-50 to-teal-50 pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg text-emerald-800 flex items-center gap-2">
            <Bot className="h-5 w-5" />
            Grocero AI Assistant
          </CardTitle>
          {messages.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearChat}
              className="text-muted-foreground hover:text-red-600"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-4">
              <Bot className="h-12 w-12 text-emerald-300 mb-4" />
              <p className="text-muted-foreground mb-4">
                Hi! I'm your grocery assistant. Ask me about your inventory, recipes, or shopping tips!
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                {suggestedQuestions.map((q) => (
                  <Button
                    key={q}
                    variant="outline"
                    size="sm"
                    className="text-xs border-emerald-200"
                    onClick={() => {
                      setInput(q);
                      inputRef.current?.focus();
                    }}
                  >
                    {q}
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${
                    message.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  {message.role === "assistant" && (
                    <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                      <Bot className="h-4 w-4 text-emerald-600" />
                    </div>
                  )}
                  <div
                    className={`rounded-lg px-4 py-2 max-w-[80%] ${
                      message.role === "user"
                        ? "bg-emerald-600 text-white"
                        : "bg-gray-100"
                    }`}
                  >
                    {message.role === "assistant" ? (
                      <div className="prose prose-sm max-w-none">
                        <ReactMarkdown>{message.content}</ReactMarkdown>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSpeakResponse(message.content)}
                          className="mt-2 h-6 text-xs text-muted-foreground"
                        >
                          <Volume2 className={`h-3 w-3 mr-1 ${isSpeaking ? "animate-pulse" : ""}`} />
                          Listen
                        </Button>
                      </div>
                    ) : (
                      <p className="text-sm">{message.content}</p>
                    )}
                  </div>
                  {message.role === "user" && (
                    <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center flex-shrink-0">
                      <User className="h-4 w-4 text-white" />
                    </div>
                  )}
                </div>
              ))}
              {isLoading && messages[messages.length - 1]?.role === "user" && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                    <Bot className="h-4 w-4 text-emerald-600" />
                  </div>
                  <div className="bg-gray-100 rounded-lg px-4 py-2">
                    <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
                  </div>
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        <form onSubmit={handleSubmit} className="p-4 border-t bg-white">
          <div className="flex gap-2">
            <Button
              type="button"
              variant={isListening ? "destructive" : "outline"}
              size="icon"
              onClick={handleVoiceInput}
              className={isListening ? "animate-pulse" : ""}
            >
              {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </Button>
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about your groceries..."
              disabled={isLoading}
              className="flex-1"
            />
            <Button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default AIChatbot;
