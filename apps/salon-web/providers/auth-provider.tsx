"use client";

import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Session, User } from "@supabase/supabase-js";
import {
  assembleMembershipSnapshot,
  EMPTY_MEMBERSHIP_SNAPSHOT,
  fetchCompanyMembershipsWithToken,
  loadMembershipSnapshot,
  scopeSnapshotToCompany,
  snapshotHasAnyPermission,
  snapshotHasCompanyPermission,
  snapshotHasPermission,
  type MembershipSnapshot,
  type MembershipSupabase,
  type PermissionKey,
} from "@/lib/auth";
import { rememberSelectedCompany } from "@/lib/auth/select-company";
import {
  asLocationClient,
  companyIdForLocation,
  fetchAccessibleLocations,
  fetchCompanyLocations,
  fetchLocationsById,
  locationPickerRows,
  mergeAccessibleLocationIds,
  primaryOrSoleLocationId,
  resolvePersistedLocationId,
  settleLocationSelection,
  shouldShowLocationSwitcher,
  writePersistedLocationId,
  type LocationRecord,
} from "@/lib/location";
import { PAGE_FETCH_TIMEOUT_MS, withTimeout } from "@/lib/async/fail-closed";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
  companyId: string | null;
  companyIds: string[];
  locationId: string | null;
  locationIds: string[];
  locations: LocationRecord[];
  switcherLocations: LocationRecord[];
  companyNames: Record<string, string>;
  currentLocation: LocationRecord | null;
  showLocationSwitcher: boolean;
  permissionKeys: PermissionKey[];
  membershipReady: boolean;
  membershipError: boolean;
  /** True after location rows have been fetched (or failed). Null selection after this is final. */
  locationsReady: boolean;
  hasPermission: (perm: PermissionKey, locationId?: string | null) => boolean;
  hasCompanyPermission: (perm: PermissionKey, companyId?: string | null) => boolean;
  hasAnyPermission: (perms: readonly PermissionKey[]) => boolean;
  setLocationId: (locationId: string) => void;
  refreshMemberships: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

function asMembershipClient() {
  return createClient() as unknown as MembershipSupabase;
}

async function loadSwitcherCatalog(
  snapshot: MembershipSnapshot,
  known: LocationRecord[],
): Promise<{ locations: LocationRecord[]; companyNames: Record<string, string> }> {
  const locClient = asLocationClient(createClient());
  const leaderCompanyIds = snapshot.companyMemberships.map((row) => row.company_id);
  let rows = known;
  try {
    const accessible = await fetchAccessibleLocations(locClient);
    const byId = new Map(known.map((row) => [row.id, row]));
    for (const row of accessible) byId.set(row.id, row);
    if (accessible.length === 0 && leaderCompanyIds.length > 0) {
      const lists = await Promise.all(
        leaderCompanyIds.map((companyId) =>
          fetchCompanyLocations(locClient, companyId).catch(() => [] as LocationRecord[]),
        ),
      );
      for (const list of lists) {
        for (const row of list) byId.set(row.id, row);
      }
    }
    rows = [...byId.values()];
  } catch (error) {
    console.warn("accessible locations failed", error);
  }

  const locations = locationPickerRows({
    locations: rows,
    leaderCompanyIds,
    memberLocationIds: snapshot.locationMemberships
      .filter((row) => row.is_active)
      .map((row) => row.location_id),
  });
  const companyIds = [...new Set(locations.map((row) => row.company_id))];
  if (companyIds.length === 0) return { locations, companyNames: {} };

  const { data } = await createClient()
    .from("company")
    .select("id, name")
    .in("id", companyIds);
  const companyNames: Record<string, string> = {};
  for (const row of data ?? []) {
    companyNames[row.id] = row.name ?? "";
  }
  return { locations, companyNames };
}

