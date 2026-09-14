import { z } from "zod";
import { BadResponse } from "../http/responses.ts";

export function validateInput<T>(schema: z.ZodType<T, z.ZodTypeDef, any>, data: unknown): T | BadResponse {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.errors.map(err =>
        `${err.path.join('.')}: ${err.message}`
      ).join(', ');

      return new BadResponse(
        "Validation failed",
        400,
        errorMessages
      );
    }

    return new BadResponse(
      "Invalid input",
      400,
      "Request data is malformed"
    );
  }
}
