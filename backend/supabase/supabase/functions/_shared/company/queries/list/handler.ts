import { companyRepository, type SearchNearbyCompaniesParams } from "../../repository.ts";
import { toNearbyCompanyResponseDto, type NearbyCompanyResponseDto } from "./dto.ts";

export async function listNearbyCompaniesHandler(
  input: SearchNearbyCompaniesParams
): Promise<NearbyCompanyResponseDto[]> {
  const entities = await companyRepository.searchNearby(input);
  return entities.map(toNearbyCompanyResponseDto);
}
