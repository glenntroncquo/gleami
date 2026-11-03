import { EdgeWorker } from "@pgflow/edge-worker";
import { AppointmentCreated } from "../../flows/index.ts";

EdgeWorker.start(AppointmentCreated);
