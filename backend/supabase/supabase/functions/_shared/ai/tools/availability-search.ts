import { z } from "zod";
import { getAvailabilityHandler } from "../../appointment/queries/availability/handler.ts";
import { locationIdParameter, ToolInputError, type ToolDefinition } from "./types.ts";

const MAX_DAYS = 14;
const MAX_SLOTS = 60;
const DAY_MS = 24 * 60 * 60 * 1000;

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD");

const inputSchema = z
  .object({
    services: z
      .array(
        z
          .object({
            service_id: z.string().uuid(),
            service_variant_id: z.string().uuid(),
            staff_id: z.string().uuid().optional(),
          })
          .strict(),
      )
      .min(1)
      .max(5),
    start_date: isoDate,
    end_date: isoDate,
    location_id: z.string().uuid().optional(),
  })
  .strict();

type Input = z.infer<typeof inputSchema>;

export const availabilitySearchTool: ToolDefinition<Input> = {
  name: "availability_search",
  description:
    `Find free appointment slots for one or more consecutive services between two dates (max ${MAX_DAYS} days). ` +
    "Times are in the salon's local time zone.",
  parameters: {
    type: "object",
    properties: {
      services: {
        type: "array",
        description: "Services booked back to back, in order. Ids come from service_list.",
        items: {
          type: "object",
          properties: {
            service_id: { type: "string" },
            service_variant_id: { type: "string" },
            staff_id: { type: "string", description: "Optional preferred staff member id." },
          },
          required: ["service_id", "service_variant_id"],
          additionalProperties: false,
        },
      },
      start_date: { type: "string", description: "First day, YYYY-MM-DD." },
      end_date: { type: "string", description: "Last day, YYYY-MM-DD." },
      location_id: locationIdParameter,
    },
    required: ["services", "start_date", "end_date"],
    additionalProperties: false,
  },
  inputSchema,
  risk: "low",
  permission: "calendar:read",
  idempotent: true,
  requestedLocationId: (input) => input.location_id,
  async execute(context, input, scope) {
    const start = Date.parse(`${input.start_date}T00:00:00Z`);
    const end = Date.parse(`${input.end_date}T00:00:00Z`);
    if (end < start) {
      throw new ToolInputError("end_date must not be before start_date");
    }
    if ((end - start) / DAY_MS > MAX_DAYS) {
      throw new ToolInputError(`Search at most ${MAX_DAYS} days at a time`);
    }

    const byDate = await getAvailabilityHandler({
      companyId: context.companyId,
      locationId: scope.locationId ?? undefined,
      services: input.services.map((service) => ({
        serviceId: service.service_id,
        serviceVariantId: service.service_variant_id,
        staffId: service.staff_id,
      })),
      startDate: input.start_date,
      endDate: `${input.end_date}T23:59:59`,
      staffIds: undefined,
    });

    const slots = Object.entries(byDate).flatMap(([date, day]) =>
      Object.entries(day.staff).flatMap(([staffId, staff]) =>
        staff.slots.map((slot) => ({
          date,
          day: day.dayName,
          start_time: slot.start_time,
          end_time: slot.end_time,
          staff_id: staffId,
          staff_name: `${staff.first_name} ${staff.last_name}`.trim(),
        }))
      )
    );
    slots.sort((a, b) => `${a.date}${a.start_time}`.localeCompare(`${b.date}${b.start_time}`));

    return {
      slots: slots.slice(0, MAX_SLOTS),
      total_slots: slots.length,
      truncated: slots.length > MAX_SLOTS,
    };
  },
};
