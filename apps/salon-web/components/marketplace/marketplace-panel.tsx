"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  type DragEndEvent,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  RiAlertLine,
  RiArrowDownLine,
  RiArrowUpLine,
  RiCheckLine,
  RiClipboardLine,
  RiCloseLine,
  RiDraggable,
  RiImageAddLine,
  RiLoader4Line,
} from "@remixicon/react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { PublishChecklistItem } from "@/lib/marketplace/checklist";
import { DESCRIPTION_LIMIT, MARKETPLACE_MIME_TYPES } from "@/lib/marketplace/media";
import { normalizeSlug } from "@/lib/marketplace/slug";
import type { MarketplaceCategory, MarketplacePhoto, MarketplaceService } from "@/lib/marketplace/api";

export type MarketplacePanelProps = {
  locationName: string;
  showSwitcherHint: boolean;
  isActive: boolean;
  listed: boolean;
  slug: string;
  slugSuggestion: string | null;
  companyId: string;
  description: string;
  street: string;
  postalCode: string;
  city: string;
  latitude: string;
  longitude: string;
  coordinatesSaved: boolean;
  checklist: PublishChecklistItem[];
  services: MarketplaceService[];
  categories: MarketplaceCategory[];
  photos: MarketplacePhoto[];
  canEditCategories: boolean;
  savingListing: boolean;
  savingProfile: boolean;
  findingCoordinates: boolean;
  uploading: boolean;
  busyServiceId: string | null;
  onListedChange: (next: boolean) => void;
  onSlugChange: (value: string) => void;
  onSlugBlur: () => void;
  onSaveSlug: () => void;
  onApplySuggestion: () => void;
  onCopyPath: (path: string) => void;
  onDescriptionChange: (value: string) => void;
  onStreetChange: (value: string) => void;
  onPostalCodeChange: (value: string) => void;
  onCityChange: (value: string) => void;
  onLatitudeChange: (value: string) => void;
  onLongitudeChange: (value: string) => void;
  onFindCoordinates: () => void;
  onSaveProfile: () => void;
  onToggleService: (serviceId: string, visible: boolean) => void;
  onToggleCategory: (serviceId: string, categoryId: string, checked: boolean) => void;
  onUpload: (files: FileList) => void;
  onReorderPhotos: (orderedIds: string[]) => void;
  onDeletePhoto: (id: string) => void;
};

