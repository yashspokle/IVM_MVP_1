export interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  addedAt: Date;
  source: "scan" | "manual" | "voice";
}
