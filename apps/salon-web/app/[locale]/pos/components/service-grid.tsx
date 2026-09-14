import type { Service, ServiceVariant } from "./types";
import { formatPrice } from "./utils";

interface ServiceGridProps {
  services: Service[];
  searchQuery: string;
  onAddToCart: (service: Service, serviceVariant: ServiceVariant) => void;
}

export function ServiceGrid({
  services,
  searchQuery,
  onAddToCart,
}: ServiceGridProps) {
  const filteredServices = services.filter((service) =>
    service.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (filteredServices.length === 0) {
    return (
      <div className="text-center text-gray-500 py-12">
        <div className="text-4xl sm:text-6xl mb-4">🔍</div>
        <p className="text-base sm:text-lg">No treatments found</p>
        <p className="text-sm">Try adjusting your search</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {filteredServices.map((service) => (
        <div
          key={service.id}
          className="bg-white rounded-lg shadow-sm border p-3 sm:p-4"
        >
          <h3 className="font-semibold text-base sm:text-lg mb-3">
            {service.name}
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {service.service_variants?.map((option: ServiceVariant) => (
              <div
                key={option.id}
                className="bg-gray-50 rounded-lg border hover:shadow-md transition-shadow cursor-pointer group"
                onClick={() => onAddToCart(service, option)}
              >
                <div className="aspect-square bg-gray-100 rounded-t-lg flex items-center justify-center">
                  <div className="text-2xl sm:text-3xl">💆</div>
                </div>
                <div className="p-2 sm:p-3">
                  <h4 className="font-medium text-xs sm:text-sm mb-1 line-clamp-2">
                    {option.name}
                  </h4>
                  <p className="text-gray-500 text-xs mb-2">
                    {option.duration_in_minutes} min
                  </p>
                  <div className="flex justify-between items-center">
                    <span className="text-sm sm:text-base font-bold text-primary">
                      €{formatPrice(option.price)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
