import { EdgeWorker } from "@pgflow/edge-worker";
import { PaymentUpdated } from "../../flows/orders/payment-updated.ts";

EdgeWorker.start(PaymentUpdated);
