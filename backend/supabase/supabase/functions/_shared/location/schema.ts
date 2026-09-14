import { z } from "zod";
import { pickLocationId } from "./id.ts";

const optionalLocationId = z
  .string()
  .uuid("Invalid location_id format")
  .nullish();

export const optionalLocationIdFields = {
  location_id: optionalLocationId,
  locationId: optionalLocationId,
};

export { pickLocationId };
