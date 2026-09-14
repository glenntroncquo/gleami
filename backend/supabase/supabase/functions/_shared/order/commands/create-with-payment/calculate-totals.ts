export interface OrderLineInput {
  quantity: number;
  unit_price: number;
  vat_rate?: number;
  discount_amount?: number;
}

export interface OrderTotals {
  subtotal: number;
  tax_amount: number;
  total_amount: number;
}

/** unit_price is gross (VAT-inclusive); vat_rate is extracted from the gross total, not added on top. */
export function calculateTotals(orderItems: OrderLineInput[]): OrderTotals {
  let totalAmount = 0;
  let totalTax = 0;

  for (const item of orderItems) {
    const itemGrossTotal = item.quantity * item.unit_price;
    const itemDiscount = Math.min(
      Math.max(item.discount_amount || 0, 0),
      itemGrossTotal,
    );
    const itemTotalAfterDiscount = itemGrossTotal - itemDiscount;

    totalAmount += itemTotalAfterDiscount;
    const vatRate = item.vat_rate || 0;
    const itemTax = vatRate > 0
      ? itemTotalAfterDiscount * (vatRate / (100 + vatRate))
      : 0;
    totalTax += itemTax;
  }

  const subtotal = totalAmount - totalTax;

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    tax_amount: Math.round(totalTax * 100) / 100,
    total_amount: Math.round(totalAmount * 100) / 100,
  };
}
