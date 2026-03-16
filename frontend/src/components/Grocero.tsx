import { useState, useCallback } from "react";
import { ShoppingCart } from "lucide-react";
import ItemScanner from "./ItemScanner";
import InventoryList from "./InventoryList";
import AddItemForm from "./AddItemForm";
import VoiceCommandButton from "./VoiceCommandButton";
import { InventoryItem } from "@/types/inventory";
import { useToast } from "@/hooks/use-toast";

const Grocero = () => {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [lastAddedItem, setLastAddedItem] = useState<string>("");
  const { toast } = useToast();

  const addItem = useCallback((name: string, quantity: number, source: "scan" | "manual" | "voice") => {
    const normalizedName = name.toLowerCase().trim();
    setLastAddedItem(normalizedName);
    
    setInventory((prev) => {
      const existing = prev.find((i) => i.name.toLowerCase() === normalizedName);
      if (existing) {
        return prev.map((i) =>
          i.name.toLowerCase() === normalizedName
            ? { ...i, quantity: i.quantity + quantity }
            : i
        );
      }
      return [
        ...prev,
        {
          id: crypto.randomUUID(),
          name: normalizedName,
          quantity,
          addedAt: new Date(),
          source,
        },
      ];
    });
  }, []);

  const removeItem = useCallback((name: string, quantity: number) => {
    const normalizedName = name.toLowerCase().trim();
    
    setInventory((prev) => {
      const existing = prev.find((i) => i.name.toLowerCase() === normalizedName);
      if (!existing) {
        toast({
          title: "Not found",
          description: `${name} is not in your inventory`,
          variant: "destructive",
        });
        return prev;
      }
      
      const newQty = existing.quantity - quantity;
      if (newQty <= 0) {
        return prev.filter((i) => i.name.toLowerCase() !== normalizedName);
      }
      return prev.map((i) =>
        i.name.toLowerCase() === normalizedName ? { ...i, quantity: newQty } : i
      );
    });
  }, [toast]);

  const deleteItem = useCallback((id: string) => {
    setInventory((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const updateQuantity = useCallback((id: string, delta: number) => {
    setInventory((prev) =>
      prev.map((i) => (i.id === id ? { ...i, quantity: Math.max(1, i.quantity + delta) } : i))
    );
  }, []);

  const clearInventory = useCallback(() => {
    setInventory([]);
    toast({ title: "Inventory cleared" });
  }, [toast]);

  const handleVoiceCommand = useCallback(
    (action: string, item: string, quantity: number) => {
      switch (action) {
        case "add":
          addItem(item, quantity, "voice");
          break;
        case "remove":
          removeItem(item, quantity);
          break;
        case "delete":
          const found = inventory.find((i) => i.name.toLowerCase() === item.toLowerCase());
          if (found) deleteItem(found.id);
          break;
        case "clear":
          clearInventory();
          break;
      }
    },
    [addItem, removeItem, deleteItem, clearInventory, inventory]
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 p-4">
      <div className="max-w-lg mx-auto space-y-4">
        {/* Header */}
        <div className="text-center pt-4 pb-2">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent flex items-center justify-center gap-2">
            <ShoppingCart className="h-8 w-8 text-emerald-600" />
            Grocero
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Scan, speak, or type to manage your kitchen
          </p>
        </div>

        {/* Scanner */}
        <ItemScanner onAddItem={(name) => addItem(name, 1, "scan")} />

        {/* Voice & Manual Controls */}
        <div className="flex gap-2">
          <div className="flex-1">
            <AddItemForm onAdd={(name, qty) => addItem(name, qty, "manual")} />
          </div>
          <VoiceCommandButton onCommand={handleVoiceCommand} lastItem={lastAddedItem} />
        </div>

        {/* Inventory List */}
        <InventoryList
          items={inventory}
          onUpdateQuantity={updateQuantity}
          onDelete={deleteItem}
          onClear={clearInventory}
        />
      </div>
    </div>
  );
};

export default Grocero;
