import { Article } from 'src/common/interfaces';

export class ArticleRepository {
  private readonly articles = new Map<string, Article>();

  findAll(status?: string, tag?: string, categoryId?: string): Article[] {
    let result = Array.from(this.articles.values());
    if (status) {
      result = result.filter((article) => article.status === status);
    }
    if (tag) {
      result = result.filter((article) => article.tags.includes(tag));
    }
    if (categoryId) {
      result = result.filter((article) => article.categoryId === categoryId);
    }
    return result;
  }

  findById(id: string): Article | undefined {
    return this.articles.get(id);
  }

  findByTitle(title: string): Article | undefined {
    return Array.from(this.articles.values()).find(
      (article) => article.title === title,
    );
  }

  create(article: Article): Article {
    this.articles.set(article.id, article);
    return article;
  }

  update(id: string, updatedArticle: Partial<Article>): Article | undefined {
    const existingArticle = this.articles.get(id);
    if (!existingArticle) return undefined;
    const newArticle = { ...existingArticle, ...updatedArticle };
    this.articles.set(id, newArticle);
    return newArticle;
  }

  delete(id: string): boolean {
    return this.articles.delete(id);
  }

  clear(): void {
    this.articles.clear();
  }
}
