import { useState } from "react";
import type { CartItem, Product, Service, ServiceVariant } from "../types";
import {
  getSubtotal,
  getTax,
  getTotal,
  getDiscount,
} from "../utils";

export function useCart() {
  const [cart, setCart] = useState<CartItem[]>([]);

  const addToCart = (
    item: Product | Service,
    type: "product" | "service",
    serviceVariant?: ServiceVariant
  ) => {
    if (type === "product") {
      const product = item as Product;
      const grossPrice = Math.round((product.price_gross || 0) * 100) / 100;

      const existingItem = cart.find(
        (cartItem) => cartItem.id === product.id && cartItem.type === "product"
      );
      if (existingItem) {
        setCart(
          cart.map((cartItem) =>
            cartItem.id === product.id && cartItem.type === "product"
              ? { ...cartItem, quantity: cartItem.quantity + 1 }
              : cartItem
          )
        );
      } else {
        setCart([
          ...cart,
          {
            id: product.id,
            name: product.name || "Unnamed Product",
            price: grossPrice,
            quantity: 1,
            type: "product",
            stockQty: product.stock_qty || 0,
            vatRate: product.vat_rate || 21,
          },
        ]);
      }
    } else {
      const service = item as Service;
      if (serviceVariant) {
        const grossPrice = Math.round((serviceVariant.price || 0) * 100) / 100;

        const existingItem = cart.find(
          (cartItem) => cartItem.serviceVariantId === serviceVariant.id
        );
        if (existingItem) {
          setCart(
            cart.map((cartItem) =>
              cartItem.serviceVariantId === serviceVariant.id
                ? { ...cartItem, quantity: cartItem.quantity + 1 }
                : cartItem
            )
          );
        } else {
          setCart([
            ...cart,
            {
              id: service.id,
              name: `${service.name} - ${serviceVariant.name}`,
              price: grossPrice,
              quantity: 1,
              type: "service",
              serviceVariantId: serviceVariant.id,
              vatRate: serviceVariant.vat_rate || 21,
            },
          ]);
        }
      }
    }
  };

  const removeFromCart = (index: number) => {
    const target = cart[index];
    if (target?.appointmentSegmentId) return;
    setCart(cart.filter((_, i) => i !== index));
  };

  const updateQuantity = (index: number, newQuantity: number) => {
    if (newQuantity <= 0) {
      const target = cart[index];
      if (target?.appointmentSegmentId) return;
      removeFromCart(index);
    } else {
      setCart(
        cart.map((item, i) =>
          i === index ? { ...item, quantity: newQuantity } : item
        )
      );
    }
  };

  const updatePrice = (index: number, newPrice: number) => {
    if (newPrice < 0) return;
    // Round to 2 decimal places
    const roundedPrice = Math.round(newPrice * 100) / 100;
    setCart(
      cart.map((item, i) =>
        i === index ? { ...item, price: roundedPrice } : item
      )
    );
  };

  const updateDiscount = (
    index: number,
    discountValue: number,
    discountType: "percentage" | "fixed"
  ) => {
    const item = cart[index];
    if (!item) return;

    if (discountType === "percentage") {
      if (discountValue < 0 || discountValue > 100) return;
      // Round to 1 decimal place
      const roundedDiscount = Math.round(discountValue * 10) / 10;
      setCart(
        cart.map((item, i) =>
          i === index
            ? {
                ...item,
                discountType: "percentage",
                discountPercentage: roundedDiscount,
                discountAmount: undefined,
              }
            : item
        )
      );
    } else {
      // Fixed amount - cannot exceed item price
      const maxDiscount = item.price * item.quantity;
      if (discountValue < 0 || discountValue > maxDiscount) return;
      // Round to 2 decimal places
      const roundedDiscount = Math.round(discountValue * 100) / 100;
      setCart(
        cart.map((item, i) =>
          i === index
            ? {
                ...item,
                discountType: "fixed",
                discountAmount: roundedDiscount,
                discountPercentage: undefined,
              }
            : item
        )
      );
    }
  };

  const clearCart = () => {
    setCart([]);
  };

  return {
    cart,
    setCart,
    addToCart,
    removeFromCart,
    updateQuantity,
    updatePrice,
    updateDiscount,
    clearCart,
    getSubtotal: () => getSubtotal(cart),
    getTax: () => getTax(cart),
    getTotal: () => getTotal(cart),
    getDiscount: () => getDiscount(cart),
  };
}
