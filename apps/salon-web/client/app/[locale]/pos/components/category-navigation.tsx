import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type Category = {
  id: string;
  name: string;
  icon: string;
};

interface CategoryNavigationProps {
  categories: Category[];
  selectedCategory: string;
  onCategoryChange: (categoryId: string) => void;
}

export function CategoryNavigation({
  categories,
  selectedCategory,
  onCategoryChange,
}: CategoryNavigationProps) {
  return (
    <div className="flex items-center gap-1 p-3 sm:p-4 border-b bg-white overflow-x-auto">
      {categories.map((category) => (
        <Button
          key={category.id}
          variant={selectedCategory === category.id ? "default" : "ghost"}
          className={cn(
            "flex items-center gap-2 whitespace-nowrap text-sm sm:text-base",
            selectedCategory === category.id &&
              "bg-primary text-primary-foreground hover:bg-primary/90"
          )}
          onClick={() => onCategoryChange(category.id)}
        >
          <span className="text-lg">{category.icon}</span>
          <span className="hidden sm:inline">{category.name}</span>
        </Button>
      ))}
    </div>
  );
}

