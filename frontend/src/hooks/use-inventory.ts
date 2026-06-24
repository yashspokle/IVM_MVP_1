import api from "../services/api";
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
  const fetchInventory = async () => {
    try {
      const token =
        localStorage.getItem(
          "grocero_token"
        );

      if (!token) {
        setInventory([]);
        return;
      }

      const response =
        await api.get(
          "/inventory",
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

      const items =
        response.data.map(
          (item: any) => ({
            id: item.id.toString(),
            name: item.item_name,
            quantity: item.quantity,
            source:
              item.source ||
              "manual",
            expiryDate:
              item.expiry_date,
            category:
              item.category,
            createdAt:
              item.created_at,
            userId:
              item.user_id?.toString() ||
              "",
          })
        );

      setInventory(items);
    } catch (error) {
      console.error(error);
    }
  };

  fetchInventory();
}, [userId]);


const addItem = useCallback(
  async (
    name: string,
    quantity: number,
    source: "scan" | "manual" | "voice",
    expiryDate?: string,
    category?: string
  ) => {
    try {
      const token =
        localStorage.getItem(
          "grocero_token"
        );

      await api.post(
        "/inventory",
        {
          item_name: name,
          quantity,
          category,
          bought_on: new Date()
            .toISOString()
            .split("T")[0],
          expiry_date: expiryDate,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const response =
        await api.get(
          "/inventory",
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

      const items =
        response.data.map(
          (item: any) => ({
            id: item.id.toString(),
            name: item.item_name,
            quantity: item.quantity,
            source:
              item.source ||
              "manual",
            expiryDate:
              item.expiry_date,
            category:
              item.category,
            createdAt:
              item.created_at,
            userId:
              item.user_id?.toString() ||
              "",
          })
        );

      setInventory(items);
    } catch (error) {
      console.error(error);
    }
  },
  [userId]
);
const removeItem = useCallback(
  async (name: string, quantity: number) => {
    try {
      const token =
        localStorage.getItem(
          "grocero_token"
        );

      if (!token) return;

      const item = inventory.find(
        (i) =>
          i.name.toLowerCase() ===
          name.toLowerCase()
      );

      if (!item) return;

      const newQuantity =
        item.quantity - quantity;

      if (newQuantity <= 0) {
        await api.delete(
          `/inventory/${item.id}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
      } else {
        await api.put(
          `/inventory/${item.id}`,
          {
            quantity: newQuantity,
            expiry_date:
              item.expiryDate
                ? item.expiryDate.split("T")[0]
                : null,
          },
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
      }

      const response =
        await api.get(
          "/inventory",
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

      setInventory(
        response.data.map(
          (item: any) => ({
            id: item.id.toString(),
            name: item.item_name,
            quantity: item.quantity,
            source:
              item.source ||
              "manual",
            expiryDate:
              item.expiry_date,
            category:
              item.category,
            createdAt:
              item.created_at,
            userId:
              item.user_id?.toString() ||
              "",
          })
        )
      );
    } catch (error) {
      console.error(error);
    }
  },
  [inventory]
);
const deleteItem = useCallback(
  async (id: string) => {
    try {
      const token =
        localStorage.getItem(
          "grocero_token"
        );

      await api.delete(
        `/inventory/${id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const response =
        await api.get(
          "/inventory",
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

      const items =
        response.data.map(
          (item: any) => ({
            id: item.id.toString(),
            name: item.item_name,
            quantity: item.quantity,
            source:
              item.source ||
              "manual",
            expiryDate:
              item.expiry_date,
            category:
              item.category,
            createdAt:
              item.created_at,
            userId:
              item.user_id?.toString() ||
              "",
          })
        );

      setInventory(items);
    } catch (error) {
      console.error(error);
    }
  },
  []
);
const updateQuantity = useCallback(
  async (id: string, quantity: number) => {
    try {
      const token =
        localStorage.getItem(
          "grocero_token"
        );

      if (!token) {
        console.error(
          "No auth token found"
        );
        return;
      }

      const parsedQuantity =
        Number(quantity);

      if (
        isNaN(parsedQuantity) ||
        parsedQuantity < 0
      ) {
        console.error(
          "Invalid quantity:",
          quantity
        );
        return;
      }

      const currentItem =
        inventory.find(
          (item) => item.id === id
        );

      if (!currentItem) {
        console.error(
          "Item not found:",
          id
        );
        return;
      }

      console.log("UPDATE:", {
        id,
        quantity: parsedQuantity,
        expiryDate:
          currentItem.expiryDate,
      });

      await api.put(
        `/inventory/${id}`,
        {
          quantity: parsedQuantity,
          expiry_date:
            currentItem.expiryDate
              ? currentItem.expiryDate.split(
                  "T"
                )[0]
              : null,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const response =
        await api.get(
          "/inventory",
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

      const items =
        response.data.map(
          (item: any) => ({
            id: item.id.toString(),
            name: item.item_name,
            quantity: item.quantity,
            source:
              item.source ||
              "manual",
            expiryDate:
              item.expiry_date,
            category:
              item.category,
            createdAt:
              item.created_at,
            userId:
              item.user_id?.toString() ||
              "",
          })
        );

      setInventory(items);
    } catch (error) {
      console.error(
        "Update quantity failed:",
        error
      );
    }
  },
  [inventory]
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
const clearInventory = useCallback(
  async () => {
    try {
      const token =
        localStorage.getItem(
          "grocero_token"
        );

      if (!token) return;

      for (const item of inventory) {
        await api.delete(
          `/inventory/${item.id}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
      }

      setInventory([]);
    } catch (error) {
      console.error(
        "Clear inventory failed:",
        error
      );
    }
  },
  [inventory]
);
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
