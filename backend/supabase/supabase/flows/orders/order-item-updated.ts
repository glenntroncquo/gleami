import { Flow } from "@pgflow/dsl";
import { syncStock } from "./sync-stock.ts";

type Input = {
  orderItemId: string;
  orderId: string;
  companyId: string;
  oldProductId: string | null;
  oldQuantity: number | null;
  newProductId: string | null;
  newQuantity: number | null;
};

export const OrderItemUpdated = new Flow<Input>({
  slug: "order_item_updated",
})
  .step(
    { slug: "syncStock", maxAttempts: 1 },
    async (input) => {
      return await syncStock({
        type: "UPDATE",
        table: "order_item",
        schema: "public",
        old_record: {
          id: input.orderItemId,
          order_id: input.orderId,
          company_id: input.companyId,
          product_id: input.oldProductId,
          quantity: input.oldQuantity,
        },
        record: {
          id: input.orderItemId,
          order_id: input.orderId,
          company_id: input.companyId,
          product_id: input.newProductId,
          quantity: input.newQuantity,
        },
      });
    },
  );
