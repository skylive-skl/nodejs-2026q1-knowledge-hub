import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ArticleStatus } from 'src/common/enums';

export class CreateArticleDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(200)
  title: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  content: string;

  @IsUUID(4)
  @IsOptional()
  authorId: string | null;

  @IsUUID(4)
  @IsOptional()
  categoryId: string | null;

  @IsArray()
  @IsString({ each: true })
  tags: string[];

  @IsEnum(ArticleStatus)
  @IsOptional()
  status?: ArticleStatus;
}
