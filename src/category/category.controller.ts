import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Put,
  HttpStatus,
  HttpCode,
  Query,
} from '@nestjs/common';
import { CategoryService } from './category.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { UUIDDto } from 'src/common/dto/uuid.dto';
import { SearchCategoryDto } from './dto/search-category.dto';

@Controller('category')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @Post()
  create(@Body() createCategoryDto: CreateCategoryDto) {
    return this.categoryService.create(createCategoryDto);
  }

  @Get()
  findAll(@Query() query: SearchCategoryDto) {
    return this.categoryService.findAll(query);
  }

  @Get(':id')
  findOne(@Param() params: UUIDDto) {
    const { id } = params;
    return this.categoryService.findOne(id);
  }

  @Put(':id')
  update(@Param() params: UUIDDto, @Body() dto: UpdateCategoryDto) {
    const { id } = params;
    return this.categoryService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param() params: UUIDDto) {
    const { id } = params;
    return this.categoryService.remove(id);
  }
}
