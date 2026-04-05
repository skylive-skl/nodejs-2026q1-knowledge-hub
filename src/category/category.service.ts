import { Injectable } from '@nestjs/common';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CategoryRepository } from './category.repository';
import { randomUUID } from 'node:crypto';

@Injectable()
export class CategoryService {
  constructor(private readonly categoryRepository: CategoryRepository) {}

  create(dto: CreateCategoryDto) {
    const category = {
      id: randomUUID(),
      name: dto.name,
      description: dto.description,
    };
    return this.categoryRepository.create(category);
  }

  findAll() {
    return this.categoryRepository.findAll();
  }

  findOne(id: string) {
    return this.categoryRepository.findById(id);
  }

  update(id: string, dto: UpdateCategoryDto) {
    return this.categoryRepository.update(id, dto);
  }

  remove(id: string) {
    return this.categoryRepository.delete(id);
  }
}
