import type { Metadata } from "next";
import { LegalDocument } from "@/components/legal/LegalDocument";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "Draft privacy policy for Gleami and Salonify (booking.salonify.co).",
  robots: { index: true, follow: true },
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <LegalDocument title="Privacy Policy">
      <section>
        <h2 className="text-base font-semibold text-neutral-900">Who we are</h2>
        <p className="mt-2">
          This policy covers the Gleami staff app and Salonify web products,
          including public booking at booking.salonify.co. We process personal
          data to run salon booking, calendar, and related salon tools.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-neutral-900">
          Information we collect
        </h2>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>Account details you provide (name, email, password, salon profile).</li>
          <li>
            Business data you enter (clients, staff, services, appointments,
            notes).
          </li>
          <li>
            Technical data such as device, app version, and crash diagnostics.
          </li>
        </ul>
      </section>

      <section>
        <h2 className="text-base font-semibold text-neutral-900">How we use it</h2>
        <p className="mt-2">
          We use this information to provide and secure the service, send
          operational messages you request (for example booking confirmations),
          and improve reliability. We do not sell personal data.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-neutral-900">Processors</h2>
        <p className="mt-2">
          We use infrastructure and analytics providers to host the product and
          diagnose errors (including a database/auth host and crash reporting).
          They process data only to provide those services.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-neutral-900">Your rights</h2>
        <p className="mt-2">
          Depending on your location, you may request access, correction, or
          deletion of personal data, or object to certain processing. Contact us
          through the Gleami app or your Salonify account.
        </p>
      </section>
    </LegalDocument>
  );
}
