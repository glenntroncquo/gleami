"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useIsMobile } from "@/hooks/use-mobile";
import { createClient } from "@/lib/supabase/client";
import { useCompanyId, useLocationId } from "@/lib/company-util";
import { asLocationClient, linkServiceToLocation } from "@/lib/location";
import { syncServiceVariantPhases } from "@/lib/api/calendar/mutations/save-staff-appointment";
import {
  createSupabaseVariantRemovalStore,
  removeServiceVariants,
} from "@/lib/api/catalog/remove-service-variants";
import {
  defaultVariantPhases,
  phaseTotals,
  phasesFromStored,
  resequencePhases,
  type CatalogPhase,
  type PhaseType,
} from "@/lib/api/calendar/layout-segments";
import { ServicePhaseEditor } from "@/components/service-phase-editor";
import { SERVICE_COLORS, COLOR_MAP } from "@/lib/service-colors";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { PlusIcon, ImageIcon, InfoIcon } from "lucide-react";
import {
  RiDeleteBinLine,
  RiLoader4Line,
  RiCalendarScheduleLine,
} from "@remixicon/react";

// Small info icon that reveals help text on hover/tap.
function InfoHint({ text }: { text: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="ml-1 inline-flex text-muted-foreground/70 hover:text-foreground align-text-bottom"
          aria-label={text}
          onClick={(e) => e.preventDefault()}
        >
          <InfoIcon size={13} aria-hidden="true" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[240px] text-xs">
        {text}
      </TooltipContent>
    </Tooltip>
  );
}

