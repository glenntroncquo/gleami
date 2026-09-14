import { companyRepository } from "../../repository.ts";
import type { GetCompanyQueryInput } from "./schema.ts";
import { toGetCompanyResponseDto, type GetCompanyResponseDto } from "./dto.ts";

export async function getCompanyHandler(
  input: GetCompanyQueryInput
): Promise<GetCompanyResponseDto | null> {
  const entity = input.companyId
    ? await companyRepository.findById(input.companyId)
    : await companyRepository.findBySlug(input.slug!);

  return entity ? toGetCompanyResponseDto(entity) : null;
}
