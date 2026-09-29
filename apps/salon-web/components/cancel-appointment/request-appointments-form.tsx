"use client";

import { useState } from "react";
import { RiMailSendLine } from "@remixicon/react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * "Email me my appointments" recovery form for the guest manage-booking
 * pages. Calls appointment-notify-history-email, which always answers with
 * the same success message (anti-enumeration) and emails tokenized
 * manage links to the address owner when bookings exist. companyId is
 * optional — without it the email covers upcoming appointments across
 * salons.
 */
export function RequestAppointmentsForm({ companyId }: { companyId?: string }) {
  const t = useTranslations("cancelAppointment.resend");
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (sending || sent) return;
    const trimmed = email.trim();
    if (!trimmed || !trimmed.includes("@")) return;

    try {
      setSending(true);
      const supabase = createClient();
      const { error } = await supabase.functions.invoke(
        "appointment-notify-history-email",
        {
          body: companyId ? { email: trimmed, companyId } : { email: trimmed },
        }
      );
      if (error) {
        console.error("Error requesting appointments email:", error);
      }
      // Uniform outcome regardless of success or error: never reveal whether
      // the address has bookings.
      setSent(true);
    } catch (err) {
      console.error("Error requesting appointments email:", err);
      setSent(true);
    } finally {
      setSending(false);
    }
  };

  if (sent) {
    return (
      <div className="text-center">
        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
          <RiMailSendLine className="h-6 w-6 text-green-600" />
        </div>
        <p className="text-sm text-gray-600 max-w-md mx-auto">{t("done")}</p>
      </div>
    );
  }

  return (
    <div className="text-center">
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{t("title")}</h3>
      <p className="text-sm text-gray-600 max-w-md mx-auto mb-4">
        {t("description")}
      </p>
      <form
        onSubmit={handleSubmit}
        className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto"
      >
        <Input
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder={t("placeholder")}
          className="flex-1"
        />
        <Button type="submit" disabled={sending} className="shrink-0">
          {sending ? t("sending") : t("submit")}
        </Button>
      </form>
    </div>
  );
}
