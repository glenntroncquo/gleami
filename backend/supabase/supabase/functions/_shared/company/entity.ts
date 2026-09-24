export interface Company {
  id: string;
  name: string;
  description: string | null;
  email: string | null;
  street: string | null;
  city: string | null;
  postalCode: string | null;
  state: string | null;
  country: string | null;
  slug: string | null;
  imageUrl: string | null;
  geoLocation: unknown;
  createdAt: string;
  updatedAt: string | null;
}

export interface NearbyCompany {
  id: string;
  name: string;
  street: string | null;
  postalCode: string | null;
  city: string | null;
  latitude: number;
  longitude: number;
  distanceM: number;
}
