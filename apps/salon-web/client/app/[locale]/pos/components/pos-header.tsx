import { SearchIcon, FilterIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface POSHeaderProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
}

export function POSHeader({ searchQuery, onSearchChange }: POSHeaderProps) {
  const t = useTranslations();

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 sm:p-6 border-b bg-white gap-4">
      <div className="flex items-center gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold">
          {t("pos.header.menu")}
        </h1>
      </div>
      <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto">
        <div className="relative flex-1 sm:flex-none">
          <SearchIcon
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
            size={20}
          />
          <Input
            placeholder={t("pos.header.searchPlaceholder")}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 w-full sm:w-80"
          />
        </div>
        <Button variant="outline" size="icon" className="shrink-0">
          <FilterIcon size={20} />
        </Button>
      </div>
    </div>
  );
}
