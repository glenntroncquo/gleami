import { Flow } from "@pgflow/dsl";
import { syncStock } from "./sync-stock.ts";

type Input = {
  orderItemId: string;
  orderId: string;
  companyId: string;
  productId: string | null;
  quantity: number | null;
};

export const OrderItemDeleted = new Flow<Input>({
  slug: "order_item_deleted",
})
  .step(
    { slug: "syncStock", maxAttempts: 1 },
    async (input) => {
      return await syncStock({
        type: "DELETE",
        table: "order_item",
        schema: "public",
        old_record: {
          id: input.orderItemId,
          order_id: input.orderId,
          company_id: input.companyId,
          product_id: input.productId,
          quantity: input.quantity,
        },
      });
    },
  );
