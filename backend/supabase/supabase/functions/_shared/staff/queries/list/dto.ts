import type { Staff } from "../../entity.ts";

export interface StaffListItemDto {
  id: string;
  first_name: string | null;
  last_name: string | null;
  image_path: string | null;
  slug: string | null;
}

export function toStaffListItemDto(entity: Staff): StaffListItemDto {
  return {
    id: entity.id,
    first_name: entity.firstName,
    last_name: entity.lastName,
    image_path: entity.imagePath,
    slug: entity.slug,
  };
}
