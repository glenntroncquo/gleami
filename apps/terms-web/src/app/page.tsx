import { redirect } from "next/navigation";
import { overviewPath } from "@/content/documents";

export default function Home() {
  redirect(overviewPath);
}
