import { EdgeWorker } from "@pgflow/edge-worker";
import { OrderItemDeleted } from "../../flows/orders/order-item-deleted.ts";

EdgeWorker.start(OrderItemDeleted);
