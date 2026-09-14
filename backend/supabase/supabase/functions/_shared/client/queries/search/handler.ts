import { clientRepository } from "../../repository.ts";
import type { SearchClientsQueryInput } from "./schema.ts";
import { toClientSearchResultDto, type ClientSearchResultDto } from "./dto.ts";

export async function searchClientsHandler(
  input: SearchClientsQueryInput
): Promise<ClientSearchResultDto[]> {
  const entities = await clientRepository.searchByCompany({
    searchTerm: input.searchTerm,
    companyId: input.companyId,
  });

  return entities.map(toClientSearchResultDto);
}
