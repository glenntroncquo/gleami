import type { Database } from "@/types/database";
import type {
  Staff,
  StaffPriceOption,
  StaffTreatment,
} from "./entity.ts";

type StaffRow = Database["public"]["Tables"]["staff"]["Row"];
type StaffPriceOptionRow = Database["public"]["Tables"]["staff_price_option"]["Row"];
type StaffTreatmentRow = Database["public"]["Tables"]["staff_treatment"]["Row"];

export function toStaff(row: StaffRow): Staff {
  return {
    id: row.id,
    companyId: row.company_id,
    userId: row.user_id,
    email: row.email,
    firstName: row.first_name,
    lastName: row.last_name,
    phone: row.phone,
    status: row.status,
    slug: row.slug,
    imagePath: row.image_path,
    specialization: row.specialization,
    specialties: row.specialties,
    hireDate: row.hire_date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toStaffPriceOption(row: StaffPriceOptionRow): StaffPriceOption {
  return {
    companyId: row.company_id,
    staffId: row.staff_id,
    priceOptionId: row.price_option_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toStaffTreatment(row: StaffTreatmentRow): StaffTreatment {
  return {
    companyId: row.company_id,
    staffId: row.staff_id,
    treatmentId: row.treatment_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
