import type { Product, CartItem } from "./types";

// Format price - show decimals only if they exist
export const formatPrice = (price: number): string => {
  if (price % 1 === 0) {
    return price.toString();
  }
  return price.toFixed(2);
};

// Product prices are stored and used as gross (incl. VAT)
export const getProductInclusivePrice = (product: Product): number => {
  return product.price_gross || 0;
};

// Subtotal uses stored gross prices directly
export const getSubtotal = (cart: CartItem[]): number => {
  return cart.reduce((total, item) => total + item.price * item.quantity, 0);
};

// Tax is not calculated client-side; prices are already gross
export const getTax = (cart: CartItem[]): number => {
  void cart;
  return 0;
};

// Calculate discount amount from inclusive prices
export const getDiscount = (cart: CartItem[]): number => {
  return cart.reduce((total, item) => {
    const discountType = item.discountType || "percentage";

    if (discountType === "percentage") {
      const discountPercentage = item.discountPercentage || 0;
      if (discountPercentage > 0) {
        const discountAmount = item.price * (discountPercentage / 100);
        return total + discountAmount * item.quantity;
      }
    } else {
      // Fixed amount discount
      const discountAmount = item.discountAmount || 0;
      if (discountAmount > 0) {
        // Fixed discount is per item, multiply by quantity
        return total + discountAmount * item.quantity;
      }
    }
    return total;
  }, 0);
};

// Total is sum of all inclusive prices minus discounts
export const getTotal = (cart: CartItem[]): number => {
  const subtotal = cart.reduce(
    (total, item) => total + item.price * item.quantity,
    0
  );
  const discount = getDiscount(cart);
  return subtotal - discount;
};

// Get initials from first and last name
export const getInitials = (
  firstName: string | null,
  lastName: string | null
): string => {
  const first = firstName?.charAt(0).toUpperCase() || "";
  const last = lastName?.charAt(0).toUpperCase() || "";
  return `${first}${last}`;
};
