export interface InventoryItem {
  id: string;
  user_id?: string;
  name: string;
  quantity: number;
  unit?: string;
  expiry_date?: string;
  added_at: string;
  updated_at?: string;
  source: "scan" | "manual" | "voice";
  category?: string;
  image_url?: string;
  low_stock_threshold?: number;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  created_at: string;
}

export interface GroceryStore {
  id: string;
  name: string;
  logo: string;
  url: string;
  color: string;
}

export interface PriceComparison {
  store: GroceryStore;
  price: number;
  deliveryTime: string;
  available: boolean;
}

export const GROCERY_STORES: GroceryStore[] = [
  {
    id: "blinkit",
    name: "Blinkit",
    logo: "🟡",
    url: "https://blinkit.com/search?q=",
    color: "bg-yellow-500",
  },
  {
    id: "zepto",
    name: "Zepto",
    logo: "🟣",
    url: "https://www.zeptonow.com/search?query=",
    color: "bg-purple-500",
  },
  {
    id: "instamart",
    name: "Instamart",
    logo: "🟠",
    url: "https://www.swiggy.com/instamart/search?query=",
    color: "bg-orange-500",
  },
  {
    id: "bigbasket",
    name: "BigBasket",
    logo: "🟢",
    url: "https://www.bigbasket.com/ps/?q=",
    color: "bg-green-500",
  },
];

export type TabType = "inventory" | "scan" | "chat" | "recipes";
