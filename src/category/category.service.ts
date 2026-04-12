import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { ArticleService } from 'src/article/article.service';
import { SearchCategoryDto } from './dto/search-category.dto';
import { paginate, shouldPaginate, sortItems } from 'src/common/pagination';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class CategoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly articleService: ArticleService,
  ) {}

  async create(dto: CreateCategoryDto) {
    return this.prisma.category.create({
      data: {
        name: dto.name,
        description: dto.description,
      },
    });
  }

  async findAll(query: SearchCategoryDto) {
    const { sortBy, order, page, limit } = query;
    const categories = await this.prisma.category.findMany();

    const sortedCategories = sortItems(categories, sortBy, order, [
      'name',
      'description',
    ]);

    if (shouldPaginate(page, limit)) {
      return paginate(sortedCategories, page, limit);
    }

    return sortedCategories;
  }

  async findOne(id: string) {
    const category = await this.prisma.category.findUnique({ where: { id } });
    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }
    return category;
  }

  async update(id: string, dto: UpdateCategoryDto) {
    await this.findOne(id);
    return this.prisma.category.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.category.delete({ where: { id } });
  }
}
