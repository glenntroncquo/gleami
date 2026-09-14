import type { ClientSearchResult } from "../../entity.ts";

export interface ClientSearchResultDto {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  rank: number;
}

export function toClientSearchResultDto(entity: ClientSearchResult): ClientSearchResultDto {
  return {
    id: entity.id,
    first_name: entity.firstName,
    last_name: entity.lastName,
    email: entity.email,
    rank: entity.rank,
  };
}
