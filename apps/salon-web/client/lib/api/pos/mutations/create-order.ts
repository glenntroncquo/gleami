import { createClient } from "@/lib/supabase/client";
import {
  buildOrderCreateHttpBody,
  type CreateOrderWithPaymentV3Request,
} from "./order-create-payload";
import {
  parseOrderCreateResponse,
  type CreateOrderWithPaymentV3Response,
} from "./order-create-response";

export type {
  CreateOrderV3PaymentInput,
  CreateOrderWithPaymentV3Request,
  OrderCreateProductItem,
  OrderCreateTreatmentItem,
  PaymentType,
} from "./order-create-payload";
export {
  CHARGES_NOT_ENABLED,
  isChargesNotEnabledError,
  parseOrderCreateResponse,
} from "./order-create-response";
export type {
  CreateOrderV3PaymentResult,
  CreateOrderWithPaymentV3Response,
} from "./order-create-response";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;

/** Real logged-in staff session token - required so the backend can verify
 * company membership, rather than the public anon key which proves nothing. */
async function getAccessToken(): Promise<string> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    throw new Error("No active session - please log in again");
  }

  return session.access_token;
}

interface ProcessPaymentResponse {
  success: boolean;
  data?: unknown; // Stripe Terminal reader object
  error?: string;
  code?: string;
  message?: string;
  attempts?: number;
  paymentIntentStatus?: string;
}

interface SimulatePaymentResponse {
  success: boolean;
  data?: unknown; // Stripe Terminal reader object
  error?: string;
  code?: string;
  message?: string;
}

export async function createOrderWithPaymentV3(
  request: CreateOrderWithPaymentV3Request,
): Promise<CreateOrderWithPaymentV3Response> {
  const parsedDate = new Date(request.date);
  const normalizedDate = Number.isNaN(parsedDate.getTime())
    ? new Date().toISOString()
    : parsedDate.toISOString();

  const accessToken = await getAccessToken();

  const response = await fetch(
    `${SUPABASE_URL}/functions/v1/order-create`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(buildOrderCreateHttpBody(request, normalizedDate)),
    },
  );

  let payload: unknown = null;
  try {
    payload = await response.text();
  } catch {
    return {
      success: false,
      error: "Failed to create order",
      status: response.status,
    };
  }

  return parseOrderCreateResponse(response.status, payload);
}

export async function processPayment(
  readerId: string,
  paymentIntentId: string,
): Promise<ProcessPaymentResponse> {
  const accessToken = await getAccessToken();

  const response = await fetch(
    `${SUPABASE_URL}/functions/v1/payment-process-terminal`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        reader_id: readerId,
        payment_intent_id: paymentIntentId,
      }),
    },
  );

  return await response.json();
}

export async function simulatePayment(
  companyId: string,
  readerId: string,
  paymentIntentId: string,
  cardNumber: string,
): Promise<SimulatePaymentResponse> {
  const accessToken = await getAccessToken();

  const response = await fetch(
    `${SUPABASE_URL}/functions/v1/payment-simulate-terminal`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        company_id: companyId,
        reader_id: readerId,
        payment_intent_id: paymentIntentId,
        card_number: cardNumber,
      }),
    },
  );

  return await response.json();
}
