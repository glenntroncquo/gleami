import { EdgeWorker } from "@pgflow/edge-worker";
import { OrderItemCreated } from "../../flows/orders/order-item-created.ts";

EdgeWorker.start(OrderItemCreated);
