import { useState, useEffect } from 'react';

export interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  source: 'scan' | 'manual' | 'voice';
  expiryDate?: string;
  category?: string;
  createdAt: string;
  userId: string;
}

export function useInventory(userId: string | null) {
  const [inventory, setInventory] = useState<InventoryItem[]>(() => {
    if (!userId) return [];
    const savedItems = localStorage.getItem(`grocero_inventory_${userId}`);
    return savedItems ? JSON.parse(savedItems) : [];
  });
  const [loading, setLoading] = useState(false);

  // Save to localStorage whenever inventory changes
  useEffect(() => {
    if (userId) {
      localStorage.setItem(`grocero_inventory_${userId}`, JSON.stringify(inventory));
    }
  }, [inventory, userId]);

  // Load inventory when userId changes
  useEffect(() => {
    if (userId) {
      const savedItems = localStorage.getItem(`grocero_inventory_${userId}`);
      setInventory(savedItems ? JSON.parse(savedItems) : []);
    } else {
      setInventory([]);
    }
  }, [userId]);

  const addItem = async (
    name: string,
    quantity: number,
    source: 'scan' | 'manual' | 'voice',
    expiryDate?: string,
    category?: string
  ) => {
    if (!userId) return;
    
    setLoading(true);
    
    // Check if item already exists
    const existingItem = inventory.find(
      (item) => item.name.toLowerCase() === name.toLowerCase()
    );

    if (existingItem) {
      // Update quantity if item exists
      setInventory((prev) =>
        prev.map((item) =>
          item.id === existingItem.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        )
      );
    } else {
      // Add new item
      const newItem: InventoryItem = {
        id: Date.now().toString(),
        name,
        quantity,
        source,
        expiryDate,
        category,
        createdAt: new Date().toISOString(),
        userId,
      };
      setInventory((prev) => [...prev, newItem]);
    }
    
    setLoading(false);
  };

  const removeItem = async (name: string, quantity: number) => {
    if (!userId) return;
    
    setLoading(true);
    
    setInventory((prev) =>
      prev
        .map((item) => {
          if (item.name.toLowerCase() === name.toLowerCase()) {
            const newQuantity = item.quantity - quantity;
            return newQuantity > 0 ? { ...item, quantity: newQuantity } : null;
          }
          return item;
        })
        .filter((item): item is InventoryItem => item !== null)
    );
    
    setLoading(false);
  };

  const deleteItem = async (id: string) => {
    if (!userId) return;
    
    setLoading(true);
    setInventory((prev) => prev.filter((item) => item.id !== id));
    setLoading(false);
  };

  const updateQuantity = async (id: string, quantity: number) => {
    if (!userId) return;
    
    setLoading(true);
    setInventory((prev) =>
      prev.map((item) => (item.id === id ? { ...item, quantity } : item))
    );
    setLoading(false);
  };

  const updateExpiryDate = async (id: string, expiryDate: string) => {
    if (!userId) return;
    
    setLoading(true);
    setInventory((prev) =>
      prev.map((item) => (item.id === id ? { ...item, expiryDate } : item))
    );
    setLoading(false);
  };

  const clearInventory = async () => {
    if (!userId) return;
    
    setLoading(true);
    setInventory([]);
    localStorage.removeItem(`grocero_inventory_${userId}`);
    setLoading(false);
  };

  // Calculate low stock items (quantity < 3)
  const lowStockItems = inventory.filter((item) => item.quantity < 3);

  // Calculate expired items
  const expiredItems = inventory.filter((item) => {
    if (!item.expiryDate) return false;
    return new Date(item.expiryDate) < new Date();
  });

  // Calculate expiring items (within 7 days)
  const expiringItems = inventory.filter((item) => {
    if (!item.expiryDate) return false;
    const expiryDate = new Date(item.expiryDate);
    const today = new Date();
    const daysUntilExpiry = Math.floor(
      (expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );
    return daysUntilExpiry <= 7 && daysUntilExpiry >= 0;
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
    lowStockItems,
    expiredItems,
    expiringItems,
  };
}