"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { Skeleton } from "@/components/ui/skeleton";
import { useCompanyId, useLocationId } from "@/lib/company-util";
import { asLocationClient } from "@/lib/location";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/providers/auth-provider";
import {
  PAGE_FETCH_TIMEOUT_MS,
  startFailClosedLoad,
  withTimeout,
} from "@/lib/async/fail-closed";
import {
  addServiceCategory,
  deleteMarketplacePhoto,
  loadLocationServiceIds,
  loadMarketplaceCategories,
  loadMarketplaceLocation,
  loadMarketplacePhotos,
  loadMarketplaceServices,
  persistPhotoOrder,
  removeServiceCategory,
  updateListing,
  updateMarketplaceProfile,
  updateServiceVisibility,
  uploadMarketplacePhoto,
  type MarketplaceCategory,
  type MarketplaceClient,
  type MarketplacePhoto,
  type MarketplaceService,
} from "@/lib/marketplace/api";
import { buildPublishChecklist } from "@/lib/marketplace/checklist";
import { geocodeMarketplaceAddress } from "@/lib/marketplace/geocode-action";
import { formatCoord, parseGeoPoint, parseLatLngInput, toEwkt } from "@/lib/marketplace/geo";
import { DESCRIPTION_LIMIT } from "@/lib/marketplace/media";
import { normalizeSlug, slugFromName, suggestAlternativeSlug } from "@/lib/marketplace/slug";
import { MarketplacePanel } from "@/components/marketplace/marketplace-panel";

function permissionDenied(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  const message = (error.message ?? "").toLowerCase();
  return error.code === "42501" || message.includes("permission") || message.includes("row-level");
}

