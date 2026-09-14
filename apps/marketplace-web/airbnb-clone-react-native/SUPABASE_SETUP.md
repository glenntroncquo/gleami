# Supabase Authentication Setup

This project now uses Supabase for authentication instead of Clerk.

## Setup Steps

### 1. Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com) and create an account
2. Create a new project
3. Wait for the project to be provisioned

### 2. Get Your API Credentials

1. In your Supabase project dashboard, go to **Settings** > **API**
2. Copy your **Project URL** and **anon/public key**

### 3. Configure Environment Variables

1. Create a `.env` file in the root of your project (copy from `DUMMY.env`)
2. Add your Supabase credentials:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### 4. Create Database Tables

Run the following SQL in your Supabase SQL Editor (**SQL Editor** in the dashboard):

```sql
-- Create profiles table
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  first_name TEXT,
  last_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Create function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, created_at, updated_at)
  VALUES (new.id, now(), now());
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically create profile on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
```

### 5. Configure OAuth Providers (Optional)

If you want to use Google or Apple sign-in:

#### Google OAuth

1. Go to **Authentication** > **Providers** in Supabase
2. Enable **Google** provider
3. Follow Supabase's guide to set up Google OAuth

#### Apple OAuth

1. Go to **Authentication** > **Providers** in Supabase
2. Enable **Apple** provider
3. Follow Supabase's guide to set up Apple OAuth

### 6. Configure Deep Linking (Optional)

For OAuth redirects to work properly, you'll need to configure deep linking in your `app.json`:

```json
{
  "expo": {
    "scheme": "airbnb",
    "ios": {
      "bundleIdentifier": "com.yourcompany.airbnb"
    },
    "android": {
      "package": "com.yourcompany.airbnb"
    }
  }
}
```

### 7. Install Dependencies and Run

```bash
npm install
npx expo start
```

## Authentication Features

- ✅ Email/Password Sign Up
- ✅ Email/Password Sign In
- ✅ Persistent Sessions (SecureStore)
- ✅ User Profile Management
- ✅ Sign Out
- 🔄 OAuth Providers (Google, Apple) - requires configuration

## Database Schema

### profiles table

- `id` (UUID, Primary Key) - References auth.users
- `first_name` (TEXT) - User's first name
- `last_name` (TEXT) - User's last name
- `avatar_url` (TEXT) - Profile picture URL
- `created_at` (TIMESTAMP) - Account creation date
- `updated_at` (TIMESTAMP) - Last update date

## Need Help?

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Auth with React Native](https://supabase.com/docs/guides/auth/auth-helpers/react-native)

