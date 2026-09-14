export class RepositoryError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "RepositoryError";
  }
}

export class UnauthenticatedError extends Error {
  constructor(message = "Missing or invalid authentication") {
    super(message);
    this.name = "UnauthenticatedError";
  }
}

export class ForbiddenError extends Error {
  constructor(message = "Not authorized to access this resource") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export class ChargesNotEnabledError extends Error {
  readonly code = "CHARGES_NOT_ENABLED";

    constructor(message = "Company payment account cannot take card payments yet") {
    super(message);
    this.name = "ChargesNotEnabledError";
  }
}

export type BookingLocationErrorCode = "LOCATION_REQUIRED" | "INVALID_LOCATION";

export class BookingLocationError extends Error {
  constructor(
    public readonly code: BookingLocationErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "BookingLocationError";
  }
}
