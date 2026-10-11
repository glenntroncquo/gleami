export type Category = "Hair" | "Barbers" | "Nails" | "Massage" | "Skin";

export interface Service {
  id: string;
  name: string;
  duration: number;
  price: number;
  description: string;
}

export interface Venue {
  id: string;
  name: string;
  category: Category;
  area: string;
  distance: string;
  rating: number;
  reviews: number;
  image: string;
  imagePosition: string;
  priceFrom: number;
  nextSlot: string;
  address: string;
  services: Service[];
}

export type Tone = "teal" | "green" | "orchid" | "amber";

export interface Appointment {
  id: string;
  staff: number;
  start: number;
  duration: number;
  title: string;
  client: string;
  tone: Tone;
}
