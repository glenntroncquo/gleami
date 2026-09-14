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
