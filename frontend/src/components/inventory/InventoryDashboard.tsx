import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import RestockCompareDialog from "./RestockCompareDialog";
import VoiceControl from "./VoiceControl";
import {
  Plus, Minus, Trash2, Package, AlertTriangle,
  Calendar, Search, ShoppingBag, Clock
} from "lucide-react";
import { InventoryItem } from "@/types/grocero";
import { format, differenceInDays } from "date-fns";

interface InventoryDashboardProps {
  items: InventoryItem[];
  lowStockItems: InventoryItem[];
  expiredItems: InventoryItem[];
  expiringItems: InventoryItem[];
  onUpdateQuantity: (id: string, delta: number) => void;
  onDelete: (id: string) => void;
  onClear: () => void;
  onUpdateExpiryDate: (id: string, date: string | null) => void;
  onAddItem: (name: string, quantity: number, source: string, expiry?: string, category?: string) => void;
  onRemoveItem: (name: string, quantity: number) => void;
}

const InventoryDashboard = ({
  items,
  lowStockItems,
  expiredItems,
  expiringItems,
  onUpdateQuantity,
  onDelete,
  onClear,
  onUpdateExpiryDate,
  onAddItem,
  onRemoveItem,
}: InventoryDashboardProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [compareItem, setCompareItem] = useState<{ id: string; name: string } | null>(null);

  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getExpiryStatus = (item: InventoryItem) => {
    if (!item.expiry_date) return null;
    const daysUntilExpiry = differenceInDays(new Date(item.expiry_date), new Date());

    if (daysUntilExpiry < 0) return { status: "expired", color: "bg-red-500", text: "Expired" };
    if (daysUntilExpiry <= 3) return { status: "expiring", color: "bg-orange-500", text: `${daysUntilExpiry}d left` };
    return { status: "ok", color: "bg-emerald-500", text: format(new Date(item.expiry_date), "MMM d") };
  };

  const isLowStock = (item: InventoryItem) => item.quantity <= (item.low_stock_threshold || 2);

  if (items.length === 0) {
    return (
      <Card className="border-2 border-dashed border-emerald-200">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <Package className="h-16 w-16 text-emerald-300 mb-4" />
          <p className="text-lg font-medium text-muted-foreground">Your inventory is empty</p>
          <p className="text-sm text-muted-foreground mt-1">
            Scan items, add manually, or use voice commands
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {/* Alerts Section */}
        {(expiredItems.length > 0 || expiringItems.length > 0 || lowStockItems.length > 0) && (
          <div className="grid gap-2">
            {expiredItems.length > 0 && (
              <Card className="border-red-200 bg-red-50">
                <CardContent className="py-3 px-4 flex items-center gap-3">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  <span className="text-sm font-medium text-red-800">
                    {expiredItems.length} item(s) expired: {expiredItems.map(i => i.name).join(", ")}
                  </span>
                </CardContent>
              </Card>
            )}
            {expiringItems.length > 0 && (
              <Card className="border-orange-200 bg-orange-50">
                <CardContent className="py-3 px-4 flex items-center gap-3">
                  <Clock className="h-5 w-5 text-orange-600" />
                  <span className="text-sm font-medium text-orange-800">
                    {expiringItems.length} item(s) expiring soon: {expiringItems.map(i => i.name).join(", ")}
                  </span>
                </CardContent>
              </Card>
            )}
            {lowStockItems.length > 0 && (
              <Card className="border-yellow-200 bg-yellow-50">
                <CardContent className="py-3 px-4 flex items-center gap-3">
                  <ShoppingBag className="h-5 w-5 text-yellow-700" />
                  <span className="text-sm font-medium text-yellow-800">
                    Low stock: {lowStockItems.map(i => i.name).join(", ")}
                  </span>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Voice Control */}
        <Card className="border border-emerald-100 bg-emerald-50/30">
          <CardContent className="py-3 px-4">
            <VoiceControl
              inventory={items}
              onAdd={onAddItem}
              onRemove={onRemoveItem}
              onRestock={(item, store) => {
                setCompareItem(item);
                // If a specific store was requested, open URL directly
                if (store) {
                  const STORE_URLS: Record<string, string> = {
                    "Blinkit":          "https://blinkit.com/s/?q=",
                    "Zepto":            "https://www.zeptonow.com/search?query=",
                    "Swiggy Instamart": "https://www.swiggy.com/instamart/search?query=",
                    "DMart Ready":      "https://www.dmart.in/search?q=",
                  };
                  const url = STORE_URLS[store];
                  if (url) {
                    window.open(url + encodeURIComponent(item.name), "_blank");
                    return; // skip dialog
                  }
                }
                setCompareItem(item);
              }}
            />
          </CardContent>
        </Card>

        {/* Main Inventory Card */}
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

            {/* Search */}
            <div className="relative mt-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <div className="divide-y divide-emerald-100 max-h-[400px] overflow-y-auto">
              {filteredItems.map((item) => {
                const expiryStatus = getExpiryStatus(item);
                const lowStock = isLowStock(item);

                return (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 hover:bg-emerald-50/50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-800 capitalize truncate">
                          {item.name}
                        </p>
                        {lowStock && (
                          <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300 text-xs">
                            Low
                          </Badge>
                        )}
                        {expiryStatus && (
                          <Badge
                            variant="outline"
                            className={`${
                              expiryStatus.status === "expired"
                                ? "bg-red-100 text-red-800 border-red-300"
                                : expiryStatus.status === "expiring"
                                ? "bg-orange-100 text-orange-800 border-orange-300"
                                : "bg-emerald-100 text-emerald-800 border-emerald-300"
                            } text-xs`}
                          >
                            <Calendar className="h-3 w-3 mr-1" />
                            {expiryStatus.text}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Added via {item.source} • {item.unit || "pcs"}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Restock Button */}
                      {(lowStock || expiryStatus?.status === "expired") && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                          onClick={() => setCompareItem({ id: item.id, name: item.name })}
                        >
                          <ShoppingBag className="h-3 w-3 mr-1" />
                          Restock
                        </Button>
                      )}

                      {/* Quantity Controls */}
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 border-emerald-200"
                        onClick={() =>
  onUpdateQuantity(
    item.id,
    item.quantity - 1
  )
}
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
                        onClick={() =>
  onUpdateQuantity(
    item.id,
    item.quantity + 1
  )
}
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
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Restock Price Compare Dialog */}
      <RestockCompareDialog
        item={compareItem}
        open={!!compareItem}
        onClose={() => setCompareItem(null)}
      />
    </>
  );
};

export default InventoryDashboard;