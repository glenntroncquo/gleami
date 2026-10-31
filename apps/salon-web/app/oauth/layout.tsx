import type { Metadata } from "next";
import "../globals.css";

export const metadata: Metadata = {
  title: "Approve access · Gleami",
};

export default function OAuthLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-white text-[#101114]">{children}</div>;
}
