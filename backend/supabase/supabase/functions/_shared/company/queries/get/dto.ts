import type { Company } from "../../entity.ts";

export interface GetCompanyResponseDto {
  id: string;
  name: string;
  description: string | null;
  city: string | null;
  postal_code: string | null;
  street: string | null;
  slug: string | null;
}

export function toGetCompanyResponseDto(entity: Company): GetCompanyResponseDto {
  return {
    id: entity.id,
    name: entity.name,
    description: entity.description,
    city: entity.city,
    postal_code: entity.postalCode,
    street: entity.street,
    slug: entity.slug,
  };
}
