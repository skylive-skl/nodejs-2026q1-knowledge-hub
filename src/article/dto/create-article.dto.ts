import { IsEnum, IsString } from 'class-validator';
import { ArticleStatus } from 'src/common/enums';

export class CreateArticleDto {
  @IsString()
  title: string;
  @IsString()
  content: string;
  @IsString()
  authorId: string;
  @IsString()
  categoryId: string;
  @IsString({ each: true })
  tags: string[];

  @IsEnum(ArticleStatus)
  status?: ArticleStatus;
}
