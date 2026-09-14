export type RegisterSalonOwnerPayload = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  locale: string;
  emailRedirectTo: string;
  company: {
    name: string;
    email?: string;
    street?: string;
    city?: string;
    postalCode?: string;
    state?: string;
    country?: string;
  };
};

type RegisterSalonOwnerResponse = {
  success: boolean;
  error?: string;
  message?: string;
};

export async function registerSalonOwner(
  payload: RegisterSalonOwnerPayload
): Promise<RegisterSalonOwnerResponse> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase environment variables are not configured");
  }

  const response = await fetch(
    `${supabaseUrl}/functions/v1/register-salon-owner`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseAnonKey}`,
      },
      body: JSON.stringify(payload),
    }
  );

  const data = (await response.json()) as RegisterSalonOwnerResponse;

  if (!response.ok) {
    return {
      success: false,
      error: data.error ?? "Unable to create account",
      message: data.message,
    };
  }

  return data;
}
