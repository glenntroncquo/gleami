export interface Staff {
  id: string;
  companyId: string | null;
  userId: string | null;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  status: string | null;
  slug: string | null;
  imagePath: string | null;
  specialization: string | null;
  specialties: string[] | null;
  hireDate: string | null;
  createdAt: string;
  updatedAt: string | null;
}

export interface StaffPriceOption {
  companyId: string;
  staffId: string;
  priceOptionId: string | null;
  createdAt: string;
  updatedAt: string | null;
}

export interface StaffTreatment {
  companyId: string;
  staffId: string;
  treatmentId: string;
  createdAt: string;
  updatedAt: string | null;
}