export function MarketplaceSettings() {
  const t = useTranslations("settings.marketplace");
  const companyId = useCompanyId();
  const locationId = useLocationId();
  const { hasCompanyPermission, membershipReady, showLocationSwitcher } = useAuth();
  const supabase = useMemo(() => asLocationClient(createClient()) as MarketplaceClient, []);

  const canManage =
    hasCompanyPermission("locations:manage") || hasCompanyPermission("settings:manage");
  const canEditCategories = hasCompanyPermission("catalog:manage");

  const [loading, setLoading] = useState(true);
  const [locationName, setLocationName] = useState("");
  const [ownerCompanyId, setOwnerCompanyId] = useState<string | null>(null);
  const [country, setCountry] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(true);
  const [listed, setListed] = useState(false);
  const [slug, setSlug] = useState("");
  const [slugSuggestion, setSlugSuggestion] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [street, setStreet] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [city, setCity] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [coordinatesSaved, setCoordinatesSaved] = useState(false);
  const [services, setServices] = useState<MarketplaceService[]>([]);
  const [categories, setCategories] = useState<MarketplaceCategory[]>([]);
  const [photos, setPhotos] = useState<MarketplacePhoto[]>([]);
  const [savingListing, setSavingListing] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [findingCoordinates, setFindingCoordinates] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [busyServiceId, setBusyServiceId] = useState<string | null>(null);

  useEffect(() => {
    if (!locationId || !canManage) {
      setLoading(false);
      return;
    }
    setLoading(true);
    return startFailClosedLoad(
      setLoading,
      async (isCancelled) => {
        let loaded: Awaited<ReturnType<typeof loadAll>>;
        try {
          loaded = await withTimeout(
            loadAll(supabase, locationId),
            PAGE_FETCH_TIMEOUT_MS,
            "marketplace settings",
          );
        } catch {
          if (!isCancelled()) toast.error(t("loadFailed"));
          return;
        }
        if (isCancelled()) return;
        if (!loaded.location) {
          toast.error(t("loadFailed"));
          return;
        }
        applyLocation(loaded.location);
        setServices(loaded.services);
        setCategories(loaded.categories);
        setPhotos(loaded.photos);
        setSlugSuggestion(null);
      },
      { label: "marketplace settings" },
    );
  }, [locationId, canManage, supabase, t]);

  function applyLocation(location: NonNullable<Awaited<ReturnType<typeof loadMarketplaceLocation>>["data"]>) {
    const point = parseGeoPoint(location.geo);
    setLocationName(location.name);
    setOwnerCompanyId(location.companyId);
    setCountry(location.country);
    setIsActive(location.isActive);
    setListed(location.isListed);
    setSlug(location.slug ?? slugFromName(location.name));
    setDescription(location.description.slice(0, DESCRIPTION_LIMIT));
    setStreet(location.street ?? "");
    setPostalCode(location.postalCode ?? "");
    setCity(location.city ?? "");
    setLatitude(point ? formatCoord(point.lat) : "");
    setLongitude(point ? formatCoord(point.lng) : "");
    setCoordinatesSaved(point !== null || (location.geo != null && location.geo !== ""));
  }

  const checklist = buildPublishChecklist({
    slug,
    street,
    postalCode,
    city,
    hasCoordinates: coordinatesSaved,
    visibleCategorisedServiceCount: services.filter(
      (service) => service.visible && service.active && service.categoryIds.length > 0,
    ).length,
    photoCount: photos.length,
  });

  const reportError = (error: { code?: string; message?: string } | null, fallback: string) => {
    if (permissionDenied(error)) {
      toast.error(t("permissionDenied"));
      return;
    }
    toast.error(fallback);
  };

  const saveListing = async (nextListed: boolean) => {
    if (!locationId) return;
    const nextSlug = normalizeSlug(slug);
    if (nextListed && !nextSlug) {
      toast.error(t("publish.slugRequired"));
      return;
    }
    setSlug(nextSlug);
    setSavingListing(true);
    const result = await updateListing(supabase, locationId, {
      isListed: nextListed,
      slug: nextSlug || null,
    });
    setSavingListing(false);
    if (result.taken) {
      const suggestion = suggestAlternativeSlug(nextSlug || slugFromName(locationName));
      setSlugSuggestion(suggestion);
      toast.error(t("publish.slugTaken"));
      return;
    }
    if (result.error) {
      reportError(result.error, t("saveFailed"));
      return;
    }
    setListed(nextListed);
    setSlugSuggestion(null);
    toast.success(t("saved"));
  };

  const findCoordinates = async () => {
    const targetCompany = ownerCompanyId || companyId;
    if (!targetCompany) return;
    if (!street.trim() || !postalCode.trim() || !city.trim()) {
      toast.error(t("profile.geocodeNeedsAddress"));
      return;
    }
    const query = [street, postalCode, city, country || "Belgium"]
      .map((part) => part.trim())
      .filter(Boolean)
      .join(", ");
    setFindingCoordinates(true);
    const result = await geocodeMarketplaceAddress({ companyId: targetCompany, query });
    setFindingCoordinates(false);
    if (!result.ok) {
      if (result.reason === "empty") toast.error(t("profile.geocodeEmpty"));
      else if (result.reason === "rate") toast.error(t("profile.geocodeRate"));
      else if (result.reason === "unauthorized") toast.error(t("permissionDenied"));
      else toast.error(t("profile.geocodeFailed"));
      return;
    }
    setLatitude(formatCoord(result.lat));
    setLongitude(formatCoord(result.lng));
    toast.success(t("profile.geocodeFound"));
  };

  const saveProfile = async () => {
    if (!locationId) return;
    const point = parseLatLngInput(latitude, longitude);
    const latFilled = latitude.trim().length > 0;
    const lngFilled = longitude.trim().length > 0;
    if ((latFilled || lngFilled) && !point) {
      toast.error(t("profile.invalidCoordinates"));
      return;
    }
    setSavingProfile(true);
    const result = await updateMarketplaceProfile(supabase, locationId, {
      description: description.trim() ? description.trim() : null,
      street: street.trim() || null,
      postalCode: postalCode.trim() || null,
      city: city.trim() || null,
      geoEwkt: point ? toEwkt(point.lat, point.lng) : null,
    });
    setSavingProfile(false);
    if (result.error) {
      reportError(result.error, t("saveFailed"));
      return;
    }
    if (point) setCoordinatesSaved(true);
    toast.success(t("saved"));
  };

  const toggleService = async (serviceId: string, visible: boolean) => {
    const previous = services;
    setServices((rows) => rows.map((row) => (row.id === serviceId ? { ...row, visible } : row)));
    setBusyServiceId(serviceId);
    const result = await updateServiceVisibility(supabase, serviceId, visible);
    setBusyServiceId(null);
    if (result.error) {
      setServices(previous);
      reportError(result.error, t("saveFailed"));
    }
  };

  const toggleCategory = async (serviceId: string, categoryId: string, checked: boolean) => {
    if (!canEditCategories) return;
    const previous = services;
    setServices((rows) =>
      rows.map((row) => {
        if (row.id !== serviceId) return row;
        const categoryIds = checked
          ? [...new Set([...row.categoryIds, categoryId])]
          : row.categoryIds.filter((id) => id !== categoryId);
        return { ...row, categoryIds };
      }),
    );
    setBusyServiceId(serviceId);
    const result = checked
      ? await addServiceCategory(supabase, serviceId, categoryId)
      : await removeServiceCategory(supabase, serviceId, categoryId);
    setBusyServiceId(null);
    if (result.error) {
      setServices(previous);
      reportError(result.error, t("saveFailed"));
    }
  };

  const upload = async (files: FileList) => {
    const targetCompany = ownerCompanyId || companyId;
    if (!locationId || !targetCompany) return;
    setUploading(true);
    let nextOrder = photos.reduce((max, photo) => Math.max(max, photo.sortOrder), -1) + 1;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
    for (const file of Array.from(files)) {
      const result = await uploadMarketplacePhoto(supabase, {
        companyId: targetCompany,
        locationId,
        file,
        sortOrder: nextOrder,
      });
      if (result.reason === "type") {
        toast.error(t("photos.typeInvalid", { name: file.name }));
        continue;
      }
      if (result.reason === "size") {
        toast.error(t("photos.tooLarge", { name: file.name }));
        continue;
      }
      if (result.error || !result.data) {
        reportError(result.error, t("photos.uploadFailed"));
        continue;
      }
      setPhotos((current) => [
        ...current,
        {
          id: result.data!.id,
          storagePath: result.data!.storagePath,
          sortOrder: nextOrder,
          url: `${supabaseUrl.replace(/\/$/, "")}/storage/v1/object/public/marketplace/${result.data!.storagePath}`,
        },
      ]);
      nextOrder += 1;
    }
    setUploading(false);
  };

  const reorderPhotos = async (orderedIds: string[]) => {
    const previous = photos;
    setPhotos(
      orderedIds.map((id, index) => {
        const photo = previous.find((row) => row.id === id);
        return { ...(photo as MarketplacePhoto), sortOrder: index };
      }),
    );
    const result = await persistPhotoOrder(supabase, orderedIds);
    if (result.error) {
      setPhotos(previous);
      reportError(result.error, t("photos.reorderFailed"));
    }
  };

  const deletePhoto = async (id: string) => {
    const photo = photos.find((row) => row.id === id);
    if (!photo) return;
    const previous = photos;
    setPhotos((current) => current.filter((row) => row.id !== id).map((row, index) => ({ ...row, sortOrder: index })));
    const result = await deleteMarketplacePhoto(supabase, photo);
    if (result.error) {
      setPhotos(previous);
      reportError(result.error, t("photos.deleteFailed"));
      return;
    }
    const remaining = previous.filter((row) => row.id !== id).map((row) => row.id);
    if (remaining.length > 0) {
      const order = await persistPhotoOrder(supabase, remaining);
      if (order.error) toast.error(t("photos.reorderFailed"));
    }
    if (result.storageError) toast.error(t("photos.storageDeleteFailed"));
  };

  if (membershipReady && !canManage) return null;
  if (!locationId) {
    return <p className="text-muted-foreground text-sm">{t("noLocation")}</p>;
  }
  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  return (
    <MarketplacePanel
      locationName={locationName}
      showSwitcherHint={showLocationSwitcher}
      isActive={isActive}
      listed={listed}
      slug={slug}
      slugSuggestion={slugSuggestion}
      companyId={ownerCompanyId || companyId || ""}
      description={description}
      street={street}
      postalCode={postalCode}
      city={city}
      latitude={latitude}
      longitude={longitude}
      coordinatesSaved={coordinatesSaved}
      checklist={checklist}
      services={services}
      categories={categories}
      photos={photos}
      canEditCategories={canEditCategories}
      savingListing={savingListing}
      savingProfile={savingProfile}
      findingCoordinates={findingCoordinates}
      uploading={uploading}
      busyServiceId={busyServiceId}
      onListedChange={(next) => void saveListing(next)}
      onSlugChange={(value) => {
        setSlug(value);
        setSlugSuggestion(null);
      }}
      onSlugBlur={() => setSlug((current) => normalizeSlug(current))}
      onSaveSlug={() => void saveListing(listed)}
      onApplySuggestion={() => {
        if (!slugSuggestion) return;
        setSlug(slugSuggestion);
        setSlugSuggestion(null);
      }}
      onCopyPath={(path) => {
        void navigator.clipboard.writeText(path);
        toast.success(t("publish.copied"));
      }}
      onDescriptionChange={(value) => setDescription(value.slice(0, DESCRIPTION_LIMIT))}
      onStreetChange={setStreet}
      onPostalCodeChange={setPostalCode}
      onCityChange={setCity}
      onLatitudeChange={setLatitude}
      onLongitudeChange={setLongitude}
      onFindCoordinates={() => void findCoordinates()}
      onSaveProfile={() => void saveProfile()}
      onToggleService={(serviceId, visible) => void toggleService(serviceId, visible)}
      onToggleCategory={(serviceId, categoryId, checked) =>
        void toggleCategory(serviceId, categoryId, checked)
      }
      onUpload={(files) => void upload(files)}
      onReorderPhotos={(ids) => void reorderPhotos(ids)}
      onDeletePhoto={(id) => void deletePhoto(id)}
    />
  );
}

async function loadAll(supabase: MarketplaceClient, locationId: string) {
  const location = await loadMarketplaceLocation(supabase, locationId);
  if (location.error || !location.data) {
    return { location: null, services: [], categories: [], photos: [] };
  }
  const serviceIds = await loadLocationServiceIds(supabase, locationId);
  const [services, categories, photos] = await Promise.all([
    serviceIds.error
      ? Promise.resolve({ data: [] as MarketplaceService[], error: serviceIds.error })
      : loadMarketplaceServices(supabase, serviceIds.data),
    loadMarketplaceCategories(supabase),
    loadMarketplacePhotos(
      supabase,
      locationId,
      process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    ),
  ]);
  if (serviceIds.error || services.error || categories.error || photos.error) {
    return { location: null, services: [], categories: [], photos: [] };
  }
  return {
    location: location.data,
    services: services.data,
    categories: categories.data,
    photos: photos.data,
  };
}
