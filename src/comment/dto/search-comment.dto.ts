import { IsOptional, IsUUID } from 'class-validator';
import { ListQueryDto } from 'src/common/dto/list-query.dto';

export class SearchCommentDto extends ListQueryDto {
  @IsUUID(4)
  @IsOptional()
  articleId?: string;
}
