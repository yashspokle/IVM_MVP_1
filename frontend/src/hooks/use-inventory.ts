import { useState, useEffect, useMemo, useCallback } from "react";

export interface InventoryItem {
id: string;
name: string;
quantity: number;
source: "scan" | "manual" | "voice";
expiryDate?: string;
category?: string;
createdAt: string;
userId: string;
}

export function useInventory(userId: string | null) {
const [inventory, setInventory] = useState<InventoryItem[]>([]);

// Load inventory when user changes
useEffect(() => {
if (!userId) {
setInventory([]);
return;
}

try {
  const savedItems = localStorage.getItem(
    `grocero_inventory_${userId}`
  );

  setInventory(
    savedItems ? JSON.parse(savedItems) : []
  );
} catch (error) {
  console.error("Inventory load error:", error);
  setInventory([]);
}

}, [userId]);

// Persist inventory
useEffect(() => {
if (!userId) return;

try {
  localStorage.setItem(
    `grocero_inventory_${userId}`,
    JSON.stringify(inventory)
  );
} catch (error) {
  console.error("Inventory save error:", error);
}

}, [inventory, userId]);

const addItem = useCallback(
(
name: string,
quantity: number,
source: "scan" | "manual" | "voice",
expiryDate?: string,
category?: string
) => {
if (!userId) return;

  setInventory((prev) => {
    const existingItem = prev.find(
      (item) =>
        item.name.toLowerCase() ===
        name.toLowerCase()
    );

    if (existingItem) {
      return prev.map((item) =>
        item.id === existingItem.id
          ? {
              ...item,
              quantity:
                item.quantity + quantity,
            }
          : item
      );
    }

    const newItem: InventoryItem = {
      id: crypto.randomUUID(),
      name,
      quantity,
      source,
      expiryDate,
      category,
      createdAt:
        new Date().toISOString(),
      userId,
    };

    return [...prev, newItem];
  });
},
[userId]


);

const removeItem = useCallback(
(name: string, quantity: number) => {
if (!userId) return;

  setInventory((prev) =>
    prev
      .map((item) => {
        if (
          item.name.toLowerCase() ===
          name.toLowerCase()
        ) {
          const newQuantity =
            item.quantity - quantity;

          return newQuantity > 0
            ? {
                ...item,
                quantity: newQuantity,
              }
            : null;
        }

        return item;
      })
      .filter(
        (
          item
        ): item is InventoryItem =>
          item !== null
      )
  );
},
[userId]

);

const deleteItem = useCallback(
(id: string) => {
setInventory((prev) =>
prev.filter(
(item) => item.id !== id
)
);
},
[]
);

const updateQuantity = useCallback(
(id: string, quantity: number) => {
setInventory((prev) =>
prev.map((item) =>
item.id === id
? { ...item, quantity }
: item
)
);
},
[]
);

const updateExpiryDate = useCallback(
(id: string, expiryDate: string) => {
setInventory((prev) =>
prev.map((item) =>
item.id === id
? { ...item, expiryDate }
: item
)
);
},
[]
);

const clearInventory = useCallback(() => {
if (!userId) return;
setInventory([]);

localStorage.removeItem(
  `grocero_inventory_${userId}`
);


}, [userId]);

const lowStockItems = useMemo(
() =>
inventory.filter(
(item) => item.quantity < 3
),
[inventory]
);

const expiredItems = useMemo(
() =>
inventory.filter((item) => {
if (!item.expiryDate)
return false;


    return (
      new Date(item.expiryDate) <
      new Date()
    );
  }),
[inventory]


);

const expiringItems = useMemo(
() =>
inventory.filter((item) => {
if (!item.expiryDate)
return false;


    const expiryDate = new Date(
      item.expiryDate
    );

    const daysUntilExpiry =
      Math.floor(
        (expiryDate.getTime() -
          Date.now()) /
          (1000 * 60 * 60 * 24)
      );

    return (
      daysUntilExpiry <= 7 &&
      daysUntilExpiry >= 0
    );
  }),
[inventory]


);

return {
inventory,
loading: false,
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