function SortableVariantTab({
  id,
  name,
  isActive,
  onSelect,
  dragLabel,
}: {
  id: string;
  name: string;
  isActive: boolean;
  onSelect: () => void;
  dragLabel: string;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  return (
    <button
      ref={setNodeRef}
      type="button"
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      onClick={onSelect}
      aria-label={`${name}. ${dragLabel}`}
      className={`max-w-[180px] truncate rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${
        isActive
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground"
      } ${isDragging ? "z-20 cursor-grabbing opacity-70" : "cursor-grab"}`}
      {...attributes}
      {...listeners}
    >
      {name}
    </button>
  );
}

// Types
type Treatment = {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  is_active: boolean | null;
  interval: number | null;
  company_id: string;
  created_at: string;
  updated_at: string | null;
  service_variants: ServiceVariant[];
};

type ServiceVariant = {
  id: string;
  name: string;
  price: number;
  max_price: number | null;
  duration_in_minutes: number;
  actual_duration_in_minutes: number | null;
  image_path: string | null;
  order: number | null;
  is_deleted?: boolean | null;
  phases?: CatalogPhase[];
};

type FormPhase = {
  phase_type: PhaseType;
  duration_minutes: number;
};

// Form validation schema
const formSchema = z.object({
  name: z.string().min(1, "Treatment name is required"),
  description: z.string().optional(),
  color: z.string().min(1),
  is_active: z.boolean(),
  interval: z
    .union([z.number().min(1, "Interval must be at least 1 minute"), z.null()])
    .optional(),
  serviceVariants: z
    .array(
      z.object({
        id: z.string().optional(),
        name: z.string().min(1, "Name is required"),
        price: z.number(),
        max_price: z.number().nullable().optional(),
        phases: z
          .array(
            z.object({
              phase_type: z.enum(["busy", "free", "buffer"]),
              duration_minutes: z.number().min(1),
            }),
          )
          .min(1)
          .refine((phases) => phases.some((phase) => phase.phase_type === "busy"), {
            message: "At least one busy block is required",
          }),
        image_path: z.string().optional(),
        order: z.number(),
      }),
    )
    .min(1, "At least one variant is required"),
});

type FormValues = z.infer<typeof formSchema>;

function toFormPhases(phases: CatalogPhase[]): FormPhase[] {
  return resequencePhases(phases).map((phase) => ({
    phase_type: phase.phase_type,
    duration_minutes: phase.duration_minutes,
  }));
}

interface ServiceSheetProps {
  service: Treatment | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: () => void;
  onDelete?: (serviceId: string) => void;
}

export function ServiceSheet({
  service: treatment,
  isOpen,
  onOpenChange,
  onSave,
  onDelete,
}: ServiceSheetProps) {
  const t = useTranslations();
  const companyId = useCompanyId();
  const locationId = useLocationId();
  const isMobile = useIsMobile();
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingImages, setUploadingImages] = useState<{
    [key: string]: boolean;
  }>({});
  const [isDeleting, setIsDeleting] = useState(false);
  const [activeOption, setActiveOption] = useState(0);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  // Set up the form with React Hook Form
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      color: "emerald",
      is_active: true,
      interval: null,
      serviceVariants: [
        {
          name: "",
          price: 0,
          max_price: null,
          phases: toFormPhases(defaultVariantPhases()),
          order: 0,
        },
      ],
    },
    mode: "onChange",
  });

  const { fields, append, remove, move } = useFieldArray({
    control: form.control,
    name: "serviceVariants",
  });

  const reindexVariantOrder = () => {
    form.getValues("serviceVariants").forEach((_, idx) => {
      form.setValue(`serviceVariants.${idx}.order`, idx);
    });
  };

  const handleVariantDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = fields.findIndex((field) => field.id === active.id);
    const newIndex = fields.findIndex((field) => field.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    move(oldIndex, newIndex);
    setActiveOption(newIndex);
    setTimeout(reindexVariantOrder, 0);
  };

  // Update form values when treatment data changes or dialog opens
  useEffect(() => {
    if (isOpen && treatment && treatment.service_variants) {
      const activeVariants = [...treatment.service_variants]
        .filter((variant) => variant.is_deleted !== true)
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      const variantData =
        activeVariants.length > 0
          ? activeVariants.map((option, index) => ({
              id: option.id,
              name: option.name || "",
              price: option.price,
              max_price: option.max_price,
              phases: toFormPhases(
                phasesFromStored(
                  option.phases,
                  option.duration_in_minutes,
                  option.actual_duration_in_minutes,
                ),
              ),
              image_path: option.image_path || undefined,
              order: option.order ?? index,
            }))
          : [
              {
                name: "",
                price: 0,
                max_price: null,
                phases: toFormPhases(defaultVariantPhases()),
                order: 0,
              },
            ];

      form.reset({
        name: treatment.name || "",
        description: treatment.description || "",
        color: treatment.color || "emerald",
        is_active: treatment.is_active ?? true,
        interval: treatment.interval || null,
        serviceVariants: variantData,
      });
    } else if (isOpen) {
      // Reset form for new treatment
      form.reset({
        name: "",
        description: "",
        color: "emerald",
        is_active: true,
        interval: null,
        serviceVariants: [
          {
            name: "Standard",
            price: 0,
            max_price: null,
            phases: toFormPhases(defaultVariantPhases()),
            order: 0,
          },
        ],
      });
    }
  }, [isOpen, treatment, form]);

  // Reset the active price option tab whenever the sheet opens.
  useEffect(() => {
    if (isOpen) setActiveOption(0);
  }, [isOpen]);

  // Handle file uploads for price option images
  const handleImageUpload = async (
    file: File,
    priceOptionIndex: number
  ): Promise<string | null> => {
    const currentCompanyId = companyId;
    if (!currentCompanyId) {
      toast.error("Company ID not found");
      return null;
    }

    try {
      setUploadingImages((prev) => ({
        ...prev,
        [priceOptionIndex]: true,
      }));

      const supabase = createClient();
      const fileExt = file.name.split(".").pop();
      const fileName = `service_variant_${Date.now()}.${fileExt}`;
      const filePath = `${currentCompanyId}/treatment_images/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("company")
        .upload(filePath, file);

      if (uploadError) {
        console.error("Upload error:", uploadError);
        toast.error("Failed to upload image");
        return null;
      }

      return filePath;
    } catch (error) {
      console.error("Image upload error:", error);
      toast.error("Failed to upload image");
      return null;
    } finally {
      setUploadingImages((prev) => ({
        ...prev,
        [priceOptionIndex]: false,
      }));
    }
  };

  const onSubmit = async (data: FormValues) => {
    try {
      setIsSaving(true);
      const supabase = createClient();

      let treatmentId: string;

      if (treatment?.id) {
        // Update existing treatment
        const { error: treatmentError } = await supabase
          .from("service")
          .update({
            name: data.name,
            description: data.description || null,
            color: data.color,
            is_active: data.is_active,
            booking_interval_minutes: data.interval,
          })
          .eq("id", treatment.id);

        if (treatmentError) {
          console.error("Error updating treatment:", treatmentError);
          toast.error("Failed to update treatment");
          return;
        }

        treatmentId = treatment.id;
      } else {
        // Create new treatment
        if (!companyId) {
          toast.error("Company ID not found");
          return;
        }

        const { data: newTreatment, error: treatmentError } = await supabase
          .from("service")
          .insert({
            name: data.name,
            description: data.description || null,
            color: data.color,
            is_active: data.is_active,
            booking_interval_minutes: data.interval,
            company_id: companyId,
          })
          .select()
          .single();

        if (treatmentError || !newTreatment) {
          console.error("Error creating treatment:", treatmentError);
          toast.error("Failed to create treatment");
          return;
        }

        treatmentId = newTreatment.id;

        const { error: offerError } = await linkServiceToLocation(
          asLocationClient(supabase),
          treatmentId,
          locationId,
        );
        if (offerError) {
          console.error("Error linking service to location:", offerError);
        }
      }

      const existingVariants = (treatment?.service_variants || []).filter(
        (variant) => variant.is_deleted !== true,
      );
      const submittedVariants = data.serviceVariants.map((option, index) => ({
        ...option,
        order: index,
      }));

      const newVariants = submittedVariants.filter((option) => !option.id);
      const updatedVariants = submittedVariants.filter((option) => option.id);
      const deletedVariants = existingVariants.filter(
        (existing) =>
          !submittedVariants.some((submitted) => submitted.id === existing.id),
      );

      if (deletedVariants.length > 0) {
        const removal = await removeServiceVariants(
          deletedVariants.map((option) => option.id),
          createSupabaseVariantRemovalStore(supabase),
        );

        if (removal.error) {
          console.error("Error deleting service variants:", removal.error);
          toast.error(t("treatments.error.deleteVariantsFailed"));
          return;
        }
      }

      if (updatedVariants.length > 0) {
        for (const option of updatedVariants) {
          if (!option.id) continue;

          const catalog = resequencePhases(option.phases);
          const totals = phaseTotals(catalog);

          const { error: updateError } = await supabase
            .from("service_variant")
            .update({
              name: option.name,
              price: option.price,
              max_price: option.max_price,
              client_duration_minutes: totals.clientMinutes,
              staff_duration_minutes: totals.staffMinutes,
              image_path: option.image_path ?? null,
              display_order: option.order,
            })
            .eq("id", option.id);

          if (updateError) {
            console.error(
              "Error updating service variant:",
              option.id,
              updateError,
            );
            toast.error(t("treatments.error.updateVariantsFailed"));
            return;
          }

          const phaseResult = await syncServiceVariantPhases({
            companyId: companyId!,
            serviceVariantId: option.id,
            phases: catalog,
          });
          if (phaseResult.error) {
            console.error("Error syncing variant phases:", phaseResult.error);
            toast.error("Failed to update service phases.");
            return;
          }
        }
      }

      if (newVariants.length > 0) {
        const { data: insertedVariants, error: insertError } = await supabase
          .from("service_variant")
          .insert(
            newVariants.map((option) => {
              const totals = phaseTotals(option.phases);
              return {
                name: option.name,
                price: option.price,
                max_price: option.max_price,
                client_duration_minutes: totals.clientMinutes,
                staff_duration_minutes: totals.staffMinutes,
                image_path: option.image_path ?? null,
                display_order: option.order,
                service_id: treatmentId,
                company_id: companyId!,
              };
            }),
          )
          .select("id, display_order");

        if (insertError) {
          console.error("Error creating service variants:", insertError);
          toast.error(t("treatments.error.createVariantsFailed"));
          return;
        }

        for (let i = 0; i < (insertedVariants || []).length; i += 1) {
          const variant = insertedVariants![i];
          const source = newVariants[i];
          if (!source) continue;
          const phaseResult = await syncServiceVariantPhases({
            companyId: companyId!,
            serviceVariantId: variant.id,
            phases: resequencePhases(source.phases),
          });
          if (phaseResult.error) {
            console.error("Error syncing variant phases:", phaseResult.error);
            toast.error("Failed to create service phases.");
            return;
          }
        }
      }

      toast.success(
        treatment?.id
          ? "Treatment updated successfully!"
          : "Treatment created successfully!"
      );

      onSave();
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving treatment:", error);
      toast.error("An unexpected error occurred.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!treatment?.id) {
      toast.error("No treatment to delete");
      return;
    }

    try {
      setIsDeleting(true);
      const supabase = createClient();

      // Soft delete: keep the row (and its variants) for historical
      // order/appointment references, just hide it from active use.
      const { error: treatmentError } = await supabase
        .from("service")
        .update({ is_deleted: true, is_active: false })
        .eq("id", treatment.id);

      if (treatmentError) {
        console.error("Error deleting treatment:", treatmentError);
        toast.error("Failed to delete treatment");
        setIsDeleting(false);
        return;
      }

      toast.success("Treatment deleted successfully!");

      // Call onDelete callback if provided
      if (onDelete) {
        onDelete(treatment.id);
      }

      // Refresh the data and close the sheet
      onSave();
      onOpenChange(false);
    } catch (error) {
      console.error("Error deleting treatment:", error);
      toast.error("An unexpected error occurred while deleting the treatment");
    } finally {
      setIsDeleting(false);
    }
  };

  // If validation fails, jump to the first price option that has an error so
  // the user isn't stuck on a tab with no visible problem.
  const handleInvalid = (errors: typeof form.formState.errors) => {
    const optionErrors = errors.serviceVariants;
    if (Array.isArray(optionErrors)) {
      const firstBad = optionErrors.findIndex((e) => e != null);
      if (firstBad >= 0) setActiveOption(firstBad);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent
        side={isMobile ? "bottom" : "right"}
        className={`${
          isMobile
            ? "h-[92vh] max-h-[92vh] rounded-t-xl border-t-2 border-t-gray-200 bg-white/95 backdrop-blur-sm"
            : "w-[600px] !max-w-[600px] sm:w-[600px] sm:top-4 sm:bottom-4 sm:right-4 sm:h-auto sm:max-h-[calc(100vh-2rem)] sm:rounded-2xl sm:border sm:border-border sm:overflow-hidden"
        } flex flex-col !p-0`}
      >
        {isMobile && (
          <div className="flex justify-center pt-3 pb-2 flex-shrink-0">
            <div className="w-12 h-1 bg-gray-300 rounded-full"></div>
          </div>
        )}
        <SheetHeader className="space-y-3 px-6 pt-6 pb-4 flex-shrink-0">
          <SheetTitle className="text-xl font-bold">
            {treatment ? t("treatments.edit") : t("treatments.create")}
          </SheetTitle>
        </SheetHeader>

        <TooltipProvider delayDuration={150}>
        <div className="flex-1 overflow-y-auto min-h-0 px-6">
          <form
            id="treatment-form"
            onSubmit={form.handleSubmit(onSubmit, handleInvalid)}
            className="space-y-6 pb-6"
          >
            <section className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="name">{t("common.name")}</Label>
                <Input
                  id="name"
                  {...form.register("name")}
                  placeholder={t("treatments.form.namePlaceholder")}
                  className="text-base"
                />
                {form.formState.errors.name && (
                  <p className="text-sm text-red-500">
                    {form.formState.errors.name.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="description">
                  {t("treatments.form.description")}
                </Label>
                <Textarea
                  id="description"
                  {...form.register("description")}
                  placeholder={t("treatments.form.descriptionPlaceholder")}
                  className="text-base"
                />
              </div>

              <div className="flex items-center gap-4">
                <div className="flex-1 space-y-1.5">
                  <Label>{t("treatments.form.color")}</Label>
                  <div className="flex flex-wrap gap-2">
                    {SERVICE_COLORS.map((colorOption) => {
                      const isSelected = form.watch("color") === colorOption;
                      return (
                        <button
                          key={colorOption}
                          type="button"
                          onClick={() => form.setValue("color", colorOption)}
                          className={`h-7 w-7 rounded-full border-2 transition-all ${
                            isSelected
                              ? "border-foreground scale-110"
                              : "border-transparent ring-1 ring-border hover:scale-105"
                          }`}
                          style={{ backgroundColor: COLOR_MAP[colorOption] }}
                          title={colorOption}
                          aria-label={`Select ${colorOption} color`}
                        />
                      );
                    })}
                  </div>
                </div>

                <label
                  htmlFor="is_active"
                  className="flex cursor-pointer items-center gap-2 py-2"
                >
                  <Switch
                    id="is_active"
                    checked={form.watch("is_active")}
                    onCheckedChange={(checked) =>
                      form.setValue("is_active", checked)
                    }
                  />
                  <span className="text-sm">
                    {form.watch("is_active")
                      ? t("common.active")
                      : t("common.inactive")}
                  </span>
                </label>
              </div>
            </section>

            {/* Section: Scheduling */}
            <section className="space-y-4 border-t pt-6">
              <h3 className="text-sm font-semibold">
                {t("treatments.form.sectionScheduling")}
              </h3>

              <div className="space-y-1.5">
                <Label htmlFor="interval">
                  <RiCalendarScheduleLine
                    size={14}
                    className="mr-1 inline align-text-bottom text-muted-foreground"
                    aria-hidden="true"
                  />
                  {t("treatments.form.intervalLabel")}
                  <InfoHint text={t("treatments.form.intervalHelp")} />
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="interval"
                    type="number"
                    min="1"
                    {...form.register("interval", {
                      setValueAs: (value) => {
                        if (
                          value === "" ||
                          value === null ||
                          value === undefined
                        ) {
                          return null;
                        }
                        const numValue = Number(value);
                        return isNaN(numValue) ? null : numValue;
                      },
                    })}
                    placeholder="15"
                    className="max-w-28 text-base"
                  />
                  <span className="text-sm text-muted-foreground">
                    {t("treatments.form.intervalUnit")}
                  </span>
                </div>
                {form.formState.errors.interval && (
                  <p className="text-sm text-red-500">
                    {form.formState.errors.interval.message}
                  </p>
                )}
              </div>
            </section>

            {/* Section: Price options */}
            <section className="space-y-4 border-t pt-6">
              <div>
                <h3 className="text-sm font-semibold">
                  {t("treatments.form.sectionPricing")}
                  <InfoHint text={t("treatments.form.sectionPricingDescription")} />
                </h3>
              </div>

              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleVariantDragEnd}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <SortableContext
                    items={fields.map((field) => field.id)}
                    strategy={horizontalListSortingStrategy}
                  >
                    {fields.map((field, index) => {
                      const name =
                        form.watch(`serviceVariants.${index}.name`) ||
                        t("treatments.form.optionLabel", { number: index + 1 });
                      return (
                        <SortableVariantTab
                          key={field.id}
                          id={field.id}
                          name={name}
                          isActive={index === activeOption}
                          onSelect={() => setActiveOption(index)}
                          dragLabel={t("treatments.form.reorderVariants")}
                        />
                      );
                    })}
                  </SortableContext>
                  <button
                    type="button"
                    onClick={() => {
                      const newOrder = fields.length;
                      append({
                        name: `Option ${fields.length + 1}`,
                        price: 0,
                        max_price: null,
                        phases: toFormPhases(defaultVariantPhases()),
                        order: newOrder,
                      });
                      setActiveOption(fields.length);
                    }}
                    className="flex items-center gap-1 rounded-full border border-dashed px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                  >
                    <PlusIcon size={15} />
                    {t("treatments.addPriceOption")}
                  </button>
                </div>
                {fields.length > 1 && (
                  <p className="text-xs text-muted-foreground">
                    {t("treatments.form.reorderVariants")}
                  </p>
                )}
              </DndContext>

              {fields.map((field, index) => {
                if (index !== activeOption) return null;
                const optionErrors =
                  form.formState.errors.serviceVariants?.[index];
                const imagePath = form.watch(
                  `serviceVariants.${index}.image_path`
                );
                const optionPhases =
                  form.watch(`serviceVariants.${index}.phases`) ||
                  toFormPhases(defaultVariantPhases());

                return (
                  <div
                    key={field.id}
                    className="space-y-4 rounded-lg border bg-card p-4"
                  >
                    {/* Card header: option number + remove */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {t("treatments.form.optionLabel", {
                          number: index + 1,
                        })}
                      </span>
                      {fields.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          aria-label={t("treatments.form.removeOption")}
                          onClick={() => {
                            remove(index);
                            setActiveOption((prev) =>
                              Math.max(0, Math.min(prev, fields.length - 2))
                            );
                            setTimeout(reindexVariantOrder, 0);
                          }}
                        >
                          <RiDeleteBinLine size={16} />
                        </Button>
                      )}
                    </div>

                    {/* Row: name */}
                    <div className="space-y-1.5">
                      <Label htmlFor={`serviceVariants.${index}.name`}>
                        {t("treatments.form.optionName")}
                      </Label>
                      <Input
                        id={`serviceVariants.${index}.name`}
                        {...form.register(`serviceVariants.${index}.name`)}
                        placeholder={t("treatments.form.optionNamePlaceholder")}
                        className="text-base"
                      />
                    </div>
                    {optionErrors?.name && (
                      <p className="text-sm text-red-500">
                        {optionErrors.name.message}
                      </p>
                    )}

                    {/* Row: price + max price */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor={`serviceVariants.${index}.price`}>
                          {t("treatments.form.optionPrice")}
                        </Label>
                        <Input
                          id={`serviceVariants.${index}.price`}
                          type="number"
                          step="0.01"
                          {...form.register(`serviceVariants.${index}.price`, {
                            valueAsNumber: true,
                          })}
                          placeholder="0.00"
                          className="text-base"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor={`serviceVariants.${index}.max_price`}>
                          {t("treatments.form.maxPrice")}
                          <span className="ml-1 text-xs font-normal text-muted-foreground">
                            {t("treatments.form.optional")}
                          </span>
                        </Label>
                        <Input
                          id={`serviceVariants.${index}.max_price`}
                          type="number"
                          step="0.01"
                          {...form.register(`serviceVariants.${index}.max_price`, {
                            setValueAs: (value) =>
                              value === "" ? null : Number(value),
                          })}
                          placeholder={t("treatments.form.priceFrom")}
                          className="text-base"
                        />
                      </div>
                    </div>

                    <ServicePhaseEditor
                      key={field.id}
                      phases={optionPhases}
                      color={form.watch("color")}
                      onChange={(next) =>
                        form.setValue(`serviceVariants.${index}.phases`, next, {
                          shouldDirty: true,
                          shouldValidate: true,
                        })
                      }
                    />
                    {optionErrors?.phases && (
                      <p className="text-sm text-red-500">
                        {optionErrors.phases.message ||
                          optionErrors.phases.root?.message}
                      </p>
                    )}

                    {/* Image */}
                    <div className="flex items-center gap-3">
                      {imagePath ? (
                        <img
                          src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/company/${imagePath}`}
                          alt=""
                          className="h-14 w-14 shrink-0 rounded-md object-cover"
                        />
                      ) : (
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md border border-dashed text-muted-foreground">
                          <ImageIcon size={18} />
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <label
                          className={`inline-flex cursor-pointer items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm hover:bg-muted ${
                            uploadingImages[index]
                              ? "pointer-events-none opacity-60"
                              : ""
                          }`}
                        >
                          {uploadingImages[index] ? (
                            <RiLoader4Line
                              size={14}
                              className="animate-spin"
                            />
                          ) : (
                            <ImageIcon size={14} />
                          )}
                          {uploadingImages[index]
                            ? t("treatments.form.uploading")
                            : t("treatments.form.addImage")}
                          <input
                            type="file"
                            accept="image/*"
                            className="sr-only"
                            disabled={uploadingImages[index]}
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const uploaded = await handleImageUpload(
                                  file,
                                  index
                                );
                                if (uploaded) {
                                  form.setValue(
                                    `serviceVariants.${index}.image_path`,
                                    uploaded
                                  );
                                }
                              }
                            }}
                          />
                        </label>
                        {imagePath && (
                          <button
                            type="button"
                            className="text-sm text-muted-foreground hover:text-destructive"
                            onClick={() =>
                              form.setValue(
                                `serviceVariants.${index}.image_path`,
                                undefined
                              )
                            }
                          >
                            {t("treatments.form.removeImage")}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </section>
          </form>
        </div>
        </TooltipProvider>

        {/* Form Buttons - Fixed at bottom */}
        <div
          className={`flex ${
            treatment?.id ? "justify-between" : "justify-end"
          } gap-2 px-6 py-4 border-t bg-background flex-shrink-0`}
        >
          {treatment?.id && (
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={handleDelete}
              disabled={isDeleting || isSaving}
              aria-label="Delete treatment"
            >
              {isDeleting ? (
                <RiLoader4Line
                  size={16}
                  className="animate-spin"
                  aria-hidden="true"
                />
              ) : (
                <RiDeleteBinLine size={16} aria-hidden="true" />
              )}
            </Button>
          )}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSaving || isDeleting}
            >
              {t("common.cancel")}
            </Button>
            <Button
              type="button"
              onClick={form.handleSubmit(onSubmit, handleInvalid)}
              disabled={isSaving || isDeleting}
            >
              {isSaving ? (
                <>
                  <RiLoader4Line size={16} className="animate-spin mr-2" />
                  {t("common.loading")}
                </>
              ) : (
                t("common.save")
              )}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
