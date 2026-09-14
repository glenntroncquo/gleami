import { createSupabaseClient } from "@/shared/supabase";

type SupabaseClient = ReturnType<typeof createSupabaseClient>;

type PaymentStateResult = {
  order_id: string;
  company_id: string;
  payment_status: string;
  amount_paid: number;
  total_amount: number;
  remaining_due: number;
};

export async function syncOrderPaymentStateInFunction(
  supabase: SupabaseClient,
  input: {
    order_id: string;
    company_id?: string;
  },
): Promise<PaymentStateResult> {
  const { order_id, company_id } = input;

  let orderQuery = supabase
    .from("order")
    .select("id, company_id, total_amount")
    .eq("id", order_id);

  if (company_id) {
    orderQuery = orderQuery.eq("company_id", company_id);
  }

  const { data: order, error: orderError } = await orderQuery.single();

  if (orderError || !order) {
    throw new Error(
      `Order not found for reconciliation: ${orderError?.message || order_id}`,
    );
  }

  const { data: payments, error: paymentsError } = await supabase
    .from("payment")
    .select("amount, status, payment_status")
    .eq("order_id", order_id);

  if (paymentsError) {
    throw new Error(`Failed to fetch payments for order: ${paymentsError.message}`);
  }

  const totalPaidRaw = (payments || [])
    .filter((payment) => {
      const status = String(payment.status || "").toLowerCase();
      const paymentStatus = String(payment.payment_status || "").toLowerCase();
      const isSuccess = status === "succeeded" || status === "success";
      const isPaid = paymentStatus === "paid";
      return isSuccess && isPaid;
    })
    .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);

  const totalAmount = Math.max(0, Number(order.total_amount || 0));
  const roundedTotalPaid = Math.round(totalPaidRaw * 100) / 100;
  const amountPaid = Math.min(roundedTotalPaid, totalAmount);

  let paymentStatus = "unpaid";
  if (amountPaid >= totalAmount && totalAmount > 0) {
    paymentStatus = "paid";
  } else if (amountPaid > 0) {
    paymentStatus = "partially_paid";
  } else if (totalAmount === 0) {
    paymentStatus = "paid";
  }

  const remainingDue = Math.max(0, Math.round((totalAmount - amountPaid) * 100) / 100);

  const { error: updateError } = await supabase
    .from("order")
    .update({
      payment_status: paymentStatus,
      amount_paid: amountPaid,
      updated_at: new Date().toISOString(),
    })
    .eq("id", order.id);

  if (updateError) {
    throw new Error(`Failed to update order payment state: ${updateError.message}`);
  }

  return {
    order_id: order.id,
    company_id: order.company_id,
    payment_status: paymentStatus,
    amount_paid: amountPaid,
    total_amount: totalAmount,
    remaining_due: remainingDue,
  };
}

