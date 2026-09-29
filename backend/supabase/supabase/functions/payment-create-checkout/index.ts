import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { z } from "zod";
import Stripe from "stripe";
import { createClient } from "supabase";
type SupabaseClient = any;

// --- cors ---

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

// --- errors ---

export class RepositoryError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "RepositoryError";
  }
}

export class UnauthenticatedError extends Error {
  constructor(message = "Missing or invalid authentication") {
    super(message);
    this.name = "UnauthenticatedError";
  }
}

export class ForbiddenError extends Error {
  constructor(message = "Not authorized to access this resource") {
    super(message);
    this.name = "ForbiddenError";
  }
}

// --- supabase ---

export type TypedSupabaseClient = SupabaseClient;

export const createSupabaseClient = (): TypedSupabaseClient => {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
};

export const supabaseAdmin: TypedSupabaseClient = createSupabaseClient();

// --- stripe_client ---

const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");
if (!STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY environment variable is required");
}

export const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: "2025-10-29.clover",
});

// --- resend ---

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";

export interface SendEmailParams {
  from: string;
  to: string[];
  subject: string;
  text?: string;
  html?: string;
}

export interface SendEmailResult {
  id: string;
}

export async function sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Resend API error: ${response.status} ${errorText}`);
  }

  return await response.json();
}

// --- responses ---

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  code?: string;
}

export class OkResponse<T = any> extends Response {
  constructor(data: T, status: number = 200) {
    super(JSON.stringify(data), {
      status,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  }
}

export class BadResponse extends Response {
  constructor(
    error: string,
    status: number = 400,
    message?: string,
    code?: string,
  ) {
    const response: ApiResponse = {
      success: false,
      error,
      ...(message && { message }),
      ...(code && { code }),
    };

    super(JSON.stringify(response), {
      status,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  }
}

// --- validate ---

export function validateInput<T>(schema: z.ZodType<T, z.ZodTypeDef, any>, data: unknown): T | BadResponse {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.errors.map((err) =>
        `${err.path.join(".")}: ${err.message}`
      ).join(", ");

      return new BadResponse(
        "Validation failed",
        400,
        errorMessages,
      );
    }

    return new BadResponse(
      "Invalid input",
      400,
      "Request data is malformed",
    );
  }
}

// --- auth ---

export interface AuthContext {
  userId: string;
  companyIds: string[];
  locationIds: string[];
}

function extractBearerToken(req: Request): string {
  const header = req.headers.get("Authorization");
  const token = header?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) {
    throw new UnauthenticatedError("Missing Authorization header");
  }
  return token;
}

async function membershipIdsForUser(userId: string): Promise<{
  companyIds: string[];
  locationIds: string[];
}> {
  const [companyResult, locationMembershipResult] = await Promise.all([
    supabaseAdmin.from("company_membership").select("company_id").eq("user_id", userId),
    supabaseAdmin
      .from("location_membership")
      .select("location_id")
      .eq("user_id", userId)
      .eq("is_active", true),
  ]);

  if (companyResult.error) {
    throw new RepositoryError("Failed to load company memberships", { cause: companyResult.error });
  }
  if (locationMembershipResult.error) {
    throw new RepositoryError("Failed to load location memberships", {
      cause: locationMembershipResult.error,
    });
  }

  const companyIds = [...new Set((companyResult.data ?? []).map((row) => row.company_id as string))];
  const locationIds = [
    ...new Set((locationMembershipResult.data ?? []).map((row) => row.location_id as string)),
  ];

  return { companyIds, locationIds };
}

export async function getAuthContext(req: Request): Promise<AuthContext> {
  const token = extractBearerToken(req);
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
  );
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) {
    throw new UnauthenticatedError("Invalid authentication");
  }

  const memberships = await membershipIdsForUser(data.user.id);
  return {
    userId: data.user.id,
    companyIds: memberships.companyIds,
    locationIds: memberships.locationIds,
  };
}

export function requireCompanyAccess(context: AuthContext, companyId: string): void {
  if (!context.companyIds.includes(companyId)) {
    throw new ForbiddenError(`Not authorized for company ${companyId}`);
  }
}

export function requireLocationAccess(context: AuthContext, locationId: string): void {
  if (!context.locationIds.includes(locationId)) {
    throw new ForbiddenError(`Not authorized for location ${locationId}`);
  }
}

// --- flags ---

export function isCardChargesEnabled(
  account: { chargesEnabled?: boolean } | null | undefined,
): boolean {
  return account?.chargesEnabled === true;
}

export const PLATFORM_APPLICATION_FEE_AMOUNT_CENTS = 0;

export function stripeDestinationAccountId(
  account: {
    chargesEnabled?: boolean;
    provider?: string;
    providerAccountId?: string | null;
  } | null | undefined,
): string | null {
  if (!account || !isCardChargesEnabled(account)) {
    return null;
  }
  if (account.provider !== "stripe" || !account.providerAccountId) {
    return null;
  }
  return account.providerAccountId;
}

export function destinationChargeCreateParams(
  destinationAccountId: string,
  _chargeAmountCents: number,
) {
  return {
    transfer_data: {
      destination: destinationAccountId,
    },
    application_fee_amount: PLATFORM_APPLICATION_FEE_AMOUNT_CENTS,
  };
}

// --- repo ---

export interface CompanyPaymentAccount {
  companyId: string;
  provider: string;
  providerAccountId: string;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
}

function toCompanyPaymentAccount(row: any): CompanyPaymentAccount {
  return {
    companyId: row.company_id,
    provider: row.provider,
    providerAccountId: row.provider_account_id,
    chargesEnabled: row.charges_enabled,
    payoutsEnabled: row.payouts_enabled,
    detailsSubmitted: row.details_submitted,
  };
}

export const companyPaymentAccountRepository = {
  async findByCompanyId(companyId: string): Promise<CompanyPaymentAccount | null> {
    const { data, error } = await supabaseAdmin
      .from("company_payment_account")
      .select("*")
      .eq("company_id", companyId)
      .maybeSingle();

    if (error) {
      throw new RepositoryError("Failed to fetch company payment account", { cause: error });
    }

    return data ? toCompanyPaymentAccount(data) : null;
  },
};

// --- compute ---

export type CompanyDepositSettings = {
  deposit_enabled?: boolean | null;
  deposit_type?: string | null;
  deposit_fixed_amount?: number | string | null;
  deposit_percent?: number | string | null;
};

/** Round money to cents (EUR). */
export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Compute deposit from company settings + appointment price.
 * Returns 0 when deposits are disabled or amount would be <= 0.
 */
export function computeDepositAmount(
  company: CompanyDepositSettings | null | undefined,
  appointmentPrice: number,
): number {
  if (!company?.deposit_enabled) return 0;
  if (company.deposit_type === "fixed") {
    return roundMoney(Math.max(0, Number(company.deposit_fixed_amount || 0)));
  }
  if (company.deposit_type === "percent") {
    const percent = Math.max(0, Number(company.deposit_percent || 0));
    return roundMoney(Math.max(0, Number(appointmentPrice || 0) * percent / 100));
  }
  return 0;
}

// --- redirect url allowlist (M4) ---

/**
 * success_url / cancel_url land in a Stripe Checkout session that is emailed
 * to the customer. Without an allowlist a caller could turn our pay links
 * into phishing redirects. Only our own app origins (and localhost for
 * development) are allowed.
 */
function isAllowedCheckoutRedirectUrl(raw: string): boolean {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }
  const host = url.hostname.toLowerCase();
  const isLocal = host === "localhost" || host === "127.0.0.1";
  if (url.protocol !== "https:" && !isLocal) return false;
  return isLocal || host === "salonify.co" || host.endsWith(".salonify.co");
}

// --- schema ---

export const createCheckoutSchema = z
  .object({
    company_id: z.string().uuid("Invalid company_id format"),
    order_id: z.string().uuid("Invalid order_id format").optional(),
    appointment_id: z.string().uuid("Invalid appointment_id format").optional(),
    amount: z.number().positive("Amount must be greater than zero").optional(),
    success_url: z.string().url("Invalid success_url"),
    cancel_url: z.string().url("Invalid cancel_url"),
    location_id: z.string().uuid("Invalid location_id format").optional(),
    client_email: z.string().email("Invalid client_email").optional(),
  })
  .superRefine((data, ctx) => {
    const hasOrder = !!data.order_id;
    const hasAppointment = !!data.appointment_id;
    if (hasOrder === hasAppointment) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Provide exactly one of order_id or appointment_id",
        path: hasOrder ? ["appointment_id"] : ["order_id"],
      });
    }
  });

export type CreateCheckoutInput = z.infer<typeof createCheckoutSchema>;

// --- index ---

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new BadResponse("Method not allowed", 405, "Only POST requests are allowed");
  }

  try {
    const authContext = await getAuthContext(req);
    const rawBody = await req.json();
    const validationResult = validateInput(createCheckoutSchema, rawBody);
    if (validationResult instanceof BadResponse) {
      return validationResult;
    }

    const {
      company_id,
      order_id,
      appointment_id,
      amount: requestedAmount,
      success_url,
      cancel_url,
      location_id: bodyLocationId,
      client_email: bodyClientEmail,
    } = validationResult;

    requireCompanyAccess(authContext, company_id);

    if (!isAllowedCheckoutRedirectUrl(success_url) || !isAllowedCheckoutRedirectUrl(cancel_url)) {
      return new BadResponse(
        "REDIRECT_URL_NOT_ALLOWED",
        400,
        "success_url and cancel_url must be https URLs on salonify.co",
      );
    }

    if (appointment_id) {
      return await createAppointmentDepositCheckout({
        authContext,
        company_id,
        appointment_id,
        success_url,
        cancel_url,
        bodyLocationId,
        bodyClientEmail,
      });
    }

    return await createOrderCheckout({
      authContext,
      company_id,
      order_id: order_id!,
      requestedAmount,
      success_url,
      cancel_url,
      bodyLocationId,
      bodyClientEmail,
    });
  } catch (error: any) {
    if (error instanceof UnauthenticatedError) {
      return new BadResponse(error.message, 401);
    }
    if (error instanceof ForbiddenError) {
      return new BadResponse(error.message, 403);
    }
    if (error instanceof RepositoryError) {
      console.error(error);
      return new BadResponse("Database query failed", 500, error.message);
    }

    console.error("Error creating checkout pay link:", error);
    return new BadResponse(
      "Internal server error",
      500,
      error?.message || "An unexpected error occurred",
    );
  }
});

async function createOrderCheckout(params: {
  authContext: { locationIds: string[] };
  company_id: string;
  order_id: string;
  requestedAmount?: number;
  success_url: string;
  cancel_url: string;
  bodyLocationId?: string;
  bodyClientEmail?: string;
}) {
  const {
    authContext,
    company_id,
    order_id,
    requestedAmount,
    success_url,
    cancel_url,
    bodyLocationId,
    bodyClientEmail,
  } = params;

  const { data: order, error: orderError } = await supabaseAdmin
    .from("order")
    .select("id, company_id, client_id, location_id, order_number, total_amount, amount_paid, payment_status")
    .eq("id", order_id)
    .eq("company_id", company_id)
    .maybeSingle();

  if (orderError) {
    throw new RepositoryError("Failed to load order", { cause: orderError });
  }
  if (!order) {
    return new BadResponse("ORDER_NOT_FOUND", 404, "Order not found for this company");
  }

  const locationId = bodyLocationId ?? order.location_id;
  if (!locationId) {
    return new BadResponse("LOCATION_REQUIRED", 400, "location_id is required for checkout payments");
  }
  requireLocationAccess(authContext as any, locationId);

  let clientEmail = bodyClientEmail?.trim() || "";
  if (!clientEmail && order.client_id) {
    const { data: client, error: clientError } = await supabaseAdmin
      .from("client")
      .select("email")
      .eq("id", order.client_id)
      .maybeSingle();
    if (clientError) {
      throw new RepositoryError("Failed to load client", { cause: clientError });
    }
    clientEmail = (client?.email ?? "").trim();
  }

  if (!clientEmail) {
    return new BadResponse(
      "CLIENT_EMAIL_REQUIRED",
      400,
      "A client email is required to send the payment link. Pass client_email or ensure the order client has an email.",
    );
  }

  const paymentAccount = await companyPaymentAccountRepository.findByCompanyId(company_id);
  const destinationAccountId = stripeDestinationAccountId(paymentAccount);
  if (!destinationAccountId) {
    return new BadResponse(
      "CHARGES_NOT_ENABLED",
      409,
      "Complete Stripe Connect onboarding before taking card payments",
    );
  }

  const totalAmount = Math.max(0, Number(order.total_amount || 0));
  const amountPaid = Math.max(0, Number(order.amount_paid || 0));
  const remainingDue = Math.max(0, roundMoney(totalAmount - amountPaid));
  // M4: a requested override may be a partial payment, but never more than
  // the order's remaining due — overcharging a customer is fraud-shaped.
  if (requestedAmount != null && roundMoney(requestedAmount) > remainingDue) {
    return new BadResponse(
      "AMOUNT_EXCEEDS_REMAINING",
      400,
      `Amount exceeds the remaining due of ${remainingDue.toFixed(2)} EUR`,
    );
  }

  const chargeAmount = requestedAmount != null
    ? roundMoney(requestedAmount)
    : remainingDue;

  if (!(chargeAmount > 0)) {
    return new BadResponse(
      "INVALID_AMOUNT",
      400,
      "Checkout amount must be greater than zero (order may already be fully paid)",
    );
  }

  const amountCents = Math.round(chargeAmount * 100);
  if (amountCents < 1) {
    return new BadResponse("INVALID_AMOUNT", 400, "Checkout amount must be at least 0.01 EUR");
  }

  const { data: payment, error: paymentError } = await supabaseAdmin
    .from("payment")
    .insert({
      order_id: order.id,
      appointment_id: null,
      company_id,
      location_id: locationId,
      payment_method: "pay_link",
      payment_provider: "stripe",
      amount: chargeAmount,
      amount_gross: chargeAmount,
      status: "pending",
      payment_status: "unpaid",
    })
    .select("id")
    .single();

  if (paymentError || !payment) {
    throw new RepositoryError("Failed to create pending payment", { cause: paymentError });
  }

  const orderNumber = order.order_number || order.id.slice(0, 8);
  let session;
  try {
    session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: clientEmail,
      success_url,
      cancel_url,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "eur",
            unit_amount: amountCents,
            product_data: {
              name: `Betaling ${orderNumber}`,
            },
          },
        },
      ],
      payment_intent_data: {
        ...destinationChargeCreateParams(destinationAccountId, amountCents),
        metadata: {
          company_id,
          order_id: order.id,
          payment_id: payment.id,
        },
      },
      metadata: {
        company_id,
        order_id: order.id,
        payment_id: payment.id,
      },
    });
  } catch (stripeError: any) {
    await supabaseAdmin.from("payment").delete().eq("id", payment.id);
    console.error("Stripe Checkout Session create failed:", stripeError);
    return new BadResponse(
      "STRIPE_CHECKOUT_FAILED",
      502,
      stripeError?.message || "Failed to create Stripe Checkout Session",
    );
  }

  if (!session.url || !session.id) {
    await supabaseAdmin.from("payment").delete().eq("id", payment.id);
    return new BadResponse(
      "STRIPE_CHECKOUT_FAILED",
      502,
      "Stripe did not return a Checkout URL",
    );
  }

  const { error: updateError } = await supabaseAdmin
    .from("payment")
    .update({
      processor_ref: session.id,
      notes: `checkout_session:${session.id}`,
      updated_at: new Date().toISOString(),
    })
    .eq("id", payment.id);

  if (updateError) {
    console.error("Failed to store checkout session id on payment:", updateError);
  }

  const { data: company } = await supabaseAdmin
    .from("company")
    .select("name")
    .eq("id", company_id)
    .maybeSingle();
  const companyName = company?.name || "Salon";

  const subject = "Betaallink voor je aankoop";
  const text =
    `Beste klant,\n\n` +
    `Hier is je betaallink voor aankoop ${orderNumber} (€${chargeAmount.toFixed(2)}):\n\n` +
    `${session.url}\n\n` +
    `Met vriendelijke groet,\n${companyName}\n`;
  const html =
    `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${subject}</title></head>` +
    `<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">` +
    `<h2>${subject}</h2>` +
    `<p>Beste klant,</p>` +
    `<p>Hier is je betaallink voor aankoop <strong>${orderNumber}</strong> (€${chargeAmount.toFixed(2)}):</p>` +
    `<p><a href="${session.url}" style="background:#0d6efd;color:#fff;padding:10px 20px;text-decoration:none;border-radius:5px;display:inline-block;">Betaal nu</a></p>` +
    `<p style="word-break:break-all;font-size:12px;color:#666;">${session.url}</p>` +
    `<p>Met vriendelijke groet,<br>${companyName}</p>` +
    `</body></html>`;

  try {
    await sendEmail({
      from: `${companyName} <afspraken@notifications.salonify.co>`,
      to: [clientEmail],
      subject,
      text,
      html,
    });
  } catch (mailError) {
    console.error("Best-effort pay-link email failed:", mailError);
  }

  return new OkResponse({
    success: true,
    data: {
      url: session.url,
      session_id: session.id,
      order_id: order.id,
      appointment_id: null,
      payment_id: payment.id,
      email: clientEmail,
    },
  });
}

