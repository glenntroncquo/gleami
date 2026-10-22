const KEY = "gleami.savedContact";

export type SavedContact = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
};

export function readSavedContact(): SavedContact | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SavedContact>;
    if (!parsed || typeof parsed !== "object") return null;
    return {
      firstName: typeof parsed.firstName === "string" ? parsed.firstName : "",
      lastName: typeof parsed.lastName === "string" ? parsed.lastName : "",
      email: typeof parsed.email === "string" ? parsed.email : "",
      phone: typeof parsed.phone === "string" ? parsed.phone : "",
    };
  } catch {
    return null;
  }
}

export function writeSavedContact(contact: SavedContact | null): void {
  try {
    if (!contact) {
      localStorage.removeItem(KEY);
      return;
    }
    localStorage.setItem(KEY, JSON.stringify(contact));
  } catch {
    // Private mode can reject storage. The booking still continues.
  }
}
