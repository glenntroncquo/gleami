import type { Breadcrumb, ErrorEvent } from '@sentry/react-native';

const REDACTED = '[Filtered]';

const PII_KEYS = new Set([
  'email',
  'phone',
  'phonenumber',
  'phone_number',
  'mobile',
  'telephone',
  'firstname',
  'first_name',
  'lastname',
  'last_name',
  'fullname',
  'full_name',
  'clientname',
  'client_name',
  'displayname',
  'display_name',
  'notes',
  'note',
  'password',
  'authorization',
  'accesstoken',
  'access_token',
  'refreshtoken',
  'refresh_token',
  'apikey',
  'api_key',
  'cookie',
  'set_cookie',
]);

const ALLOWED_ID_KEYS = new Set(['id', 'user_id', 'staff_id', 'company_id']);

const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const PHONE_RE = /(?<!\w)(?:\+?\d[\d\s().-]{7,}\d)(?!\w)/g;

function normalizeKey(key: string): string {
  return key.toLowerCase().replace(/-/g, '_');
}

function isPiiKey(key: string): boolean {
  const normalized = normalizeKey(key);
  if (ALLOWED_ID_KEYS.has(normalized)) {
    return false;
  }
  return (
    PII_KEYS.has(normalized) ||
    normalized.endsWith('_email') ||
    normalized.endsWith('_phone') ||
    normalized.endsWith('_notes') ||
    normalized.endsWith('_password')
  );
}

function scrubString(value: string): string {
  return value.replace(EMAIL_RE, REDACTED).replace(PHONE_RE, REDACTED);
}

function scrubValue(value: unknown, key?: string): unknown {
  if (key && isPiiKey(key)) {
    return REDACTED;
  }
  if (typeof value === 'string') {
    return scrubString(value);
  }
  if (Array.isArray(value)) {
    return value.map((item) => scrubValue(item));
  }
  if (value && typeof value === 'object') {
    return scrubObject(value as Record<string, unknown>);
  }
  return value;
}

function scrubObject(input: Record<string, unknown>): Record<string, unknown> {
  const next: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    next[key] = scrubValue(value, key);
  }
  return next;
}

function scrubHeaders(headers: Record<string, string> | undefined): Record<string, string> | undefined {
  if (!headers) {
    return headers;
  }
  const next: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    const normalized = normalizeKey(key);
    if (
      normalized === 'authorization' ||
      normalized === 'cookie' ||
      normalized === 'set_cookie' ||
      isPiiKey(key)
    ) {
      next[key] = REDACTED;
    } else {
      next[key] = scrubString(value);
    }
  }
  return next;
}

export function beforeSend(event: ErrorEvent): ErrorEvent | null {
  if (event.user) {
    event.user = event.user.id ? { id: String(event.user.id) } : undefined;
  }

  if (event.request) {
    event.request.cookies = undefined;
    event.request.headers = scrubHeaders(event.request.headers);
    if (typeof event.request.query_string === 'string') {
      event.request.query_string = scrubString(event.request.query_string);
    }
    if (event.request.data) {
      event.request.data = scrubValue(event.request.data);
    }
  }

  if (event.extra) {
    event.extra = scrubObject(event.extra as Record<string, unknown>);
  }

  if (event.contexts) {
    const contexts = event.contexts as Record<string, unknown>;
    for (const [key, value] of Object.entries(contexts)) {
      if (key === 'app' || key === 'device' || key === 'os' || key === 'culture') {
        continue;
      }
      contexts[key] = scrubValue(value, key);
    }
  }

  if (event.breadcrumbs) {
    event.breadcrumbs = event.breadcrumbs
      .map((breadcrumb) => beforeBreadcrumb(breadcrumb))
      .filter((breadcrumb): breadcrumb is Breadcrumb => breadcrumb != null);
  }

  if (event.message) {
    event.message = scrubString(event.message);
  }

  return event;
}

export function beforeBreadcrumb(breadcrumb: Breadcrumb): Breadcrumb | null {
  if (breadcrumb.message) {
    breadcrumb.message = scrubString(breadcrumb.message);
  }
  if (breadcrumb.data) {
    breadcrumb.data = scrubObject(breadcrumb.data as Record<string, unknown>);
  }
  return breadcrumb;
}
