import type { CategoryViewModel } from "../../types/ui";

interface CategorySummaryCardProps {
  category: CategoryViewModel;
}

export function CategorySummaryCard({ category }: CategorySummaryCardProps) {
  return (
    <section className="category-summary-card">
      <div>
        <p className="eyebrow" style={{ color: category.accent }}>
          {category.label}
        </p>
        <h3>{category.description}</h3>
        <p className="muted">{category.summary}</p>
      </div>
      <div className="chip-row">
        {category.themes.map((theme) => (
          <span key={theme} className="chip">
            {theme}
          </span>
        ))}
      </div>
    </section>
  );
}
