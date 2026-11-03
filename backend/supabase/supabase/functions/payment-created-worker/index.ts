import { EdgeWorker } from "@pgflow/edge-worker";
import { PaymentCreated } from "../../flows/orders/payment-created.ts";

EdgeWorker.start(PaymentCreated);
