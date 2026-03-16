import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Plus, Minus, Trash2, Package } from "lucide-react";
import { InventoryItem } from "@/types/inventory";

interface InventoryListProps {
  items: InventoryItem[];
  onUpdateQuantity: (id: string, delta: number) => void;
  onDelete: (id: string) => void;
  onClear: () => void;
}

const InventoryList = ({ items, onUpdateQuantity, onDelete, onClear }: InventoryListProps) => {
  if (items.length === 0) {
    return (
      <Card className="border-2 border-dashed border-emerald-200">
        <CardContent className="flex flex-col items-center justify-center py-8 text-center">
          <Package className="h-12 w-12 text-emerald-300 mb-3" />
          <p className="text-muted-foreground">Your inventory is empty</p>
          <p className="text-sm text-muted-foreground">Scan items, add manually, or use voice commands</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg border-2 border-emerald-200">
      <CardHeader className="bg-gradient-to-r from-emerald-50 to-teal-50 pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg text-emerald-800 flex items-center gap-2">
            <Package className="h-5 w-5" />
            Inventory ({items.reduce((sum, i) => sum + i.quantity, 0)} items)
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClear}
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            Clear All
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-emerald-100">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between p-3 hover:bg-emerald-50/50 transition-colors"
            >
              <div className="flex-1">
                <p className="font-medium text-gray-800 capitalize">{item.name}</p>
                <p className="text-xs text-muted-foreground">
                  Added via {item.source}
                </p>
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 border-emerald-200"
                  onClick={() => onUpdateQuantity(item.id, -1)}
                  disabled={item.quantity <= 1}
                >
                  <Minus className="h-3 w-3" />
                </Button>
                
                <span className="w-8 text-center font-semibold text-emerald-700">
                  {item.quantity}
                </span>
                
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 border-emerald-200"
                  onClick={() => onUpdateQuantity(item.id, 1)}
                >
                  <Plus className="h-3 w-3" />
                </Button>
                
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                  onClick={() => onDelete(item.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default InventoryList;
