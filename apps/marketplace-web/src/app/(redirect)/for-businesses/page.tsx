import { permanentRedirect } from "next/navigation";
import { routeFor } from "@/lib/i18n";

export default function ForBusinessesPage() {
  permanentRedirect(routeFor("nl-be", { kind: "business" }));
}
