import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders } from "@/shared/cors";
import { validateInput } from "@/shared/validation";
import { BadResponse, OkResponse } from "@/shared/responses";
import { ForbiddenError, RepositoryError, UnauthenticatedError } from "@/shared/errors";
import { getAuthContext } from "@/shared/auth-context";
import { requireCompanyPermission } from "@/shared/auth-permission";
import { createAccountLinkSchema } from "../_shared/company/commands/create-account-link/schema.ts";
import { createAccountLinkHandler } from "../_shared/company/commands/create-account-link/handler.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  if (req.method !== "POST") {
    return new BadResponse("Method not allowed", 405);
  }

  try {
    const authContext = await getAuthContext(req);
    const rawBody = await req.json();
    const validationResult = validateInput(createAccountLinkSchema, rawBody);

    if (validationResult instanceof BadResponse) {
      return validationResult;
    }

    await requireCompanyPermission(authContext, validationResult.company_id, "billing:manage");

    const result = await createAccountLinkHandler(validationResult);

    switch (result.outcome) {
      case "success":
        return new OkResponse({
          success: true,
          data: {
            url: result.data.url,
            expires_at: result.data.expiresAt,
            account: result.data.account,
          },
        });
      case "company_not_found":
        return new BadResponse("Company not found", 404);
      case "stripe_error":
        return new BadResponse(
          result.message,
          result.statusCode,
          result.message,
          result.code,
        );
    }
  } catch (error: unknown) {
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

    const message = error instanceof Error ? error.message : "An unexpected error occurred";
    console.error("Error creating Stripe Account Link:", error);
    return new BadResponse("Internal server error", 500, message);
  }
});
