import { IsUUID } from 'class-validator';

export class SearchCommentDto {
  @IsUUID(4)
  articleId: string;
}
