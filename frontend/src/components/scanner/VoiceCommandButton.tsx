import { Button } from "@/components/ui/button";
import { Mic, MicOff } from "lucide-react";
import { useVoiceRecognition, parseVoiceCommand } from "@/hooks/use-voice-recognition";
import { useToast } from "@/hooks/use-toast";

interface VoiceCommandButtonProps {
  onCommand: (action: string, item: string, quantity: number) => void;
  lastItem?: string;
}

const VoiceCommandButton = ({ onCommand, lastItem }: VoiceCommandButtonProps) => {
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
        // Handle "one of them" or "__last__"
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
    <Button
      onClick={handleVoiceCommand}
      variant={isListening ? "destructive" : "outline"}
      className={`${isListening ? "animate-pulse" : ""} border-emerald-300`}
    >
      {isListening ? (
        <>
          <MicOff className="mr-2 h-4 w-4" />
          Listening...
        </>
      ) : (
        <>
          <Mic className="mr-2 h-4 w-4" />
          Voice Command
        </>
      )}
    </Button>
  );
};

export default VoiceCommandButton;
