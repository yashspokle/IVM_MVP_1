import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Loader2, HelpCircle, X } from "lucide-react";
import { useVoiceRecognition, VoiceCommandAction } from "@/hooks/use-voice-recognition";
import { useToast } from "@/hooks/use-toast";
import { InventoryItem } from "@/types/grocero";

interface VoiceControlProps {
  inventory: InventoryItem[];
  onAdd:     (name: string, quantity: number, source: string, expiry?: string, category?: string) => void;
  onRemove:  (name: string, quantity: number) => void;
  onRestock: (item: { id: string; name: string }, store?: string) => void;
}

const STORE_URLS: Record<string, string> = {
  "Blinkit":          "https://blinkit.com/s/?q=",
  "Zepto":            "https://www.zeptonow.com/search?query=",
  "Swiggy Instamart": "https://www.swiggy.com/instamart/search?query=",
  "DMart Ready":      "https://www.dmart.in/search?q=",
};

const VoiceControl = ({ inventory = [], onAdd, onRemove, onRestock }: VoiceControlProps) => {
  const { isListening, isParsing, transcript, error, isSupported, startListening, stopListening } =
    useVoiceRecognition();
  const [lastCmd, setLastCmd] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const { toast } = useToast();

  const inventoryNames = inventory.map(i => i.name);

  const handleResult = useCallback(
    (cmd: VoiceCommandAction, raw: string) => {
      setLastCmd(raw);

      switch (cmd.type) {
        case "add": {
          onAdd(cmd.name, cmd.quantity, "voice", cmd.expiry ?? undefined, cmd.category);
          toast({
            title: `🎤 Added ${cmd.quantity}× ${cmd.name}`,
            description: cmd.expiry ? `Expiry: ${cmd.expiry}` : undefined,
          });
          break;
        }

        case "remove": {
          const found = inventory.find(i =>
            i.name.toLowerCase().includes(cmd.name.toLowerCase()) ||
            cmd.name.toLowerCase().includes(i.name.toLowerCase())
          );
          if (found) {
            onRemove(found.name, cmd.quantity);
            toast({ title: `🎤 Removed ${cmd.quantity}× ${found.name}` });
          } else {
            // Item not in inventory — still try to remove by spoken name
            onRemove(cmd.name, cmd.quantity);
            toast({
              title: `🎤 "${cmd.name}" not found`,
              description: "Nothing was removed.",
              variant: "destructive",
            });
          }
          break;
        }

        case "restock": {
          const found = inventory.find(i =>
            i.name.toLowerCase().includes(cmd.name.toLowerCase()) ||
            cmd.name.toLowerCase().includes(i.name.toLowerCase())
          );
          const itemForDialog = found ?? { id: cmd.name, name: cmd.name };

          if (cmd.store && STORE_URLS[cmd.store]) {
            // Direct redirect — skip dialog
            window.open(STORE_URLS[cmd.store] + encodeURIComponent(itemForDialog.name), "_blank");
            toast({ title: `🎤 Opening ${cmd.store} for ${itemForDialog.name}` });
          } else {
            // Open price comparison dialog
            onRestock(itemForDialog);
            toast({ title: `🎤 Comparing prices for ${itemForDialog.name}` });
          }
          break;
        }

        case "unknown": {
          toast({
            title: "🎤 Didn't understand",
            description: `Heard: "${raw}"`,
            variant: "destructive",
          });
          break;
        }
      }
    },
    [inventory, onAdd, onRemove, onRestock, toast]
  );

  const handleToggle = () => {
    if (isListening) stopListening();
    else startListening(handleResult, inventoryNames);
  };

  if (!isSupported) {
    return (
      <div className="flex items-center gap-2 text-xs text-orange-600 bg-orange-50 border border-orange-200 rounded-xl px-3 py-2">
        <MicOff className="h-4 w-4 flex-shrink-0" />
        Voice not supported — please use Chrome or Edge
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        {/* Mic button */}
        <Button
          onClick={handleToggle}
          disabled={isParsing}
          variant={isListening ? "destructive" : "default"}
          size="sm"
          className={`gap-2 min-w-[90px] transition-all ${
            isListening
              ? "animate-pulse bg-red-500 hover:bg-red-600"
              : "bg-emerald-600 hover:bg-emerald-700"
          }`}
        >
          {isParsing ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Thinking…</>
          ) : isListening ? (
            <><MicOff className="h-4 w-4" /> Stop</>
          ) : (
            <><Mic className="h-4 w-4" /> Voice</>
          )}
        </Button>

        {/* Live feedback */}
        <div className="flex-1 min-w-0">
          {isListening && (
            <p className="text-xs text-emerald-700 font-medium animate-pulse truncate">
              🎤 {transcript || "Listening…"}
            </p>
          )}
          {isParsing && (
            <p className="text-xs text-blue-600 truncate">
              ✨ Understanding your command…
            </p>
          )}
          {!isListening && !isParsing && lastCmd && !error && (
            <p className="text-xs text-muted-foreground truncate">
              Last: "{lastCmd}"
            </p>
          )}
          {error && (
            <p className="text-xs text-red-500 truncate">{error}</p>
          )}
        </div>

        {/* Help toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-emerald-700 flex-shrink-0"
          onClick={() => setShowHelp(h => !h)}
        >
          {showHelp ? <X className="h-4 w-4" /> : <HelpCircle className="h-4 w-4" />}
        </Button>
      </div>

      {/* Help panel */}
      {showHelp && (
        <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 space-y-2 text-xs">
          <p className="font-semibold text-emerald-800">You can say anything naturally, for example:</p>
          <div className="space-y-1 text-gray-600">
            <p>🟢 <span className="italic">"Add 2 packets of Maggi"</span></p>
            <p>🟢 <span className="italic">"Maine doodh khatam kar diya"</span> (I finished the milk)</p>
            <p>🟢 <span className="italic">"Add atta, expires in 3 months"</span></p>
            <p>🟢 <span className="italic">"We ran out of eggs"</span></p>
            <p>🟢 <span className="italic">"Restock paneer from Zepto"</span></p>
            <p>🟢 <span className="italic">"Order maggi on Blinkit"</span></p>
            <p>🟢 <span className="italic">"I need more rice, buy from Swiggy"</span></p>
            <p>🟢 <span className="italic">"Remove 3 apples"</span></p>
            <p>🟢 <span className="italic">"Bought 1 litre Amul milk, expires this Saturday"</span></p>
          </div>
          <p className="text-[10px] text-muted-foreground pt-1 border-t border-emerald-100">
            AI understands Hindi, Hinglish, brand names, quantities, expiry dates, and stores.
          </p>
        </div>
      )}
    </div>
  );
};

export default VoiceControl;