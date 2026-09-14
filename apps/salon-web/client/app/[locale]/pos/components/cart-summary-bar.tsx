import { ShoppingCartIcon } from "lucide-react";

interface CartSummaryBarProps {
  cartLength: number;
  getSubtotal: () => number;
  getTotal: () => number;
  onOpenCart: () => void;
}

export function CartSummaryBar({
  cartLength,
  getSubtotal,
  getTotal,
  onOpenCart,
}: CartSummaryBarProps) {
  if (cartLength > 0) {
    return (
      <button
        onClick={onOpenCart}
        className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="relative">
            <ShoppingCartIcon size={20} />
            <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center">
              {cartLength}
            </span>
          </div>
          <span className="font-medium">
            {cartLength} item{cartLength !== 1 ? "s" : ""}
          </span>
        </div>
        <div className="text-right">
          <div className="text-sm text-muted-foreground">
            Subtotal: €{getSubtotal().toFixed(2)}
          </div>
          <div className="font-bold text-lg">
            Total: €{getTotal().toFixed(2)}
          </div>
        </div>
      </button>
    );
  }

  return (
    <button
      onClick={onOpenCart}
      className="w-full p-4 flex items-center justify-center gap-2 text-muted-foreground hover:bg-gray-50 transition-colors"
    >
      <ShoppingCartIcon size={20} />
      <span>Cart is empty</span>
    </button>
  );
}



