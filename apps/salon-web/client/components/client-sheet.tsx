"use client";

import { useEffect, useState } from "react";
import { RiCloseLargeLine } from "@remixicon/react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { useCompanyId, useLocationId } from "@/lib/company-util";
import {
  asLocationClient,
  fetchCompanyLocations,
  linkClientToLocation,
  primaryOrSoleLocationId,
} from "@/lib/location";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ClientSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onRefresh: () => void;
}

export function ClientSheet({ isOpen, onClose, onRefresh }: ClientSheetProps) {
  const t = useTranslations();
  const companyId = useCompanyId();
  const locationId = useLocationId();
  const isMobile = useIsMobile();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setFirstName("");
      setLastName("");
      setEmail("");
      setPhone("");
      setIsLoading(false);
    }
  }, [isOpen]);

  const handleSave = async () => {
    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      toast.error(t("clients.error.missingFields"));
      return;
    }

    try {
      setIsLoading(true);
      const supabase = createClient();

      const { data: createdClient, error: clientError } = await supabase
        .from("client")
        .insert({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          email: email.trim(),
          phone: phone.trim() || null,
        })
        .select("id")
        .single();

      if (clientError || !createdClient) {
        console.error("Error creating client:", clientError);
        toast.error(t("clients.error.createFailed"));
        return;
      }

      const locClient = asLocationClient(supabase);
      let targetLocationId = locationId;
      if (!targetLocationId && companyId) {
        const locations = await fetchCompanyLocations(locClient, companyId);
        targetLocationId = primaryOrSoleLocationId(locations);
      }

      const { error: locationError } = await linkClientToLocation(
        locClient,
        createdClient.id,
        targetLocationId,
      );
      if (locationError) {
        console.error("Error linking client to location:", locationError);
      }

      toast.success(t("clients.success.created"));
      onRefresh();
      onClose();
    } catch (error) {
      console.error("Error saving client:", error);
      toast.error(t("clients.error.createFailed"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side={isMobile ? "bottom" : "right"}
        className={cn(
          "[&>button:first-of-type]:hidden",
          isMobile
            ? "h-[90vh] max-h-[90vh] rounded-t-xl border-t-2 border-t-gray-200 bg-white/95 backdrop-blur-sm w-full"
            : "sm:top-4 sm:bottom-4 sm:right-4 sm:h-auto sm:max-h-[calc(100vh-2rem)] sm:rounded-2xl sm:border sm:border-border sm:overflow-hidden transition-all duration-300 ease-out",
          isMobile ? "w-full max-w-full" : "w-full sm:w-[480px] sm:max-w-[480px]",
          "!gap-0 !p-0",
        )}
      >
        <div className="flex h-full min-h-0 overflow-hidden bg-white">
          <div
            className={cn(
              "flex flex-col h-full min-h-0 overflow-hidden bg-white flex-shrink-0",
              isMobile ? "w-full" : "w-full sm:w-[480px]",
            )}
          >
            <div className="border-b-1">
              {isMobile && (
                <div className="flex justify-center pt-3 pb-2">
                  <div className="w-12 h-1 bg-gray-300 rounded-full" />
                </div>
              )}
              <SheetHeader>
                <div className="flex justify-between items-center w-full p-4 pb-3">
                  <SheetTitle className="text-xl font-semibold text-gray-900">
                    {t("clients.create")}
                  </SheetTitle>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onClose}
                    className="h-8 w-8 text-gray-500 hover:text-gray-900 hover:bg-gray-100"
                    aria-label="Close"
                  >
                    <RiCloseLargeLine size={18} />
                  </Button>
                </div>
              </SheetHeader>
            </div>

            <div
              className={cn(
                "flex-1 overflow-y-auto min-h-0 space-y-4",
                isMobile ? "px-4 py-4" : "px-6 py-6",
              )}
            >
              <div className="space-y-2">
                <Label htmlFor="client-first-name">
                  {t("staff.form.firstName")}
                </Label>
                <Input
                  id="client-first-name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="text-base"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="client-last-name">{t("staff.form.lastName")}</Label>
                <Input
                  id="client-last-name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="text-base"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="client-email">{t("common.email")}</Label>
                <Input
                  id="client-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="text-base"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="client-phone">{t("common.phone")}</Label>
                <Input
                  id="client-phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="text-base"
                />
              </div>
            </div>

            <SheetFooter className="border-t border-gray-100 p-4 mt-auto">
              <div className="flex w-full gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={onClose}
                  disabled={isLoading}
                >
                  {t("common.cancel")}
                </Button>
                <Button
                  type="button"
                  className="flex-1"
                  onClick={handleSave}
                  disabled={isLoading}
                >
                  {isLoading ? t("common.loading") : t("common.save")}
                </Button>
              </div>
            </SheetFooter>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
