export { isMissingSchemaError } from "./errors";
export { asLocationClient, locationClient } from "./client";
export type { LocationQueryError, LocationSupabase } from "./client";
export {
  companyIdForLocation,
  mergeAccessibleLocationIds,
  pickSelectedLocationId,
  primaryOrSoleLocationId,
  shouldShowLocationSwitcher,
  shouldWaitForLocationPick,
  withLocationId,
} from "./resolve";
export {
  buildLocationMembershipInsert,
  pickLocationStaffRoleId,
  resolveWriteLocationId,
  withOptionalLocationFields,
} from "./staff-scope";
export {
  clearPersistedLocationId,
  locationStorageKey,
  readPersistedLocationId,
  resolvePersistedLocationId,
  settleLocationSelection,
  writePersistedLocationId,
} from "./storage";
export {
  buildLocationServiceCopies,
  copyPrimaryLocationServices,
  createLocation,
  fetchClientIdsForCompany,
  fetchClientIdsForLocation,
  fetchCompanyLocations,
  fetchLocationsById,
  fetchServiceIdsForLocation,
  offeredServiceIdsForLocation,
  fetchStaffIdsForLocation,
  linkClientToLocation,
  linkServiceToLocation,
  linkStaffToLocation,
  resolveLocationStaffRoleId,
  setLocationActive,
  updateLocation,
} from "./queries";
export { DEFAULT_LOCATION_TIMEZONE, LOCATION_SELECT } from "./types";
export type { LocationRecord, LocationWrite } from "./types";
