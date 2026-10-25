import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { NotFoundView } from "@/components/recovery/NotFoundView";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], display: "swap", variable: "--font-inter" });

export const metadata: Metadata = {
  title: "404 | Gleami",
  robots: { index: false, follow: true },
};

export default function GlobalNotFound() {
  return (
    <html lang="nl-BE" className={inter.variable}>
      <body className="bg-white font-sans text-ink">
        <NotFoundView global />
      </body>
    </html>
  );
}
