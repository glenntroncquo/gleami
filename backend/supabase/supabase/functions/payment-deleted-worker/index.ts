import { EdgeWorker } from "@pgflow/edge-worker";
import { PaymentDeleted } from "../../flows/orders/payment-deleted.ts";

EdgeWorker.start(PaymentDeleted);
