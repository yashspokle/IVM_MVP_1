import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Mic, MicOff } from "lucide-react";
import { useVoiceRecognition, parseVoiceCommand } from "@/hooks/use-voice-recognition";
import { useToast } from "@/hooks/use-toast";

interface VoiceControlProps {
  onCommand: (action: string, item: string, quantity: number) => void;
  lastItem?: string;
}

const VoiceControl = ({ onCommand, lastItem }: VoiceControlProps) => {
  const { startListening, stopListening, isListening, transcript } = useVoiceRecognition();
  const { toast } = useToast();

  const handleVoiceCommand = () => {
    if (isListening) {
      stopListening();
      return;
    }

    startListening((result) => {
      const command = parseVoiceCommand(result.transcript);

      if (command) {
        const itemName = command.item === "__last__" ? (lastItem || "") : command.item;

        if (command.action === "clear") {
          onCommand("clear", "", 0);
          toast({ title: "Clearing inventory..." });
        } else if (itemName) {
          onCommand(command.action, itemName, command.quantity);
          toast({
            title: `${command.action === "add" ? "Adding" : "Removing"} ${command.quantity} ${itemName}`,
          });
        } else {
          toast({
            title: "Couldn't understand",
            description: `Heard: "${result.transcript}"`,
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Try again",
          description: `Say "add 3 apples" or "remove 1 banana"`,
        });
      }
    });
  };

  return (
    <Card className="border-2 border-emerald-200">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h3 className="font-medium text-emerald-800">Voice Commands</h3>
            <p className="text-xs text-muted-foreground">
              {isListening ? "Listening..." : "Say 'add 3 apples' or 'remove 1 banana'"}
            </p>
            {transcript && (
              <p className="text-sm mt-1 text-emerald-600">"{transcript}"</p>
            )}
          </div>
          <Button
            onClick={handleVoiceCommand}
            variant={isListening ? "destructive" : "default"}
            size="lg"
            className={`${isListening ? "animate-pulse" : "bg-emerald-600 hover:bg-emerald-700"}`}
          >
            {isListening ? (
              <>
                <MicOff className="mr-2 h-5 w-5" />
                Stop
              </>
            ) : (
              <>
                <Mic className="mr-2 h-5 w-5" />
                Speak
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default VoiceControl;
