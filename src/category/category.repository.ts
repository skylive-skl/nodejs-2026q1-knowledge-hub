import { Category } from 'src/common/interfaces';

export class CategoryRepository {
  private readonly categories = new Map<string, Category>();
  findAll(): Category[] {
    return Array.from(this.categories.values());
  }

  findById(id: string): Category | undefined {
    return this.categories.get(id);
  }

  findByName(name: string): Category | undefined {
    return Array.from(this.categories.values()).find(
      (category) => category.name === name,
    );
  }

  create(category: Category): Category {
    this.categories.set(category.id, category);
    return category;
  }

  update(id: string, updatedCategory: Partial<Category>): Category | undefined {
    const existingCategory = this.categories.get(id);
    if (!existingCategory) return undefined;
    const newCategory = { ...existingCategory, ...updatedCategory };
    this.categories.set(id, newCategory);
    return newCategory;
  }

  delete(id: string): boolean {
    return this.categories.delete(id);
  }
}
