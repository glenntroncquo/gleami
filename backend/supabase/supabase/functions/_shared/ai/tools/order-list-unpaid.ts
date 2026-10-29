import { z } from "zod";
import { orderRepository } from "../../order/repository.ts";
import { locationIdParameter, type ToolDefinition } from "./types.ts";

const MAX_ORDERS = 25;

const inputSchema = z
  .object({
    location_id: z.string().uuid().optional(),
  })
  .strict();

type Input = z.infer<typeof inputSchema>;

export const orderListUnpaidTool: ToolDefinition<Input> = {
  name: "order_list_unpaid",
  description:
    `List up to ${MAX_ORDERS} point-of-sale orders that are not fully paid, newest first, with the outstanding amount in euro.`,
  parameters: {
    type: "object",
    properties: { location_id: locationIdParameter },
    additionalProperties: false,
  },
  inputSchema,
  risk: "low",
  permission: "pos:read",
  idempotent: true,
  requestedLocationId: (input) => input.location_id,
  async execute(context, _input, scope) {
    const orders = await orderRepository.findUnpaid({
      companyId: context.companyId,
      locationId: scope.locationId,
      limit: MAX_ORDERS,
    });

    return orders.map((order) => {
      const total = order.totalAmount ?? 0;
      const paid = order.amountPaid ?? 0;
      return {
        order_id: order.id,
        order_number: order.orderNumber,
        date: order.date,
        location_id: order.locationId,
        client_id: order.clientId,
        client_name: order.clientName,
        payment_status: order.paymentStatus,
        total_amount: total,
        amount_paid: paid,
        outstanding_amount: Math.round((total - paid) * 100) / 100,
      };
    });
  },
};
