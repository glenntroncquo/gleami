"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { useCompanyId, useLocationId } from "@/lib/company-util";
import {
  asLocationClient,
  fetchServiceIdsForLocation,
  linkStaffToLocation,
  withLocationId,
} from "@/lib/location";
import { useFileUpload } from "@/hooks/use-file-upload";
import { useIsMobile } from "@/hooks/use-mobile";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  ImagePlusIcon,
  XIcon,
  Check,
  ChevronDown,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface Staff {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  phone: string | null;
  slug: string | null;
  specialization: string | null;
  image_path: string | null;
  role: string | null;
  status: string | null;
  hire_date: string | null;
  specialties: string[] | null;
}

interface StaffSheetProps {
  staff: Staff | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (staff: Staff) => void;
  onRefresh?: () => void;
}

export function StaffSheet({
  staff,
  isOpen,
  onClose,
  onSave,
  onRefresh,
}: StaffSheetProps) {
  const t = useTranslations("staff");
  const commonT = useTranslations("common");
  const companyId = useCompanyId();
  const locationId = useLocationId();
  const isMobile = useIsMobile();

  // File upload configuration
  const maxSizeMB = 5;
  const maxSize = maxSizeMB * 1024 * 1024; // 5MB default

  const [
    { files, isDragging, errors: uploadErrors },
    {
      handleDragEnter,
      handleDragLeave,
      handleDragOver,
      handleDrop,
      openFileDialog,
      removeFile,
      getInputProps,
    },
  ] = useFileUpload({
    accept: "image/*",
    maxSize,
  });

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [slug, setSlug] = useState("");
  const [selectedTreatments, setSelectedTreatments] = useState<string[]>([]);
  const [treatments, setTreatments] = useState<
    Array<{ id: string; name: string; color: string | null }>
  >([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // Fetch treatments for the multiselect
  const fetchTreatments = async () => {
    try {
      console.log("Fetching treatments...");
      const supabase = createClient();
      let query = supabase
        .from("service")
        .select("id, name, color")
        .eq("is_active", true)
        .eq("is_deleted", false);
      if (locationId) {
        const offered = await fetchServiceIdsForLocation(
          asLocationClient(supabase),
          locationId,
        );
        if (offered.tablePresent) {
          if (offered.data.length === 0) {
            setTreatments([]);
            return;
          }
          query = query.in("id", offered.data);
        }
      }
      const { data, error } = await query;

      if (error) {
        console.error("Error fetching treatments:", error);
        return;
      }

      console.log("Treatments fetched:", data);
      setTreatments(data || []);
    } catch (error) {
      console.error("Error fetching treatments:", error);
    }
  };

  // Fetch staff treatments when editing
  const fetchStaffTreatments = async (staffId: string) => {
    try {
      console.log("Fetching staff treatments for staff ID:", staffId);
      const supabase = createClient();
      const { data, error } = await withLocationId(
        supabase
          .from("staff_service")
          .select("service_id")
          .eq("staff_id", staffId),
        locationId,
      );

      if (error) {
        console.error("Error fetching staff treatments:", error);
        return;
      }

      console.log("Staff treatments data:", data);
      const treatmentIds = data?.map((item) => item.service_id) || [];
      console.log("Extracted treatment IDs:", treatmentIds);
      setSelectedTreatments(treatmentIds);
    } catch (error) {
      console.error("Error fetching staff treatments:", error);
    }
  };

  useEffect(() => {
    console.log("Staff useEffect triggered with staff:", staff);
    if (staff) {
      setFirstName(staff.first_name || "");
      setLastName(staff.last_name || "");
      setEmail(staff.email || "");
      setPhone(staff.phone || "");
      setSlug(staff.slug || "");

      // Always fetch treatments when sheet opens
      fetchTreatments();

      // Fetch staff treatments if editing
      if (staff.id) {
        console.log("Calling fetchStaffTreatments for staff ID:", staff.id);
        fetchStaffTreatments(staff.id);
      } else {
        console.log("No staff ID, clearing selected treatments");
        setSelectedTreatments([]);
      }
    } else {
      console.log("No staff data, clearing form");
      setFirstName("");
      setLastName("");
      setEmail("");
      setPhone("");
      setSlug("");
      setSelectedTreatments([]);
      // Still fetch treatments for new staff to select from
      fetchTreatments();
    }
  }, [staff]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent | TouchEvent) {
      if (isDropdownOpen) {
        // Check if the click target is inside the dropdown
        const target = event.target as Element;
        const dropdown = document.querySelector('[data-dropdown="treatments"]');

        if (dropdown && !dropdown.contains(target)) {
          setIsDropdownOpen(false);
        }
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isDropdownOpen]);

  const handleSave = async () => {
    try {
      setIsLoading(true);
      const supabase = createClient();

      // Validation
      if (!firstName || !lastName || !email) {
        toast.error("Vul alle verplichte velden in");
        setIsLoading(false);
        return;
      }

      if (!companyId) {
        toast.error("Kan het bedrijfs-ID niet ophalen");
        setIsLoading(false);
        return;
      }

      // Create or update staff record
      let staffId = staff?.id;

      const normalizedSlug = slug.trim() || null;

      if (staffId) {
        // Update existing staff
        const { error } = await supabase
          .from("staff")
          .update({
            first_name: firstName,
            last_name: lastName,
            email: email,
            phone: phone,
            slug: normalizedSlug,
            // image_path is handled separately through file upload
          })
          .eq("id", staffId);

        if (error) {
          console.error("Error updating staff:", error);
          if (error.code === "23505") {
            toast.error(t("form.slugTaken"));
          } else {
            toast.error("Bijwerken van medewerker mislukt");
          }
          setIsLoading(false);
          return;
        }
      } else {
        // Create new staff
        const { data, error } = await supabase
          .from("staff")
          .insert({
            first_name: firstName,
            last_name: lastName,
            email: email,
            phone: phone,
            slug: normalizedSlug,
            company_id: companyId,
            // image_path is handled separately through file upload
          })
          .select("id, user_id")
          .single();

        if (error) {
          console.error("Error creating staff:", error);
          if (error.code === "23505") {
            toast.error(t("form.slugTaken"));
          } else {
            toast.error("Aanmaken van medewerker mislukt");
          }
          setIsLoading(false);
          return;
        }

        staffId = data.id;

        const created = data as { id: string; user_id?: string | null };
        const { error: membershipError } = await linkStaffToLocation(
          asLocationClient(supabase),
          staffId,
          locationId,
          created.user_id,
        );
        if (membershipError) {
          console.error("Error linking staff to location:", membershipError);
          toast.error("Medewerker aangemaakt, maar toewijzen aan vestiging mislukt");
          setIsLoading(false);
          return;
        }
      }

      // Handle profile image upload if there's a new image
      if (staffId && files[0]?.file) {
        try {
          // Check if we have an actual File object (not FileMetadata)
          if (!(files[0].file instanceof File)) {
            console.log("No new file to upload, skipping image upload");
            return;
          }

          // Delete old image if it exists
          if (staff?.image_path) {
            const { error: deleteError } = await supabase.storage
              .from("company")
              .remove([staff.image_path]);

            if (deleteError) {
              console.warn("Could not delete old image:", deleteError);
              // Don't fail the operation if old image deletion fails
            }
          }

          // Generate the image path: company_id/profile/staff_id.extension
          const fileExtension =
            files[0].file.name.split(".").pop()?.toLowerCase() || "jpg";
          const imagePath = `${companyId}/profile/${staffId}.${fileExtension}`;

          // Upload the file to Supabase storage
          const { error: uploadError } = await supabase.storage
            .from("company")
            .upload(imagePath, files[0].file, {
              cacheControl: "3600",
              upsert: true, // Overwrite if file exists
            });

          if (uploadError) {
            console.error("Error uploading image:", uploadError);
            toast.error("Profielfoto upload mislukt");
            setIsLoading(false);
            return;
          }

          // Update the staff record with the new image path
          const { error: updateError } = await supabase
            .from("staff")
            .update({ image_path: imagePath })
            .eq("id", staffId);

          if (updateError) {
            console.error("Error updating staff image_path:", updateError);
            toast.error("Profielfoto bijwerken mislukt");
            setIsLoading(false);
            return;
          }

          console.log("Image upload successful:", imagePath);
        } catch (uploadError) {
          console.error("Error during image upload:", uploadError);
          toast.error("Profielfoto upload mislukt");
          setIsLoading(false);
          return;
        }
      }

      // Handle treatments: first delete existing associations
      if (staffId) {
        const { error: deleteError } = await withLocationId(
          supabase.from("staff_service").delete().eq("staff_id", staffId),
          locationId,
        );

        if (deleteError) {
          console.error("Error deleting staff treatments:", deleteError);
          toast.error("Bijwerken van behandelingen mislukt");
          setIsLoading(false);
          return;
        }

        // Then add new associations if there are any selected treatments
        if (selectedTreatments.length > 0) {
          const treatmentRecords = selectedTreatments.map((treatmentId) => ({
            staff_id: staffId,
            service_id: treatmentId,
            company_id: companyId,
            ...(locationId ? { location_id: locationId } : {}),
          }));

          const { error: insertError } = await supabase
            .from("staff_service")
            .insert(
              treatmentRecords as unknown as {
                staff_id: string;
                service_id: string;
                company_id: string;
              }[],
            );

          if (insertError) {
            console.error("Error inserting staff treatments:", insertError);
            toast.error("Toewijzen van behandelingen mislukt");
            setIsLoading(false);
            return;
          }
        }
      }

      toast.success("Medewerker succesvol opgeslagen");

      // Create staff object for onSave callback
      if (onSave) {
        const staffData: Staff = {
          id: staffId!, // We know staffId exists at this point
          first_name: firstName,
          last_name: lastName,
          email: email,
          phone: phone,
          slug: normalizedSlug,
          specialization: staff?.specialization || null,
          image_path:
            files[0]?.file instanceof File
              ? `${companyId}/profile/${staffId}.${
                  files[0].file.name.split(".").pop()?.toLowerCase() || "jpg"
                }`
              : staff?.image_path || null,
          role: staff?.role || null,
          status: staff?.status || null,
          hire_date: staff?.hire_date || null,
          specialties: staff?.specialties || null,
        };
        onSave(staffData);
      }

      if (onRefresh) onRefresh();
      onClose();
    } catch (error) {
      console.error("Error saving staff data:", error);
      toast.error("Opslaan van medewerker mislukt");
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    if (staff) {
      setFirstName(staff.first_name || "");
      setLastName(staff.last_name || "");
      setEmail(staff.email || "");
      setPhone(staff.phone || "");
      setSlug(staff.slug || "");
    } else {
      // Reset form for new staff
      setFirstName("");
      setLastName("");
      setEmail("");
      setPhone("");
      setSlug("");
    }
    setSelectedTreatments([]);
    setError("");
    // Clear any uploaded files when resetting
    if (files.length > 0) {
      removeFile(files[0].id);
    }
  };

  const getInitials = (firstName: string, lastName: string) => {
    const first = firstName.charAt(0).toUpperCase();
    const last = lastName.charAt(0).toUpperCase();
    return `${first}${last}`;
  };

  const toggleTreatment = (treatmentId: string) => {
    console.log("Toggle treatment clicked:", treatmentId);
    console.log("Current selectedTreatments:", selectedTreatments);

    setSelectedTreatments((prev) => {
      const newSelection = prev.includes(treatmentId)
        ? prev.filter((id) => id !== treatmentId)
        : [...prev, treatmentId];

      console.log("New selection:", newSelection);
      return newSelection;
    });

    // Keep dropdown open when selecting/deselecting
    // setIsDropdownOpen(true);
  };

  const filteredTreatments = treatments.filter((treatment) =>
    treatment.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  console.log("Current state:", {
    treatments: treatments.length,
    selectedTreatments,
    filteredTreatments: filteredTreatments.length,
    searchQuery,
    isDropdownOpen,
  });

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent
        side={isMobile ? "bottom" : "right"}
        className={`${
          isMobile
            ? "h-[90vh] max-h-[90vh] rounded-t-xl border-t-2 border-t-gray-200 bg-white/95 backdrop-blur-sm"
            : "w-[600px] sm:w-[600px] sm:top-4 sm:bottom-4 sm:right-4 sm:h-auto sm:max-h-[calc(100vh-2rem)] sm:rounded-2xl sm:border sm:border-border sm:overflow-hidden"
        } flex flex-col`}
      >
        {isMobile && (
          <div className="flex justify-center pt-3 pb-2">
            <div className="w-12 h-1 bg-gray-300 rounded-full"></div>
          </div>
        )}
        <div className="border-b-1">
          <SheetHeader className="space-y-4">
            <div className="flex justify-between w-full p-4">
              <SheetTitle className="text-xl font-bold">
                {staff ? t("edit") : t("add")}
              </SheetTitle>
            </div>
          </SheetHeader>
        </div>

        <div
          className="flex-1 space-y-6 overflow-y-auto p-4"
          style={{
            maxHeight: isMobile ? "calc(90vh - 200px)" : "calc(100vh - 200px)",
          }}
        >
          {/* Profile Image Section */}
          <div className="flex items-center space-x-4">
            <div className="relative">
              {/* Circular Image Upload Area */}
              <div
                role="button"
                onClick={openFileDialog}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                data-dragging={isDragging || undefined}
                className="relative flex h-20 w-20 cursor-pointer items-center justify-center overflow-hidden rounded-full border-4 border-gray-200 bg-gray-100 shadow-sm transition-colors hover:border-gray-300 data-[dragging=true]:border-blue-400 data-[dragging=true]:bg-blue-50"
              >
                <input
                  {...getInputProps()}
                  className="sr-only"
                  aria-label="Upload profile image"
                />

                {/* Show uploaded image preview */}
                {files[0]?.preview ? (
                  <img
                    src={files[0].preview}
                    alt="Profile preview"
                    className="h-full w-full object-cover"
                  />
                ) : staff?.image_path ? (
                  /* Show existing image from database */
                  <img
                    src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/company/${staff.image_path}`}
                    alt={`${firstName} ${lastName}`}
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = "none";
                      target.nextElementSibling?.classList.remove("hidden");
                    }}
                  />
                ) : null}

                {/* Fallback initials */}
                {!files[0]?.preview && !staff?.image_path && (
                  <div className="flex h-full w-full items-center justify-center text-lg font-medium text-gray-600">
                    {getInitials(firstName, lastName)}
                  </div>
                )}

                {/* Upload icon overlay */}
                {!files[0]?.preview && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 transition-opacity hover:opacity-100">
                    <ImagePlusIcon className="h-6 w-6 text-white" />
                  </div>
                )}
              </div>

              {/* Remove button for uploaded files */}
              {files[0]?.preview && (
                <button
                  type="button"
                  className="absolute -bottom-1 -right-1 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-black/60 text-white transition-[color,box-shadow] outline-none hover:bg-black/80 focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  onClick={() => removeFile(files[0]?.id)}
                  aria-label="Remove uploaded image"
                >
                  <XIcon className="h-4 w-4" aria-hidden="true" />
                </button>
              )}
            </div>

            <div className="space-y-2 flex-1">
              {/* Upload instructions */}
              <p className="text-muted-foreground text-xs">
                Click the circle to upload • Max size: {maxSizeMB}MB
              </p>

              {/* Upload errors */}
              {uploadErrors.length > 0 && (
                <div className="text-destructive text-xs">
                  {uploadErrors[0]}
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Personal Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">{t("form.personalInfo")}</h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first-name">{t("form.firstName")} *</Label>
                <Input
                  id="first-name"
                  placeholder={t("form.firstNamePlaceholder")}
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="last-name">{t("form.lastName")} *</Label>
                <Input
                  id="last-name"
                  placeholder={t("form.lastNamePlaceholder")}
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">{t("form.email")} *</Label>
              <Input
                id="email"
                type="email"
                placeholder={t("form.emailPlaceholder")}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">{t("form.phone")}</Label>
              <Input
                id="phone"
                type="tel"
                placeholder={t("form.phonePlaceholder")}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug">{t("form.slug")}</Label>
              <Input
                id="slug"
                placeholder={t("form.slugPlaceholder")}
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
              />
              <p className="text-muted-foreground text-xs">
                {t("form.slugDescription")}
              </p>
            </div>
          </div>

          <Separator />

          {/* Treatments Selection */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">{t("form.treatments")}</h3>
            <p className="text-muted-foreground text-sm">
              {t("form.treatmentsDescription")}
            </p>

            <div className="space-y-2">
              <Label>Behandelingen</Label>
              <div className="relative">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-between"
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <span className="flex items-center">
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Behandelingen laden...
                    </span>
                  ) : (
                    <span>
                      {selectedTreatments.length
                        ? `${selectedTreatments.length} geselecteerd`
                        : "Selecteer behandelingen..."}
                    </span>
                  )}
                  <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>

                {isDropdownOpen && (
                  <div
                    data-dropdown="treatments"
                    className="absolute top-full left-0 right-0 mt-1 z-[9999] overflow-visible rounded-md border border-gray-200 bg-white shadow-lg"
                  >
                    <div className="p-2">
                      <Input
                        placeholder={t("common.search")}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="mb-2"
                      />
                      <div
                        className="overflow-auto rounded-md"
                        style={{ maxHeight: "300px" }}
                      >
                        {isLoading ? (
                          <div className="flex items-center justify-center py-4">
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Laden...
                          </div>
                        ) : filteredTreatments.length === 0 ? (
                          <div className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm text-gray-500">
                            Geen behandelingen gevonden.
                          </div>
                        ) : (
                          filteredTreatments.map((treatment) => {
                            const isSelected = selectedTreatments.includes(
                              treatment.id
                            );
                            console.log(
                              `Treatment ${treatment.name} (${treatment.id}) - Selected: ${isSelected}`
                            );

                            return (
                              <button
                                key={treatment.id}
                                type="button"
                                className={cn(
                                  "relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors text-left",
                                  isSelected
                                    ? "bg-gray-100"
                                    : "hover:bg-gray-100"
                                )}
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  console.log(
                                    "Treatment button clicked:",
                                    treatment.name,
                                    treatment.id
                                  );
                                  toggleTreatment(treatment.id);
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    isSelected ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                {treatment.name}
                              </button>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {selectedTreatments.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {selectedTreatments.map((id) => {
                    const treatment = treatments.find((t) => t.id === id);
                    return treatment ? (
                      <span
                        key={id}
                        className="bg-secondary text-secondary-foreground px-2 py-1 rounded-md text-xs flex items-center gap-1"
                      >
                        {treatment.name}
                        <XIcon
                          size={12}
                          className="cursor-pointer"
                          onClick={() => toggleTreatment(id)}
                        />
                      </span>
                    ) : null;
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="text-destructive text-sm bg-destructive/10 p-3 rounded-md">
              {error}
            </div>
          )}
        </div>

        <div className="border-t border-gray-100 p-4">
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={resetForm} disabled={isLoading}>
              {commonT("clear")}
            </Button>
            <Button onClick={handleSave} disabled={isLoading}>
              {commonT("save")}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
