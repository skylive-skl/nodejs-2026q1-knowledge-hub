import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { ListQueryDto } from 'src/common/dto/list-query.dto';
import { ArticleStatus } from 'src/common/enums';

export class SearchArticleDto extends ListQueryDto {
  @IsEnum(ArticleStatus)
  @IsOptional()
  status?: ArticleStatus;

  @IsString()
  @IsOptional()
  tag?: string;

  @IsString()
  @IsOptional()
  @IsUUID('4')
  categoryId?: string;
}
