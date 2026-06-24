import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus } from "lucide-react";

interface AddItemFormProps {
  onAdd: (name: string, quantity: number) => void;
}

const AddItemForm = ({ onAdd }: AddItemFormProps) => {
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState(1);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onAdd(name.trim(), quantity);
      setName("");
      setQuantity(1);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <Input
        placeholder="Item name..."
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="flex-1 border-emerald-200 focus-visible:ring-emerald-500"
      />
      <Input
        type="number"
        min={1}
        value={quantity}
        onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
        className="w-16 border-emerald-200 focus-visible:ring-emerald-500"
      />
      <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700">
        <Plus className="h-4 w-4" />
      </Button>
    </form>
  );
};

export default AddItemForm;
