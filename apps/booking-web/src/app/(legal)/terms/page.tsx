import type { Metadata } from "next";
import { LegalDocument } from "@/components/legal/LegalDocument";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "Draft terms of service for Gleami and Salonify (booking.salonify.co).",
  robots: { index: true, follow: true },
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <LegalDocument title="Terms of Service">
      <section>
        <h2 className="text-base font-semibold text-neutral-900">The service</h2>
        <p className="mt-2">
          Gleami and Salonify provide salon management and online booking tools.
          These draft terms apply to the Gleami staff app, Salonify web
          products, and public booking pages on booking.salonify.co.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-neutral-900">Your account</h2>
        <p className="mt-2">
          You must provide accurate account information and keep your login
          secure. You are responsible for activity on your account and for data
          you enter about your salon, staff, and clients.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-neutral-900">Acceptable use</h2>
        <p className="mt-2">
          Use the service only for lawful salon operations. Do not misuse the
          platform, attempt unauthorized access, or use it to infringe the
          rights of others. You must have a lawful basis to store client data
          you enter.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-neutral-900">Availability</h2>
        <p className="mt-2">
          The service is provided as-is. We may change or interrupt features to
          maintain or improve the product. These draft terms are not a
          counsel-reviewed contract.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-neutral-900">Contact</h2>
        <p className="mt-2">
          Questions about these terms: contact us through the Gleami app or
          your Salonify account. See also the Privacy Policy linked below.
        </p>
      </section>
    </LegalDocument>
  );
}
