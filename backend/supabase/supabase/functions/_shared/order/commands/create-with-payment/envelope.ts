export interface PaymentResultDto {
  id: string;
  payment_type: string;
  amount: number;
  status: string;
  payment_status: string;
  paid: boolean;
  payment_intent_id: string | null;
  /** Payment Element secret. Present on card rows; null for cash/invoice/bank_transfer. */
  client_secret: string | null;
}

/**
 * Locked OkResponse: `{ success: true, data: { order_id, payments } }`.
 * Card rows add snake_case `client_secret` next to `payment_intent_id`.
 */
export function orderCreateSuccessEnvelope(orderId: string, payments: PaymentResultDto[]) {
  return {
    success: true as const,
    data: {
      order_id: orderId,
      payments,
    },
  };
}
