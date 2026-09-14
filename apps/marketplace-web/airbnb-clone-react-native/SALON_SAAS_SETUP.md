# Salon SaaS Setup

This Airbnb clone has been transformed into a Salon SaaS application for exploring beauty salons and spas.

## Changes Made

### 1. Edge Function

- Created `supabase/functions/get-companies/index.ts` to fetch salon companies from the database
- Accepts user's location (`lat` and `long`) as parameters from the request body
- Returns company data with: `id`, `name`, `city`, `street`, `postal_code`, `geo_location`
- Can be extended to filter companies by distance from user's location

### 2. Data Fetching

- Created `hooks/useCompanies.ts` hook to fetch salon data using the edge function
- Requests location permissions from the user
- Gets the device's current GPS coordinates (latitude and longitude)
- Passes location data to the edge function
- Includes loading states and error handling

### 3. UI Updates

- Updated `components/Listings.tsx` to display salon information instead of Airbnb listings
- Updated `components/ListingsBottomSheet.tsx` to work with salon data
- Updated `components/ExploreHeader.tsx` with salon-related categories:
  - All Salons
  - Hair Salons
  - Nail Salons
  - Spa & Wellness
  - Beauty Salons
  - Barbershops
  - Massage

### 4. Main Explore Page

- Updated `app/(tabs)/index.tsx` to use salon data instead of Airbnb listings
- Added loading and error states
- Converts company data to map format for display

## Database Schema Required

The app expects a `company` table with the following structure:

```sql
CREATE TABLE company (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  city TEXT NOT NULL,
  street TEXT NOT NULL,
  postal_code TEXT NOT NULL,
  geo_location JSONB NOT NULL -- Should contain lat/lng coordinates
);
```

## Setup Instructions

1. Deploy the edge function to your Supabase project:

   ```bash
   supabase functions deploy get-companies
   ```

2. Set up your environment variables in `.env`:

   ```
   EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

3. Create the company table in your Supabase database with the schema above

4. Add some sample salon data to test the app

## Features

- Browse salons on a map
- View salon listings in a bottom sheet
- Filter by salon categories
- Search functionality (placeholder)
- Responsive design with loading states
- Mock images for salon display

The app now displays salon companies instead of Airbnb listings, with appropriate UI updates and data fetching from your Supabase database.
