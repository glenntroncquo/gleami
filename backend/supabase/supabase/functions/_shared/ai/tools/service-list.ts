import { z } from "zod";
import { listServicesHandler } from "../../service/queries/list/handler.ts";
import { locationIdParameter, type ToolDefinition } from "./types.ts";

const inputSchema = z
  .object({
    location_id: z.string().uuid().optional(),
  })
  .strict();

type Input = z.infer<typeof inputSchema>;

export const serviceListTool: ToolDefinition<Input> = {
  name: "service_list",
  description:
    "List the salon's active services with their variants (id, name, price in euro, duration in minutes).",
  parameters: {
    type: "object",
    properties: { location_id: locationIdParameter },
    additionalProperties: false,
  },
  inputSchema,
  risk: "low",
  permission: "calendar:read",
  idempotent: true,
  requestedLocationId: (input) => input.location_id,
  async execute(context, _input, scope) {
    const services = await listServicesHandler({
      companyId: context.companyId,
      locationId: scope.locationId ?? undefined,
      staffIds: undefined,
      staffSlugs: undefined,
    });

    return services.map((service) => ({
      service_id: service.id,
      name: service.name,
      description: service.description,
      variants: service.service_variant.map((variant) => ({
        service_variant_id: variant.id,
        name: variant.name,
        price: variant.price,
        max_price: variant.max_price,
        duration_minutes: variant.client_duration_minutes,
      })),
    }));
  },
};