async function createAppointmentDepositCheckout(params: {
  authContext: { locationIds: string[] };
  company_id: string;
  appointment_id: string;
  success_url: string;
  cancel_url: string;
  bodyLocationId?: string;
  bodyClientEmail?: string;
}) {
  const {
    authContext,
    company_id,
    appointment_id,
    success_url,
    cancel_url,
    bodyLocationId,
    bodyClientEmail,
  } = params;

  const { data: appointment, error: appointmentError } = await supabaseAdmin
    .from("appointment")
    .select("id, company_id, client_id, location_id, price, deposit_amount, client_email, status")
    .eq("id", appointment_id)
    .eq("company_id", company_id)
    .maybeSingle();

  if (appointmentError) {
    throw new RepositoryError("Failed to load appointment", { cause: appointmentError });
  }
  if (!appointment) {
    return new BadResponse("APPOINTMENT_NOT_FOUND", 404, "Appointment not found for this company");
  }

  const locationId = bodyLocationId ?? appointment.location_id;
  if (!locationId) {
    return new BadResponse("LOCATION_REQUIRED", 400, "location_id is required for checkout payments");
  }
  requireLocationAccess(authContext as any, locationId);

  let depositAmount = roundMoney(Math.max(0, Number(appointment.deposit_amount || 0)));
  if (!(depositAmount > 0)) {
    const { data: company, error: companyError } = await supabaseAdmin
      .from("company")
      .select("deposit_enabled, deposit_type, deposit_fixed_amount, deposit_percent")
      .eq("id", company_id)
      .maybeSingle();
    if (companyError) {
      throw new RepositoryError("Failed to load company deposit settings", { cause: companyError });
    }
    depositAmount = computeDepositAmount(company, Number(appointment.price || 0));
  }

  if (!(depositAmount > 0)) {
    return new BadResponse(
      "INVALID_AMOUNT",
      400,
      "Deposit amount must be greater than zero (set appointment.deposit_amount or company deposit settings)",
    );
  }

  let clientEmail = bodyClientEmail?.trim() || (appointment.client_email ?? "").trim();
  if (!clientEmail && appointment.client_id) {
    const { data: client, error: clientError } = await supabaseAdmin
      .from("client")
      .select("email")
      .eq("id", appointment.client_id)
      .maybeSingle();
    if (clientError) {
      throw new RepositoryError("Failed to load client", { cause: clientError });
    }
    clientEmail = (client?.email ?? "").trim();
  }

  if (!clientEmail) {
    return new BadResponse(
      "CLIENT_EMAIL_REQUIRED",
      400,
      "A client email is required to send the payment link. Pass client_email or ensure the appointment/client has an email.",
    );
  }

  const paymentAccount = await companyPaymentAccountRepository.findByCompanyId(company_id);
  const destinationAccountId = stripeDestinationAccountId(paymentAccount);
  if (!destinationAccountId) {
    return new BadResponse(
      "CHARGES_NOT_ENABLED",
      409,
      "Complete Stripe Connect onboarding before taking card payments",
    );
  }

  const amountCents = Math.round(depositAmount * 100);
  if (amountCents < 1) {
    return new BadResponse("INVALID_AMOUNT", 400, "Checkout amount must be at least 0.01 EUR");
  }

  const { data: payment, error: paymentError } = await supabaseAdmin
    .from("payment")
    .insert({
      order_id: null,
      appointment_id: appointment.id,
      company_id,
      location_id: locationId,
      payment_method: "deposit",
      payment_provider: "stripe",
      amount: depositAmount,
      amount_gross: depositAmount,
      status: "pending",
      payment_status: "unpaid",
    })
    .select("id")
    .single();

  if (paymentError || !payment) {
    throw new RepositoryError("Failed to create pending deposit payment", { cause: paymentError });
  }

  let session;
  try {
    session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: clientEmail,
      success_url,
      cancel_url,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "eur",
            unit_amount: amountCents,
            product_data: {
              name: "Voorschot afspraak",
            },
          },
        },
      ],
      payment_intent_data: {
        ...destinationChargeCreateParams(destinationAccountId, amountCents),
        metadata: {
          company_id,
          appointment_id: appointment.id,
          payment_id: payment.id,
        },
      },
      metadata: {
        company_id,
        appointment_id: appointment.id,
        payment_id: payment.id,
      },
    });
  } catch (stripeError: any) {
    await supabaseAdmin.from("payment").delete().eq("id", payment.id);
    console.error("Stripe Checkout Session create failed:", stripeError);
    return new BadResponse(
      "STRIPE_CHECKOUT_FAILED",
      502,
      stripeError?.message || "Failed to create Stripe Checkout Session",
    );
  }

  if (!session.url || !session.id) {
    await supabaseAdmin.from("payment").delete().eq("id", payment.id);
    return new BadResponse(
      "STRIPE_CHECKOUT_FAILED",
      502,
      "Stripe did not return a Checkout URL",
    );
  }

  const { error: updateError } = await supabaseAdmin
    .from("payment")
    .update({
      processor_ref: session.id,
      notes: `checkout_session:${session.id}`,
      updated_at: new Date().toISOString(),
    })
    .eq("id", payment.id);

  if (updateError) {
    console.error("Failed to store checkout session id on payment:", updateError);
  }

  const { data: company } = await supabaseAdmin
    .from("company")
    .select("name")
    .eq("id", company_id)
    .maybeSingle();
  const companyName = company?.name || "Salon";

  const subject = "Betaallink voor je voorschot";
  const text =
    `Beste klant,\n\n` +
    `Hier is je betaallink voor het voorschot (€${depositAmount.toFixed(2)}):\n\n` +
    `${session.url}\n\n` +
    `Met vriendelijke groet,\n${companyName}\n`;
  const html =
    `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${subject}</title></head>` +
    `<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">` +
    `<h2>${subject}</h2>` +
    `<p>Beste klant,</p>` +
    `<p>Hier is je betaallink voor het voorschot (€${depositAmount.toFixed(2)}):</p>` +
    `<p><a href="${session.url}" style="background:#0d6efd;color:#fff;padding:10px 20px;text-decoration:none;border-radius:5px;display:inline-block;">Betaal nu</a></p>` +
    `<p style="word-break:break-all;font-size:12px;color:#666;">${session.url}</p>` +
    `<p>Met vriendelijke groet,<br>${companyName}</p>` +
    `</body></html>`;

  try {
    await sendEmail({
      from: `${companyName} <afspraken@notifications.salonify.co>`,
      to: [clientEmail],
      subject,
      text,
      html,
    });
  } catch (mailError) {
    console.error("Best-effort deposit pay-link email failed:", mailError);
  }

  return new OkResponse({
    success: true,
    data: {
      url: session.url,
      session_id: session.id,
      order_id: null,
      appointment_id: appointment.id,
      payment_id: payment.id,
      email: clientEmail,
    },
  });
}