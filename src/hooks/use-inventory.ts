import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { InventoryItem } from "@/types/grocero";
import { useToast } from "@/hooks/use-toast";

export const useInventory = (userId: string | null) => {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Fetch inventory from database
  const fetchInventory = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("inventory")
        .select("*")
        .eq("user_id", userId)
        .order("added_at", { ascending: false });

      if (error) throw error;
      
      setInventory(data?.map(item => ({
        ...item,
        source: item.source as "scan" | "manual" | "voice"
      })) || []);
    } catch (error) {
      console.error("Error fetching inventory:", error);
      toast({
        title: "Error",
        description: "Failed to load inventory",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [userId, toast]);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  // Add item to inventory
  const addItem = useCallback(async (
    name: string, 
    quantity: number, 
    source: "scan" | "manual" | "voice",
    expiryDate?: string,
    category?: string
  ) => {
    if (!userId) {
      toast({
        title: "Sign in required",
        description: "Please sign in to save items",
        variant: "destructive",
      });
      return null;
    }

    const normalizedName = name.toLowerCase().trim();
    
    // Check if item already exists
    const existing = inventory.find(i => i.name.toLowerCase() === normalizedName);
    
    if (existing) {
      // Update quantity
      const newQuantity = existing.quantity + quantity;
      const { error } = await supabase
        .from("inventory")
        .update({ 
          quantity: newQuantity,
          expiry_date: expiryDate || existing.expiry_date,
          updated_at: new Date().toISOString()
        })
        .eq("id", existing.id);

      if (error) {
        console.error("Error updating item:", error);
        toast({ title: "Error", description: "Failed to update item", variant: "destructive" });
        return null;
      }

      setInventory(prev => prev.map(i => 
        i.id === existing.id 
          ? { ...i, quantity: newQuantity, expiry_date: expiryDate || i.expiry_date }
          : i
      ));
      
      toast({ title: "Updated", description: `${normalizedName} quantity updated to ${newQuantity}` });
      return existing.id;
    }

    // Create new item
    const newItem = {
      user_id: userId,
      name: normalizedName,
      quantity,
      source,
      expiry_date: expiryDate || null,
      category: category || null,
      low_stock_threshold: 2,
    };

    const { data, error } = await supabase
      .from("inventory")
      .insert(newItem)
      .select()
      .single();

    if (error) {
      console.error("Error adding item:", error);
      toast({ title: "Error", description: "Failed to add item", variant: "destructive" });
      return null;
    }

    setInventory(prev => [{
      ...data,
      source: data.source as "scan" | "manual" | "voice"
    }, ...prev]);
    
    toast({ title: "Added", description: `${normalizedName} added to inventory` });
    return data.id;
  }, [userId, inventory, toast]);

  // Remove quantity from item
  const removeItem = useCallback(async (name: string, quantity: number) => {
    if (!userId) return;

    const normalizedName = name.toLowerCase().trim();
    const existing = inventory.find(i => i.name.toLowerCase() === normalizedName);
    
    if (!existing) {
      toast({
        title: "Not found",
        description: `${name} is not in your inventory`,
        variant: "destructive",
      });
      return;
    }

    const newQuantity = existing.quantity - quantity;
    
    if (newQuantity <= 0) {
      await deleteItem(existing.id);
    } else {
      const { error } = await supabase
        .from("inventory")
        .update({ quantity: newQuantity })
        .eq("id", existing.id);

      if (error) {
        toast({ title: "Error", description: "Failed to update item", variant: "destructive" });
        return;
      }

      setInventory(prev => prev.map(i => 
        i.id === existing.id ? { ...i, quantity: newQuantity } : i
      ));
      
      toast({ title: "Updated", description: `Removed ${quantity} ${normalizedName}` });
    }
  }, [userId, inventory, toast]);

  // Delete item completely
  const deleteItem = useCallback(async (id: string) => {
    const { error } = await supabase
      .from("inventory")
      .delete()
      .eq("id", id);

    if (error) {
      toast({ title: "Error", description: "Failed to delete item", variant: "destructive" });
      return;
    }

    setInventory(prev => prev.filter(i => i.id !== id));
    toast({ title: "Deleted", description: "Item removed from inventory" });
  }, [toast]);

  // Update item quantity
  const updateQuantity = useCallback(async (id: string, delta: number) => {
    const item = inventory.find(i => i.id === id);
    if (!item) return;

    const newQuantity = Math.max(1, item.quantity + delta);
    
    const { error } = await supabase
      .from("inventory")
      .update({ quantity: newQuantity })
      .eq("id", id);

    if (error) {
      toast({ title: "Error", description: "Failed to update quantity", variant: "destructive" });
      return;
    }

    setInventory(prev => prev.map(i => 
      i.id === id ? { ...i, quantity: newQuantity } : i
    ));
  }, [inventory, toast]);

  // Update expiry date
  const updateExpiryDate = useCallback(async (id: string, expiryDate: string | null) => {
    const { error } = await supabase
      .from("inventory")
      .update({ expiry_date: expiryDate })
      .eq("id", id);

    if (error) {
      toast({ title: "Error", description: "Failed to update expiry date", variant: "destructive" });
      return;
    }

    setInventory(prev => prev.map(i => 
      i.id === id ? { ...i, expiry_date: expiryDate || undefined } : i
    ));
  }, [toast]);

  // Clear all inventory
  const clearInventory = useCallback(async () => {
    if (!userId) return;

    const { error } = await supabase
      .from("inventory")
      .delete()
      .eq("user_id", userId);

    if (error) {
      toast({ title: "Error", description: "Failed to clear inventory", variant: "destructive" });
      return;
    }

    setInventory([]);
    toast({ title: "Cleared", description: "All items removed from inventory" });
  }, [userId, toast]);

  // Get low stock items
  const lowStockItems = inventory.filter(i => i.quantity <= (i.low_stock_threshold || 2));

  // Get expired items
  const today = new Date().toISOString().split('T')[0];
  const expiredItems = inventory.filter(i => i.expiry_date && i.expiry_date < today);

  // Get items expiring soon (within 3 days)
  const expiringItems = inventory.filter(i => {
    if (!i.expiry_date) return false;
    const expDate = new Date(i.expiry_date);
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
    return expDate <= threeDaysFromNow && expDate >= new Date(today);
  });

  return {
    inventory,
    loading,
    addItem,
    removeItem,
    deleteItem,
    updateQuantity,
    updateExpiryDate,
    clearInventory,
    refetch: fetchInventory,
    lowStockItems,
    expiredItems,
    expiringItems,
  };
};
