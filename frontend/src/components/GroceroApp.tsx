import { useState, useCallback } from "react";
import { ShoppingCart, Package, Camera, Bot, ChefHat, LogOut } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useInventory } from "@/hooks/use-inventory";
import AuthForm from "./auth/AuthForm";
import InventoryDashboard from "./inventory/InventoryDashboard";
import AddItemDialog from "./inventory/AddItemDialog";
import SmartScanner from "./scanner/SmartScanner";
import VoiceControl from "./inventory/VoiceControl";
import AIChatbot from "./chat/AIChatbot";
import RecipePanel from "./recipes/RecipePanel";
import { TabType } from "@/types/grocero";

// Tabs that have been visited at least once — we never unmount them after first visit
const useMountedTabs = (active: TabType) => {
  const [mounted, setMounted] = useState<Set<TabType>>(new Set([active]));
  const visit = useCallback((tab: TabType) => {
    setMounted(prev => {
      if (prev.has(tab)) return prev;
      const next = new Set(prev);
      next.add(tab);
      return next;
    });
  }, []);
  return { mounted, visit };
};

const GroceroApp = () => {
  const { user, loading: authLoading, signOut, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>("inventory");
  const [lastAddedItem, setLastAddedItem] = useState<string>("");
  const { mounted, visit } = useMountedTabs("inventory");

  const {
    inventory,
    loading: inventoryLoading,
    addItem,
    removeItem,
    deleteItem,
    updateQuantity,
    updateExpiryDate,
    clearInventory,
    lowStockItems,
    expiredItems,
    expiringItems,
  } = useInventory(user?.id || null);

  const handleAddItem = useCallback(
    async (name: string, quantity: number, source: "scan" | "manual" | "voice", expiryDate?: string, category?: string) => {
      setLastAddedItem(name.toLowerCase().trim());
      await addItem(name, quantity, source, expiryDate, category);
    },
    [addItem]
  );

  const handleTabChange = useCallback((tab: string) => {
    const t = tab as TabType;
    visit(t);
    setActiveTab(t);
  }, [visit]);

  const handleVoiceCommand = useCallback(
    async (action: string, item: string, quantity: number) => {
      switch (action) {
        case "add":
          await handleAddItem(item, quantity, "voice");
          break;
        case "remove":
          await removeItem(item, quantity);
          break;
        case "delete":
          const found = inventory.find((i) => i.name.toLowerCase() === item.toLowerCase());
          if (found) await deleteItem(found.id);
          break;
        case "clear":
          await clearInventory();
          break;
      }
    },
    [handleAddItem, removeItem, deleteItem, clearInventory, inventory]
  );

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 flex items-center justify-center">
        <div className="animate-pulse flex items-center gap-2">
          <ShoppingCart className="h-8 w-8 text-emerald-600" />
          <span className="text-xl font-semibold text-emerald-800">Loading...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthForm />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50">
      <div className="max-w-4xl mx-auto p-4 space-y-4">

        {/* Header */}
        <div className="flex items-center justify-between pt-4 pb-2">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-8 w-8 text-emerald-600" />
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                Grocero
              </h1>
              <p className="text-xs text-muted-foreground">Smart Grocery Management</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground hidden sm:block">{user?.email}</span>
            <Button variant="ghost" size="sm" onClick={signOut}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Voice Control */}
        <VoiceControl
          inventory={inventory}
          onAdd={handleAddItem}
          onRemove={removeItem}
          onRestock={(item) => {
            // Navigate to inventory tab and open restock dialog
            handleTabChange("inventory");
          }}
        />

        {/* Tabs — only the TabsList here, content rendered below */}
        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList className="grid w-full grid-cols-4 bg-emerald-100">
            <TabsTrigger value="inventory" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
              <Package className="h-4 w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Inventory</span>
            </TabsTrigger>
            <TabsTrigger value="scan" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
              <Camera className="h-4 w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Scan</span>
            </TabsTrigger>
            <TabsTrigger value="chat" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
              <Bot className="h-4 w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">AI Chat</span>
            </TabsTrigger>
            <TabsTrigger value="recipes" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
              <ChefHat className="h-4 w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Recipes</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* 
          Keep-alive tab panels:
          - Only rendered after first visit (lazy)
          - Never unmounted after that (state preserved)
          - Hidden via CSS when not active (display:none)
        */}
        <div className="mt-0">

          {/* INVENTORY */}
          <div style={{ display: activeTab === "inventory" ? "block" : "none" }}>
            <div className="flex justify-end mb-4">
              <AddItemDialog onAdd={handleAddItem} />
            </div>
            {inventoryLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin h-8 w-8 border-4 border-emerald-600 border-t-transparent rounded-full mx-auto" />
                <p className="mt-2 text-muted-foreground">Loading inventory...</p>
              </div>
            ) : (
              <InventoryDashboard
                items={inventory}
                lowStockItems={lowStockItems}
                expiredItems={expiredItems}
                expiringItems={expiringItems}
                onUpdateQuantity={updateQuantity}
                onDelete={deleteItem}
                onClear={clearInventory}
                onUpdateExpiryDate={updateExpiryDate}
                onAddItem={handleAddItem}
                onRemoveItem={removeItem}
              />
            )}
          </div>

          {/* SCAN — lazy: only mount after first visit */}
          {mounted.has("scan") && (
            <div style={{ display: activeTab === "scan" ? "block" : "none" }}>
              <SmartScanner onAddItem={handleAddItem} />
            </div>
          )}

          {/* AI CHAT — lazy */}
          {mounted.has("chat") && (
            <div style={{ display: activeTab === "chat" ? "block" : "none" }}>
              <AIChatbot inventory={inventory} />
            </div>
          )}

          {/* RECIPES — lazy */}
          {mounted.has("recipes") && (
            <div style={{ display: activeTab === "recipes" ? "block" : "none" }}>
              <RecipePanel inventory={inventory} />
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default GroceroApp;