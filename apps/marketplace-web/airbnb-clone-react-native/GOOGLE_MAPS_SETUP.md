# Google Maps Setup Guide

The app is now configured to use Google Maps instead of Apple Maps. Follow these steps to get your Google Maps API keys:

## 1. Get Google Maps API Keys

### Step 1: Go to Google Cloud Console

1. Visit [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one

### Step 2: Enable Required APIs

1. Go to "APIs & Services" > "Library"
2. Search for and enable these APIs:
   - **Maps SDK for Android**
   - **Maps SDK for iOS**

### Step 3: Create API Keys

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "API Key"
3. Create two separate API keys:
   - One for iOS
   - One for Android

### Step 4: Restrict Your API Keys (Recommended)

**For iOS:**

- Click on the iOS API key
- Under "Application restrictions", select "iOS apps"
- Add your iOS bundle identifier

**For Android:**

- Click on the Android API key
- Under "Application restrictions", select "Android apps"
- Add your package name and SHA-1 certificate fingerprint

## 2. Add API Keys to Your App

### Update `app.json`:

Replace the placeholder values with your actual API keys:

```json
"ios": {
  "supportsTablet": true,
  "config": {
    "googleMapsApiKey": "YOUR_ACTUAL_IOS_API_KEY_HERE"
  }
},
"android": {
  "config": {
    "googleMaps": {
      "apiKey": "YOUR_ACTUAL_ANDROID_API_KEY_HERE"
    }
  }
}
```

## 3. Alternative: Use Environment Variables (More Secure)

For better security, you can use environment variables:

1. Create a `.env` file (if you don't have one):

```
EXPO_PUBLIC_GOOGLE_MAPS_IOS_API_KEY=your_ios_api_key
EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_API_KEY=your_android_api_key
```

2. Update `app.json` to use these variables (this requires `app.config.js` instead):

Rename `app.json` to `app.config.js` and update it:

```javascript
export default {
  expo: {
    // ... other config
    ios: {
      supportsTablet: true,
      config: {
        googleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_IOS_API_KEY,
      },
    },
    android: {
      config: {
        googleMaps: {
          apiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_API_KEY,
        },
      },
    },
  },
};
```

## 4. Rebuild Your App

After adding the API keys, rebuild your app:

```bash
# For development
npx expo start --clear

# For production builds
eas build --platform ios
eas build --platform android
```

## 5. Test the Map

Once configured, the map will use Google Maps on both iOS and Android devices. The map component is already configured with `provider="google"`.

## Important Notes

- **Never commit API keys to version control**
- Add `.env` to your `.gitignore` file
- Use API key restrictions to prevent unauthorized use
- Monitor your API usage in Google Cloud Console
- Google Maps has a free tier, but check pricing for production use

## Troubleshooting

If the map doesn't load:

1. Check that API keys are correctly added to `app.json`
2. Verify that both Maps SDKs are enabled in Google Cloud
3. Make sure you've rebuilt the app after adding keys
4. Check the console for any API key errors
