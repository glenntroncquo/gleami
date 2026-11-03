import { EdgeWorker } from "@pgflow/edge-worker";
import { AppointmentUpdated } from "../../flows/appointments/appointment-updated.ts";

EdgeWorker.start(AppointmentUpdated);
