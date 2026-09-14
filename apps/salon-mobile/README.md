# Gleami

Staff mobile app for Gleami — calendar, POS, clients, and services.

This repo is `glenntroncquo/salonify-app`. Product identity is **Gleami** (`com.gleami.staff`).

## Run locally

```bash
npm install
npx expo start
```

Then open the project in Expo Go, an iOS simulator, or an Android emulator.

## EAS / store builds

`eas.json` and the Gleami Expo identity are already in the repo:

- `name`: Gleami
- `slug` / `scheme`: `gleami`
- `ios.bundleIdentifier` / `android.package`: `com.gleami.staff`

`extra.eas.projectId` is `0697a847-cb88-4e7c-b337-5641523fc443`.

## Crash reporting (Sentry)

JS and native crashes go to Sentry org/project **`gleami`** (DE, `ingest.de.sentry.io`). The client DSN is public and lives in `extra.sentryDsn` / `EXPO_PUBLIC_SENTRY_DSN` (see `.env.example`).

Source maps upload on EAS Release builds only when this **EAS secret** is set (do not commit it):

```bash
eas secret:create --name SENTRY_AUTH_TOKEN --value <org-auth-token>
```

Create the token in Sentry (DE region) under Settings → Auth Tokens. `SENTRY_ORG` / `SENTRY_PROJECT` / `SENTRY_URL` are already in `eas.json` (`https://de.sentry.io/`). Native maps are uploaded by the `@sentry/react-native/expo` plugin; `eas-build-on-success` also uploads `dist/` if present (EAS Update / `expo export`).

EAS builds attach to this project via `extra.eas.projectId`. The Sentry plugin uploads native maps when `SENTRY_AUTH_TOKEN` is present.

## Brand assets

Icons and splash in `assets/images/` are a **placeholder** Gleami mark (letter G on `#161616`). Replace `icon.png` (1024) and the Android adaptive / splash derivatives with the final brand artwork when it is ready.
