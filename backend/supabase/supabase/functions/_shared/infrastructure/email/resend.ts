const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";

/** Used when the TRANSACTIONAL_FROM_ADDRESS secret is unset or not a bare address. */
const DEFAULT_TRANSACTIONAL_FROM_ADDRESS = "afspraken@notifications.salonify.co";

/**
 * Sender mailbox from the Supabase secret TRANSACTIONAL_FROM_ADDRESS
 * (for example notifications@mail.gleami.eu). Read on each send so a secret
 * change applies on the next cold start without a code edit.
 */
export function transactionalFromAddress(): string {
  const configured = Deno.env.get("TRANSACTIONAL_FROM_ADDRESS")?.trim() ?? "";
  if (/^[^\s<>"]+@[^\s<>"]+\.[^\s<>"]+$/.test(configured)) return configured;
  if (configured) {
    console.error(
      "TRANSACTIONAL_FROM_ADDRESS is not a bare email address; using the default sender",
    );
  }
  return DEFAULT_TRANSACTIONAL_FROM_ADDRESS;
}

export function transactionalFrom(displayName: string): string {
  return `${displayName} <${transactionalFromAddress()}>`;
}

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
