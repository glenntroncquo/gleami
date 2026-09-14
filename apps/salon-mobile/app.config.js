const DEFAULT_DSN =
  'https://f538d29e8552491263993c60be9477d0@o4512034656813056.ingest.de.sentry.io/4512034662580304';

function resolveSentryEnvironment() {
  const profile = process.env.EAS_BUILD_PROFILE;
  if (profile === 'production' || profile === 'preview' || profile === 'development') {
    return profile;
  }
  return 'development';
}

module.exports = ({ config }) => ({
  ...config,
  extra: {
    ...config.extra,
    sentryDsn: process.env.EXPO_PUBLIC_SENTRY_DSN || config.extra?.sentryDsn || DEFAULT_DSN,
    sentryEnvironment: resolveSentryEnvironment(),
    privacyUrl:
      process.env.EXPO_PUBLIC_PRIVACY_URL ||
      config.extra?.privacyUrl ||
      'https://booking.salonify.co/privacy',
    termsUrl:
      process.env.EXPO_PUBLIC_TERMS_URL ||
      config.extra?.termsUrl ||
      'https://booking.salonify.co/terms',
  },
});
