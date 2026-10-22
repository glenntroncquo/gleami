const KEY = "gleami.pendingLike";

export function rememberLike(locationId: string): void {
  sessionStorage.setItem(KEY, locationId);
}

export function takePendingLike(): string | null {
  const id = sessionStorage.getItem(KEY);
  if (id) sessionStorage.removeItem(KEY);
  return id;
}

export function clearPendingLike(): void {
  sessionStorage.removeItem(KEY);
}
