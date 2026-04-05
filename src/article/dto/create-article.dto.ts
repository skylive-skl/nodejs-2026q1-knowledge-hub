import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ArticleStatus } from 'src/common/enums';

export class CreateArticleDto {
  @IsString()
  title: string;
  @IsString()
  content: string;
  @IsString()
  @IsOptional()
  authorId: string;
  @IsString()
  @IsOptional()
  categoryId: string;
  @IsString({ each: true })
  tags: string[];

  @IsEnum(ArticleStatus)
  status?: ArticleStatus;
}
