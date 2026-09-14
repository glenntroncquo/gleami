import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';

import { beforeBreadcrumb, beforeSend } from '@/lib/sentry-privacy';

export const DEFAULT_SENTRY_DSN =
  'https://f538d29e8552491263993c60be9477d0@o4512034656813056.ingest.de.sentry.io/4512034662580304';

export type SentryEnvironment = 'development' | 'preview' | 'production';

type SentryExtra = {
  sentryDsn?: string;
  sentryEnvironment?: string;
};

function extra(): SentryExtra {
  return (Constants.expoConfig?.extra ?? {}) as SentryExtra;
}

export function getSentryDsn(): string {
  return process.env.EXPO_PUBLIC_SENTRY_DSN || extra().sentryDsn || DEFAULT_SENTRY_DSN;
}

export function getSentryEnvironment(): SentryEnvironment {
  if (__DEV__) {
    return 'development';
  }
  const fromExtra = extra().sentryEnvironment;
  if (fromExtra === 'preview' || fromExtra === 'production' || fromExtra === 'development') {
    return fromExtra;
  }
  return 'production';
}

export function initSentry(): void {
  Sentry.init({
    dsn: getSentryDsn(),
    environment: getSentryEnvironment(),
    sendDefaultPii: false,
    enableAutoPerformanceTracing: false,
    enableAppStartTracking: false,
    enableNativeFramesTracking: false,
    enableStallTracking: false,
    enableUserInteractionTracing: false,
    tracesSampleRate: 0,
    profilesSampleRate: 0,
    replaysOnErrorSampleRate: 0,
    replaysSessionSampleRate: 0,
    attachScreenshot: false,
    attachViewHierarchy: false,
    beforeSend,
    beforeBreadcrumb,
  });
}

export function setSentryStaffContext(userId: string | null, companyId: string | null): void {
  if (userId) {
    Sentry.setUser({ id: userId });
  } else {
    Sentry.setUser(null);
  }

  if (companyId) {
    Sentry.setTag('company_id', companyId);
    Sentry.setContext('staff', { company_id: companyId });
  } else {
    Sentry.setTag('company_id', '');
    Sentry.setContext('staff', null);
  }
}

export { Sentry };
