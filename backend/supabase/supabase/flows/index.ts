// Re-export all flows from this directory.
//
// Do not add commented-out import examples: the Supabase CLI scans file
// text for import statements without parsing comments, so an example that
// names a missing file breaks "supabase start" with "failed to read file".

export { AppointmentCreated, AppointmentUpdated } from "./appointments/index.ts";
export {
  OrderItemCreated,
  OrderItemUpdated,
  OrderItemDeleted,
  PaymentCreated,
  PaymentUpdated,
  PaymentDeleted,
} from "./orders/index.ts";