export function MarketplacePanel(props: MarketplacePanelProps) {
  const t = useTranslations("settings.marketplace");
  const normalized = normalizeSlug(props.slug);
  const publicPath = normalized ? `/salon/${normalized}` : "";
  const bookingUrl =
    normalized && props.companyId
      ? `https://booking.salonify.co/${props.companyId}/${normalized}`
      : "";
  const accept = MARKETPLACE_MIME_TYPES.join(",");

  return (
    <div className="space-y-8" data-testid="marketplace-settings">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-muted-foreground text-xs">{t("currentLocation")}</p>
          <p className="text-base font-medium">{props.locationName}</p>
          {props.showSwitcherHint && (
            <p className="text-muted-foreground mt-1 text-xs">{t("switchHint")}</p>
          )}
        </div>
        {!props.isActive && (
          <span className="bg-muted text-muted-foreground rounded-full px-2.5 py-1 text-xs">
            {t("inactive")}
          </span>
        )}
      </div>

      <section className="space-y-5">
        <div>
          <h3 className="text-base font-semibold">{t("publish.title")}</h3>
        </div>

        <div className="flex items-center justify-between gap-4">
          <div className="space-y-0.5">
            <p className="text-sm font-medium">{t("publish.toggle")}</p>
            <p className="text-muted-foreground text-sm">{t("publish.toggleHint")}</p>
          </div>
          <Switch
            checked={props.listed}
            disabled={props.savingListing}
            onCheckedChange={props.onListedChange}
            aria-label={t("publish.toggle")}
            data-testid="marketplace-publish-toggle"
          />
        </div>

        {!props.isActive && (
          <Notice>{t("publish.inactiveWarning")}</Notice>
        )}
        {props.listed && !props.coordinatesSaved && (
          <Notice>{t("publish.noGeoWarning")}</Notice>
        )}

        <div className="space-y-2">
          <Label htmlFor="marketplace-slug">{t("publish.slug")}</Label>
          <Input
            id="marketplace-slug"
            value={props.slug}
            onChange={(event) => props.onSlugChange(event.target.value)}
            onBlur={props.onSlugBlur}
            placeholder={t("publish.slugPlaceholder")}
            data-testid="marketplace-slug"
          />
          <p className="text-muted-foreground text-xs">{t("publish.slugHint")}</p>
        </div>

        <div className="bg-muted/40 space-y-2 rounded-lg border px-3 py-3">
          <p className="text-muted-foreground text-xs">{t("publish.preview")}</p>
          {publicPath ? (
            <div className="flex items-center justify-between gap-2">
              <p className="font-mono text-sm break-all">{publicPath}</p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => props.onCopyPath(publicPath)}
              >
                <RiClipboardLine size={16} className="mr-1.5" />
                {t("publish.copy")}
              </Button>
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">{t("publish.previewEmpty")}</p>
          )}
          {bookingUrl && (
            <p className="text-muted-foreground text-xs break-all">
              {t("publish.booking")}{" "}
              <a
                href={bookingUrl}
                target="_blank"
                rel="noreferrer"
                className="text-foreground underline-offset-2 hover:underline"
              >
                {bookingUrl}
              </a>
            </p>
          )}
        </div>

        {props.slugSuggestion && (
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span>{t("publish.slugTaken")}</span>
            <span className="text-muted-foreground">
              {t("publish.slugSuggestion", { slug: props.slugSuggestion })}
            </span>
            <Button type="button" variant="outline" size="sm" onClick={props.onApplySuggestion}>
              {t("publish.useSuggestion")}
            </Button>
          </div>
        )}

        <div className="flex justify-end">
          <Button type="button" variant="outline" onClick={props.onSaveSlug} disabled={props.savingListing}>
            {props.savingListing && <RiLoader4Line size={16} className="mr-1.5 animate-spin" />}
            {t("publish.saveSlug")}
          </Button>
        </div>

        <div data-testid="marketplace-checklist">
          <p className="mb-2 text-sm font-medium">{t("publish.checklistTitle")}</p>
          <ul className="space-y-2">
            {props.checklist.map((item) => (
              <li key={item.id} className="flex items-start justify-between gap-3 text-sm">
                <span className="flex items-start gap-2">
                  {item.done ? (
                    <RiCheckLine size={16} className="mt-0.5 text-emerald-600" />
                  ) : (
                    <RiCloseLine size={16} className="text-muted-foreground mt-0.5" />
                  )}
                  <span className={item.done ? "" : "text-muted-foreground"}>
                    {t(`publish.items.${item.id}`)}
                  </span>
                </span>
                <span className="text-muted-foreground shrink-0 text-xs">
                  {item.blocking ? t("publish.required") : t("publish.recommended")}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <Separator />

      <section className="space-y-5">
        <h3 className="text-base font-semibold">{t("profile.title")}</h3>
        <div className="space-y-2">
          <Label htmlFor="marketplace-description">{t("profile.description")}</Label>
          <Textarea
            id="marketplace-description"
            value={props.description}
            maxLength={DESCRIPTION_LIMIT}
            rows={5}
            placeholder={t("profile.descriptionPlaceholder")}
            onChange={(event) => props.onDescriptionChange(event.target.value)}
          />
          <p className="text-muted-foreground text-xs">
            {t("profile.counter", { count: props.description.length, limit: DESCRIPTION_LIMIT })}
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="marketplace-street">{t("profile.street")}</Label>
          <Input
            id="marketplace-street"
            value={props.street}
            onChange={(event) => props.onStreetChange(event.target.value)}
          />
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="marketplace-postal">{t("profile.postalCode")}</Label>
            <Input
              id="marketplace-postal"
              value={props.postalCode}
              onChange={(event) => props.onPostalCodeChange(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="marketplace-city">{t("profile.city")}</Label>
            <Input
              id="marketplace-city"
              value={props.city}
              onChange={(event) => props.onCityChange(event.target.value)}
            />
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium">{t("profile.coordinates")}</p>
            <span className="text-muted-foreground text-xs">
              {props.coordinatesSaved ? t("profile.coordinatesSet") : t("profile.coordinatesMissing")}
            </span>
          </div>
          <p className="text-muted-foreground text-xs">{t("profile.coordinateHint")}</p>
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="marketplace-lat">{t("profile.latitude")}</Label>
              <Input
                id="marketplace-lat"
                inputMode="decimal"
                value={props.latitude}
                placeholder="50.8503"
                onChange={(event) => props.onLatitudeChange(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="marketplace-lng">{t("profile.longitude")}</Label>
              <Input
                id="marketplace-lng"
                inputMode="decimal"
                value={props.longitude}
                placeholder="4.3517"
                onChange={(event) => props.onLongitudeChange(event.target.value)}
              />
            </div>
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={props.onFindCoordinates}
              disabled={props.findingCoordinates}
            >
              {props.findingCoordinates && (
                <RiLoader4Line size={16} className="mr-1.5 animate-spin" />
              )}
              {props.findingCoordinates ? t("profile.finding") : t("profile.findCoordinates")}
            </Button>
            <Button type="button" onClick={props.onSaveProfile} disabled={props.savingProfile}>
              {props.savingProfile && <RiLoader4Line size={16} className="mr-1.5 animate-spin" />}
              {t("profile.save")}
            </Button>
          </div>
        </div>
      </section>

      <Separator />

      <section className="space-y-4">
        <div>
          <h3 className="text-base font-semibold">{t("services.title")}</h3>
          <p className="text-muted-foreground text-sm">{t("services.hint")}</p>
        </div>
        {!props.canEditCategories && (
          <p className="text-muted-foreground text-xs">{t("services.noCatalogPermission")}</p>
        )}
        {props.services.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t("services.empty")}</p>
        ) : (
          <ul className="space-y-3">
            {props.services.map((service) => (
              <li key={service.id} className="space-y-3 rounded-lg border p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">{service.name}</p>
                    {!service.active && (
                      <p className="text-muted-foreground text-xs">{t("services.inactive")}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor={`visible-${service.id}`} className="text-muted-foreground text-xs">
                      {t("services.visible")}
                    </Label>
                    <Switch
                      id={`visible-${service.id}`}
                      checked={service.visible}
                      disabled={props.busyServiceId === service.id}
                      onCheckedChange={(checked) => props.onToggleService(service.id, checked)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-muted-foreground text-xs">{t("services.categories")}</p>
                  <div className="flex flex-wrap gap-2">
                    {props.categories.map((category) => {
                      const checked = service.categoryIds.includes(category.id);
                      return (
                        <label
                          key={category.id}
                          className={cn(
                            "flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs",
                            checked && "border-primary/40 bg-primary/5",
                            !props.canEditCategories && "opacity-80",
                          )}
                        >
                          <Checkbox
                            checked={checked}
                            disabled={!props.canEditCategories || props.busyServiceId === service.id}
                            onCheckedChange={(value) =>
                              props.onToggleCategory(service.id, category.id, value === true)
                            }
                          />
                          {category.name}
                        </label>
                      );
                    })}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Separator />

      <PhotoSection
        photos={props.photos}
        uploading={props.uploading}
        accept={accept}
        onUpload={props.onUpload}
        onReorderPhotos={props.onReorderPhotos}
        onDeletePhoto={props.onDeletePhoto}
      />
    </div>
  );
}

function Notice({ children }: { children: ReactNode }) {
  return (
    <div className="flex gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm">
      <RiAlertLine size={16} className="mt-0.5 shrink-0" />
      <p>{children}</p>
    </div>
  );
}

function PhotoSection({
  photos,
  uploading,
  accept,
  onUpload,
  onReorderPhotos,
  onDeletePhoto,
}: {
  photos: MarketplacePhoto[];
  uploading: boolean;
  accept: string;
  onUpload: (files: FileList) => void;
  onReorderPhotos: (orderedIds: string[]) => void;
  onDeletePhoto: (id: string) => void;
}) {
  const t = useTranslations("settings.marketplace");
  const [inputKey, setInputKey] = useState(0);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const ids = useMemo(() => photos.map((photo) => photo.id), [photos]);

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = photos.findIndex((photo) => photo.id === active.id);
    const newIndex = photos.findIndex((photo) => photo.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    onReorderPhotos(arrayMove(photos, oldIndex, newIndex).map((photo) => photo.id));
  };

  const move = (id: string, direction: -1 | 1) => {
    const index = photos.findIndex((photo) => photo.id === id);
    const next = index + direction;
    if (index < 0 || next < 0 || next >= photos.length) return;
    onReorderPhotos(arrayMove(photos, index, next).map((photo) => photo.id));
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold">{t("photos.title")}</h3>
          <p className="text-muted-foreground text-sm">{t("photos.hint")}</p>
        </div>
        <label className="inline-flex">
          <input
            key={inputKey}
            type="file"
            accept={accept}
            multiple
            className="hidden"
            onChange={(event) => {
              const files = event.target.files;
              if (files && files.length > 0) onUpload(files);
              setInputKey((value) => value + 1);
            }}
          />
          <Button type="button" variant="outline" size="sm" disabled={uploading} asChild>
            <span className="cursor-pointer">
              {uploading ? (
                <RiLoader4Line size={16} className="mr-1.5 animate-spin" />
              ) : (
                <RiImageAddLine size={16} className="mr-1.5" />
              )}
              {uploading ? t("photos.uploading") : t("photos.upload")}
            </span>
          </Button>
        </label>
      </div>

      {photos.length === 0 ? (
        <p className="text-muted-foreground text-sm">{t("photos.empty")}</p>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={ids} strategy={verticalListSortingStrategy}>
            <ul className="space-y-2">
              {photos.map((photo, index) => (
                <SortablePhoto
                  key={photo.id}
                  photo={photo}
                  index={index}
                  count={photos.length}
                  disabled={uploading}
                  onMove={move}
                  onDelete={onDeletePhoto}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}
    </section>
  );
}

function SortablePhoto({
  photo,
  index,
  count,
  disabled,
  onMove,
  onDelete,
}: {
  photo: MarketplacePhoto;
  index: number;
  count: number;
  disabled: boolean;
  onMove: (id: string, direction: -1 | 1) => void;
  onDelete: (id: string) => void;
}) {
  const t = useTranslations("settings.marketplace");
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: photo.id,
    disabled,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={cn(
        "bg-card flex items-center gap-3 rounded-lg border p-2",
        isDragging && "opacity-70",
      )}
    >
      <button
        type="button"
        className="text-muted-foreground cursor-grab px-1 active:cursor-grabbing"
        aria-label={t("photos.drag")}
        {...attributes}
        {...listeners}
      >
        <RiDraggable size={18} />
      </button>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photo.url}
        alt=""
        className="bg-muted size-16 rounded-md object-cover"
      />
      <div className="min-w-0 flex-1">
        {index === 0 && (
          <span className="bg-primary text-primary-foreground rounded-full px-2 py-0.5 text-xs">
            {t("photos.cover")}
          </span>
        )}
      </div>
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={disabled || index === 0}
          aria-label={t("photos.moveUp")}
          onClick={() => onMove(photo.id, -1)}
        >
          <RiArrowUpLine size={16} />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={disabled || index === count - 1}
          aria-label={t("photos.moveDown")}
          onClick={() => onMove(photo.id, 1)}
        >
          <RiArrowDownLine size={16} />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={disabled}
          aria-label={t("photos.remove")}
          onClick={() => onDelete(photo.id)}
        >
          <RiCloseLine size={16} />
        </Button>
      </div>
    </li>
  );
}
