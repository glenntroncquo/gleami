# Gleami Marketplace

Consumer app for discovering salons. Fresha-style list and map, Dutch (nl-BE) UI.

This package is `apps/marketplace-mobile`. It does not import the Expo 54 prototype in `apps/marketplace-web/airbnb-clone-react-native`.

## Stack

- Expo SDK 57, React Native 0.86, React 19.2, Expo Router (typed routes). New Architecture is on by default in SDK 57; `newArchEnabled` is no longer a valid app.json field.
- NativeWind v5 RC (`nativewind@5.0.0-rc.0` + `react-native-css@3.1.0-rc.0`). That release candidate is the NativeWind line tested against Expo 57 / React Native 0.86.3 / React 19.2.3. NativeWind v4 is the stable major, and it is not the documented target for this SDK.
- TanStack Query for server data, Zustand for search / filter / map UI state
- `@supabase/supabase-js` for auth, category reads, and likes
- `@rnmapbox/maps` 10.3.x (native SDK 11.20.1 via the config plugin). Mapbox needs a development build. It does not run in Expo Go.

Design tokens live in `global.css` (`--color-accent` and the canvas / ink / surface colors). One accent: `#9f1239`.

## Environment

Copy `.env.example` to `.env`.

| Variable | Required | Purpose |
| --- | --- | --- |
| `EXPO_PUBLIC_SUPABASE_URL` | Live mode | Supabase project URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Live mode | Public anon key (safe to ship in the client) |
| `EXPO_PUBLIC_USE_MOCKS` | No | `1` serves fictional Belgian salons and a local sign-in. No backend needed. |
| `EXPO_PUBLIC_MAPBOX_TOKEN` | No | Public Mapbox runtime token. Empty shows a placeholder; the list still works. |
| `EXPO_PUBLIC_BOOKING_WEB_URL` | No | Defaults to `https://booking.salonify.co` |
| `EXPO_PUBLIC_ENABLE_APPLE_SIGN_IN` | No | `1` shows a non-functional Sign in with Apple button |

Sessions are stored in `expo-secure-store` (chunked, because a Supabase session can exceed the Keychain value limit). On web, where there is no keychain, the same adapter uses `localStorage`. The staff app (`apps/salon-mobile`) uses AsyncStorage for the same job.

## Mock mode

```bash
cd apps/marketplace-mobile
cp .env.example .env
# EXPO_PUBLIC_USE_MOCKS=1 is already set in the example
npm install
npx expo start
```

The banner **Voorbeelddata — deze salons zijn fictief** means the salons are example data. Any email with a password of at least 6 characters signs in. Nothing is emailed. Likes stay on this device for the session.

Without `EXPO_PUBLIC_MAPBOX_TOKEN`, Discover shows a draggable placeholder instead of Mapbox. Drag it, then tap **Zoek in dit gebied** to refetch the list for that area.

## Development build (Mapbox)

Mapbox is a native module. Expo Go cannot load it. Use an EAS development build:

```bash
npm install -g eas-cli
eas login
eas init          # links extra.eas.projectId; not committed yet
eas build --profile development --platform ios
# or
eas build --profile development --platform android
```

`eas.json` has `development` (dev client, internal), `preview` (internal APK), and `production`. Install the dev client, then:

```bash
npx expo start --dev-client
```

The Mapbox config plugin is:

```json
["@rnmapbox/maps", { "RNMapboxMapsVersion": "11.20.1" }]
```

There is no download token. Set `EXPO_PUBLIC_MAPBOX_TOKEN` for the public runtime token. iOS location copy is in the `expo-location` plugin (`locationWhenInUsePermission`). If the user denies location, the map stays centred on Brussels.

## Booking handoff

**Boek** opens booking-web in an in-app browser:

`{EXPO_PUBLIC_BOOKING_WEB_URL}/{companyId}/{locationId}?serviceIds={serviceId}`

`locationId` is the location uuid, which booking-web accepts as `locationKey`. A service with a single variant also sends `serviceVariantIds`. See the pull request for contract gaps.

## Checks

```bash
npx expo-doctor
npx tsc --noEmit
npm run lint
npx expo export --platform ios
```
