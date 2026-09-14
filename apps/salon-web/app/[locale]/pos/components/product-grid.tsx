import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Product } from "./types";
import { formatPrice, getProductInclusivePrice } from "./utils";

interface ProductGridProps {
  products: Product[];
  searchQuery: string;
  onAddToCart: (product: Product) => void;
}

export function ProductGrid({
  products,
  searchQuery,
  onAddToCart,
}: ProductGridProps) {
  const t = useTranslations();
  const filteredProducts = products.filter(
    (product) =>
      product.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.sku?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (filteredProducts.length === 0) {
    return (
      <div className="col-span-full text-center text-gray-500 py-12">
        <div className="text-4xl sm:text-6xl mb-4">🔍</div>
        <p className="text-base sm:text-lg">No products found</p>
        <p className="text-sm">Try adjusting your search</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
      {filteredProducts.map((product) => (
        <div
          key={product.id}
          className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow cursor-pointer group"
          onClick={() => onAddToCart(product)}
        >
          <div className="aspect-square bg-gray-100 rounded-t-lg flex items-center justify-center">
            <div className="text-3xl sm:text-4xl">🛍️</div>
          </div>
          <div className="p-3 sm:p-4">
            <h3 className="font-semibold text-sm sm:text-lg mb-1 line-clamp-2">
              {product.name || "Unnamed Product"}
            </h3>
            <p className="text-gray-500 text-xs mb-2">
              {product.sku || t("common.notAvailable")}
            </p>
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
              <span className="text-lg sm:text-2xl font-bold text-primary">
                €{formatPrice(getProductInclusivePrice(product))}
              </span>
              <div className="flex items-center gap-1">
                <div
                  className={cn(
                    "w-2 h-2 rounded-full",
                    (product.stock_qty || 0) <= 0
                      ? "bg-red-500"
                      : (product.stock_qty || 0) <= 5
                      ? "bg-orange-500"
                      : "bg-green-500"
                  )}
                />
                <Badge
                  variant="secondary"
                  className={cn(
                    "text-xs w-fit",
                    (product.stock_qty || 0) <= 0
                      ? "bg-red-100 text-red-800 border-red-200"
                      : (product.stock_qty || 0) <= 5
                      ? "bg-orange-100 text-orange-800 border-orange-200"
                      : "bg-green-100 text-green-800 border-green-200"
                  )}
                >
                  {product.stock_qty || 0} in stock
                </Badge>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
