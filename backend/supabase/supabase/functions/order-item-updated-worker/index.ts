import { EdgeWorker } from "@pgflow/edge-worker";
import { OrderItemUpdated } from "../../flows/orders/order-item-updated.ts";

EdgeWorker.start(OrderItemUpdated);
