import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChefHat, Loader2, RefreshCw, Volume2 } from "lucide-react";
import { useAiChat } from "@/hooks/use-ai-chat";
import { useTextToSpeech } from "@/hooks/use-text-to-speech";
import { InventoryItem } from "@/types/grocero";
import ReactMarkdown from "react-markdown";

interface RecipePanelProps {
  inventory: InventoryItem[];
}

const RecipePanel = ({ inventory }: RecipePanelProps) => {
  const [recipe, setRecipe] = useState<string | null>(null);
  const { isLoading, sendMessage, clearChat } = useAiChat(inventory);
  const { speak, isSpeaking } = useTextToSpeech();

  const generateRecipe = async (prompt?: string) => {
    clearChat();
    const defaultPrompt = "Suggest a delicious recipe I can make with my current inventory. Prioritize items that are expiring soon.";
    const response = await sendMessage(prompt || defaultPrompt, "recipe");
    if (response) {
      setRecipe(response);
    }
  };

  const recipePrompts = [
    { label: "Quick Meal", prompt: "Suggest a quick 15-minute meal with my ingredients" },
    { label: "Healthy Option", prompt: "Suggest a healthy low-calorie recipe with my inventory" },
    { label: "Use Expiring Items", prompt: "Create a recipe that uses items expiring soon to reduce waste" },
    { label: "Comfort Food", prompt: "Suggest a comforting home-cooked meal with available ingredients" },
  ];

  const handleSpeak = () => {
    if (recipe) {
      const plainText = recipe
        .replace(/#{1,6}\s/g, "")
        .replace(/\*\*/g, "")
        .replace(/\*/g, "")
        .replace(/`/g, "")
        .replace(/\n/g, " ");
      speak(plainText);
    }
  };

  return (
    <Card className="shadow-lg border-2 border-emerald-200 h-[500px] flex flex-col">
      <CardHeader className="bg-gradient-to-r from-emerald-50 to-teal-50 pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg text-emerald-800 flex items-center gap-2">
            <ChefHat className="h-5 w-5" />
            Recipe Suggestions
          </CardTitle>
          {recipe && (
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSpeak}
                className="text-muted-foreground"
              >
                <Volume2 className={`h-4 w-4 ${isSpeaking ? "animate-pulse" : ""}`} />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => generateRecipe()}
                className="text-muted-foreground"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-4 overflow-hidden">
        {!recipe && !isLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <ChefHat className="h-16 w-16 text-emerald-300 mb-4" />
            <p className="text-muted-foreground mb-6">
              Get AI-powered recipe suggestions based on your inventory
            </p>
            <div className="grid grid-cols-2 gap-2 w-full max-w-sm">
              {recipePrompts.map((item) => (
                <Button
                  key={item.label}
                  variant="outline"
                  className="border-emerald-200 hover:bg-emerald-50"
                  onClick={() => generateRecipe(item.prompt)}
                >
                  {item.label}
                </Button>
              ))}
            </div>
            <Button
              className="mt-4 bg-emerald-600 hover:bg-emerald-700"
              onClick={() => generateRecipe()}
            >
              Generate Any Recipe
            </Button>
          </div>
        ) : isLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center">
            <Loader2 className="h-10 w-10 animate-spin text-emerald-600 mb-4" />
            <p className="text-muted-foreground">Creating your recipe...</p>
          </div>
        ) : (
          <ScrollArea className="flex-1">
            <div className="prose prose-sm max-w-none">
              <ReactMarkdown>{recipe}</ReactMarkdown>
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};

export default RecipePanel;