export function AuthProvider({
  children,
  initialCompanyId = null,
}: {
  children: React.ReactNode;
  initialCompanyId?: string | null;
}) {
  const [user, setUser] = useState<User | null>(null);
  const [membership, setMembership] = useState<MembershipSnapshot>(
    EMPTY_MEMBERSHIP_SNAPSHOT,
  );
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const [locations, setLocations] = useState<LocationRecord[]>([]);
  const [switcherLocations, setSwitcherLocations] = useState<LocationRecord[]>([]);
  const [companyNames, setCompanyNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [membershipReady, setMembershipReady] = useState(false);
  const [membershipError, setMembershipError] = useState(false);
  const [locationsReady, setLocationsReady] = useState(false);
  const router = useRouter();
  const selectedCompanyRef = useRef(initialCompanyId);
  const fullSnapshotRef = useRef(EMPTY_MEMBERSHIP_SNAPSHOT);

  useEffect(() => {
    selectedCompanyRef.current = initialCompanyId;
  }, [initialCompanyId]);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    const applySignedOut = () => {
      setUser(null);
      setMembership(EMPTY_MEMBERSHIP_SNAPSHOT);
      setSelectedLocationId(null);
      setLocations([]);
      setSwitcherLocations([]);
      setCompanyNames({});
      fullSnapshotRef.current = EMPTY_MEMBERSHIP_SNAPSHOT;
      setMembershipReady(false);
      setMembershipError(false);
      setLocationsReady(false);
      setLoading(false);
    };

    const applySnapshot = (
      snapshot: MembershipSnapshot,
      userId: string,
      extras?: { primaryId?: string | null; accessibleIds?: string[] },
    ) => {
      fullSnapshotRef.current = snapshot;
      const scoped = scopeSnapshotToCompany(snapshot, selectedCompanyRef.current);
      const companyChosen = Boolean(
        selectedCompanyRef.current && snapshot.companyIds.includes(selectedCompanyRef.current),
      );
      const allowedLocations = new Set(scoped.locationIds);
      const accessibleIds = (extras?.accessibleIds ?? scoped.locationIds).filter(
        (id) => !companyChosen || snapshot.locationCompanies.length === 0 || allowedLocations.has(id),
      );
      const nextLocationId = settleLocationSelection({
        userId,
        accessibleIds,
        persistedId: resolvePersistedLocationId(userId, accessibleIds),
        fallbackId: scoped.locationId,
        primaryId: extras?.primaryId ?? null,
      });
      const nextSnapshot =
        accessibleIds.length > 0 &&
        (accessibleIds.length !== scoped.locationIds.length ||
          accessibleIds.some((id) => !scoped.locationIds.includes(id)))
          ? {
              ...scoped,
              locationIds: accessibleIds,
              locationId: nextLocationId ?? scoped.locationId,
            }
          : scoped;
      // The lock-free company fetch resolves before role permissions.
      // Replacing a full snapshot with that empty one hides the nav, then
      // the real snapshot puts it back and the sidebar calendar drops.
      setMembership((current) =>
        nextSnapshot.permissionKeys.length === 0 && current.permissionKeys.length > 0
          ? {
              ...nextSnapshot,
              permissionKeys: current.permissionKeys,
              rolePermissions: current.rolePermissions,
            }
          : nextSnapshot,
      );
      setMembershipError(false);
      setSelectedLocationId(nextLocationId);
      setMembershipReady(true);
      return nextLocationId;
    };

    const hydrateLocationContext = async (
      snapshot: MembershipSnapshot,
      userId: string,
    ) => {
      try {
        const locClient = asLocationClient(createClient());
        const [membershipRows, companyRows] = await Promise.all([
          snapshot.locationIds.length > 0
            ? withTimeout(
                fetchLocationsById(locClient, snapshot.locationIds),
                PAGE_FETCH_TIMEOUT_MS,
                "locations by membership",
              ).catch((error) => {
                console.warn("locations by membership failed", error);
                return [] as LocationRecord[];
              })
            : Promise.resolve([] as LocationRecord[]),
          snapshot.companyId
            ? withTimeout(
                fetchCompanyLocations(locClient, snapshot.companyId),
                PAGE_FETCH_TIMEOUT_MS,
                "company locations",
              ).catch((error) => {
                console.warn("company locations failed", error);
                return [] as LocationRecord[];
              })
            : Promise.resolve([] as LocationRecord[]),
        ]);
        if (cancelled) return;

        const byId = new Map<string, LocationRecord>();
        for (const row of [...membershipRows, ...companyRows]) {
          byId.set(row.id, row);
        }
        const locationRows = [...byId.values()];
        const accessibleIds = mergeAccessibleLocationIds(
          snapshot.locationIds,
          locationRows,
        );
        const catalog = await loadSwitcherCatalog(snapshot, locationRows);
        if (cancelled) return;
        const merged = new Map(locationRows.map((row) => [row.id, row]));
        for (const row of catalog.locations) merged.set(row.id, row);
        setLocations([...merged.values()]);
        setSwitcherLocations(catalog.locations);
        setCompanyNames(catalog.companyNames);
        applySnapshot(snapshot, userId, {
          primaryId: primaryOrSoleLocationId(locationRows),
          accessibleIds,
        });
      } catch (error) {
        console.warn("Location context failed; keeping membership snapshot", error);
        if (!cancelled) applySnapshot(snapshot, userId);
      } finally {
        if (!cancelled) setLocationsReady(true);
      }
    };

    let hydrateInFlightFor: string | null = null;
    let hydrateCompletedFor: string | null = null;

    const hydrate = async (session: Session | null) => {
      const nextUser = session?.user ?? null;
      if (!nextUser) {
        hydrateInFlightFor = null;
        hydrateCompletedFor = null;
        if (!cancelled) applySignedOut();
        return;
      }

      // Paint the shell as soon as the session user is known.
      // Safari/WebKit can stall getUser() on Web Locks; membership
      // must not keep ProtectedRoute on skeletons.
      if (!cancelled) {
        setUser(nextUser);
        setLoading(false);
      }

      if (
        hydrateCompletedFor === nextUser.id ||
        hydrateInFlightFor === nextUser.id
      ) {
        return;
      }
      hydrateInFlightFor = nextUser.id;

      let applied: MembershipSnapshot | null = null;

      // Lock-free company fetch using the JWT we already have.
      // supabase.from() re-enters navigator.locks and can hang forever
      // on Safari 16 after getSession / onAuthStateChange.
      if (session?.access_token) {
        try {
          const companyRows = await fetchCompanyMembershipsWithToken(session);
          if (cancelled) return;
          if (companyRows.length > 0) {
            applied = assembleMembershipSnapshot({
              companyMemberships: companyRows,
              locationMemberships: [],
              locationCompanies: [],
            });
            applySnapshot(applied, nextUser.id);
            void hydrateLocationContext(applied, nextUser.id);
          }
        } catch (error) {
          console.warn("Lock-free company_membership failed", error);
        }
      }

      try {
        const snapshot = await withTimeout(
          loadMembershipSnapshot(asMembershipClient(), nextUser.id),
          PAGE_FETCH_TIMEOUT_MS,
          "membership snapshot",
        );
        if (cancelled) return;
        applied = snapshot;
        applySnapshot(snapshot, nextUser.id);
        void hydrateLocationContext(snapshot, nextUser.id);
        hydrateCompletedFor = nextUser.id;
      } catch (error) {
        console.error("Failed to load company memberships:", error);
        if (cancelled) return;
        if (applied?.companyId) {
          void hydrateLocationContext(applied, nextUser.id);
          hydrateCompletedFor = nextUser.id;
        } else {
          setMembershipError(true);
          setMembershipReady(true);
          setLocationsReady(true);
          hydrateInFlightFor = null;
        }
      }
    };

    // Do not clear this from a hanging getUser().finally — WebKit can
    // hold navigator.locks so neither getUser nor that finally runs.
    const failsafe = window.setTimeout(() => {
      if (!cancelled) setLoading(false);
    }, 4000);

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      // Defer every event, including INITIAL_SESSION. Awaiting supabase
      // here deadlocks GoTrue. Do not call getUser() on this tick —
      // on WebKit it shares navigator.locks and can stall forever
      // (Chrome recovered in #22; Safari still hung).
      setTimeout(() => {
        if (!cancelled) void hydrate(session);
      }, 0);
    });

    // After the lock is released: local JWT only, no /user round trip.
    // Covers WebKit builds that drop INITIAL_SESSION.
    window.setTimeout(() => {
      if (cancelled) return;
      void supabase.auth
        .getSession()
        .then(({ data: { session } }) => {
          if (!cancelled) void hydrate(session);
        })
        .catch((error) => {
          console.warn("getSession failed; waiting for auth events", error);
        });
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(failsafe);
      subscription.unsubscribe();
    };
  }, []);

  const signOut = useCallback(async () => {
    await createClient().auth.signOut();
  }, []);

  const refreshMemberships = useCallback(async () => {
    if (!user) return;
    const snapshot = await loadMembershipSnapshot(asMembershipClient(), user.id);
    const locClient = asLocationClient(createClient());
    const [membershipRows, companyRows] = await Promise.all([
      snapshot.locationIds.length > 0
        ? fetchLocationsById(locClient, snapshot.locationIds)
        : Promise.resolve([] as LocationRecord[]),
      snapshot.companyId
        ? fetchCompanyLocations(locClient, snapshot.companyId)
        : Promise.resolve([] as LocationRecord[]),
    ]);
    const byId = new Map<string, LocationRecord>();
    for (const row of [...membershipRows, ...companyRows]) {
      byId.set(row.id, row);
    }
    const locationRows = [...byId.values()];
    const accessibleIds = mergeAccessibleLocationIds(
      snapshot.locationIds,
      locationRows,
    );
    const nextLocationId = settleLocationSelection({
      userId: user.id,
      accessibleIds,
      persistedId:
        selectedLocationId && accessibleIds.includes(selectedLocationId)
          ? selectedLocationId
          : resolvePersistedLocationId(user.id, accessibleIds),
      fallbackId: snapshot.locationId,
      primaryId: primaryOrSoleLocationId(locationRows),
    });
    setMembership({
      ...snapshot,
      locationIds: accessibleIds.length > 0 ? accessibleIds : snapshot.locationIds,
      locationId: nextLocationId ?? snapshot.locationId,
    });
    const catalog = await loadSwitcherCatalog(snapshot, locationRows);
    const merged = new Map(locationRows.map((row) => [row.id, row]));
    for (const row of catalog.locations) merged.set(row.id, row);
    setLocations([...merged.values()]);
    setSwitcherLocations(catalog.locations);
    setCompanyNames(catalog.companyNames);
    setSelectedLocationId(nextLocationId);
    setMembershipReady(true);
    setLocationsReady(true);
  }, [selectedLocationId, user]);

  const setLocationId = useCallback(
    (nextLocationId: string) => {
      const picked =
        switcherLocations.find((row) => row.id === nextLocationId) ??
        locations.find((row) => row.id === nextLocationId);
      const allowed = new Set([
        ...membership.locationIds,
        ...locations.map((row) => row.id),
        ...switcherLocations.map((row) => row.id),
      ]);
      if (!picked || !allowed.has(nextLocationId)) return;
      setSelectedLocationId(nextLocationId);
      if (user) {
        writePersistedLocationId(user.id, nextLocationId);
      }
      if (picked.company_id === selectedCompanyRef.current) return;

      selectedCompanyRef.current = picked.company_id;
      setMembership((current) => {
        const scoped = scopeSnapshotToCompany(fullSnapshotRef.current, picked.company_id);
        const next = scoped.locationIds.includes(nextLocationId)
          ? { ...scoped, locationId: nextLocationId }
          : scoped;
        if (next.permissionKeys.length === 0 && current.permissionKeys.length > 0) {
          return {
            ...next,
            permissionKeys: current.permissionKeys,
            rolePermissions: current.rolePermissions,
          };
        }
        return next;
      });
      void rememberSelectedCompany(picked.company_id).then(() => {
        router.refresh();
      });
    },
    [locations, membership.locationIds, router, switcherLocations, user],
  );

  const locationId = selectedLocationId;
  const currentLocation = useMemo(
    () => locations.find((row) => row.id === locationId) ?? null,
    [locationId, locations],
  );
  const companyId = companyIdForLocation(
    locations,
    locationId,
    membership.companyId,
  );
  const showLocationSwitcher = shouldShowLocationSwitcher({
    accessibleCount: switcherLocations.length,
  });

  const hasPermission = useCallback(
    (perm: PermissionKey, scopedLocationId?: string | null) =>
      snapshotHasPermission(membership, perm, scopedLocationId ?? locationId),
    [locationId, membership],
  );

  const hasCompanyPermission = useCallback(
    (perm: PermissionKey, companyId?: string | null) =>
      snapshotHasCompanyPermission(membership, perm, companyId),
    [membership],
  );

  const hasAnyPermission = useCallback(
    (perms: readonly PermissionKey[]) => snapshotHasAnyPermission(membership, perms),
    [membership],
  );

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      loading,
      signOut,
      companyId,
      companyIds: membership.companyIds,
      locationId,
      locationIds: membership.locationIds,
      locations,
      switcherLocations,
      companyNames,
      currentLocation,
      showLocationSwitcher,
      permissionKeys: membership.permissionKeys,
      membershipReady,
      membershipError,
      locationsReady,
      hasPermission,
      hasCompanyPermission,
      hasAnyPermission,
      setLocationId,
      refreshMemberships,
    }),
    [
      user,
      loading,
      membership,
      membershipReady,
      membershipError,
      locationsReady,
      companyId,
      locationId,
      locations,
      switcherLocations,
      companyNames,
      currentLocation,
      showLocationSwitcher,
      signOut,
      hasPermission,
      hasCompanyPermission,
      hasAnyPermission,
      setLocationId,
      refreshMemberships,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
