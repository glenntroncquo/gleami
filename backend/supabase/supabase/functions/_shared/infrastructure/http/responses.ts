import { corsHeaders } from "./cors.ts";

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  code?: string;
}

export class OkResponse<T = any> extends Response {
  constructor(
    data: T,
    status: number = 200
  ) {

    super(JSON.stringify(data), {
      status,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
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
        "Content-Type": "application/json"
      }
    });
  }
}

export function createCorsResponse(): Response {
  return new Response(null, {
    status: 204,
    headers: corsHeaders
  });
}
