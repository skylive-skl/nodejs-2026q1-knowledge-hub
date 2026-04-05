import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CategoryRepository } from './category.repository';
import { randomUUID } from 'node:crypto';
import { ArticleService } from 'src/article/article.service';
import { SearchCategoryDto } from './dto/search-category.dto';
import { paginate, shouldPaginate, sortItems } from 'src/common/pagination';

@Injectable()
export class CategoryService {
  constructor(
    private readonly categoryRepository: CategoryRepository,
    private readonly articleService: ArticleService,
  ) {}

  create(dto: CreateCategoryDto) {
    const category = {
      id: randomUUID(),
      name: dto.name,
      description: dto.description,
    };
    return this.categoryRepository.create(category);
  }

  findAll(query: SearchCategoryDto) {
    const { sortBy, order, page, limit } = query;
    const sortedCategories = sortItems(
      this.categoryRepository.findAll(),
      sortBy,
      order,
      ['name', 'description'],
    );

    if (shouldPaginate(page, limit)) {
      return paginate(sortedCategories, page, limit);
    }

    return sortedCategories;
  }

  findOne(id: string) {
    const category = this.categoryRepository.findById(id);
    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }
    return category;
  }

  update(id: string, dto: UpdateCategoryDto) {
    this.findOne(id);
    return this.categoryRepository.update(id, dto);
  }

  remove(id: string) {
    this.findOne(id);
    this.articleService.nullifyCategory(id);
    this.categoryRepository.delete(id);
  }
}
