import type { CategoryDefinition } from "../../types/ui";

interface CategoryTabsProps {
  categories: CategoryDefinition[];
  selectedCategoryId: string;
  onSelect: (categoryId: string) => void;
}

export function CategoryTabs({
  categories,
  selectedCategoryId,
  onSelect,
}: CategoryTabsProps) {
  return (
    <div className="category-tabs">
      {categories.map((category) => (
        <button
          key={category.id}
          type="button"
          className={
            category.id === selectedCategoryId
              ? "category-tab category-tab-active"
              : "category-tab"
          }
          onClick={() => onSelect(category.id)}
          style={{ borderColor: `${category.accent}50` }}
        >
          <span className="category-dot" style={{ background: category.accent }} />
          <span>{category.label}</span>
        </button>
      ))}
    </div>
  );
}
