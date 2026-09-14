import { supabaseAdmin } from "../infrastructure/supabase/client.ts";
import { RepositoryError } from "../infrastructure/errors.ts";
import { toProduct } from "./mapper.ts";
import type { Product } from "./entity.ts";

export const productRepository = {
  async findById(id: string): Promise<Product | null> {
    const { data, error } = await supabaseAdmin
      .from("product")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      throw new RepositoryError("Failed to fetch product by id", { cause: error });
    }

    return data ? toProduct(data) : null;
  },

  async findManyByCompanyId(companyId: string): Promise<Product[]> {
    const { data, error } = await supabaseAdmin
      .from("product")
      .select("*")
      .eq("company_id", companyId);

    if (error) {
      throw new RepositoryError("Failed to fetch products by company id", { cause: error });
    }

    return (data ?? []).map(toProduct);
  },
};
