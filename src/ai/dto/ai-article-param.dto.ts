import { IsUUID } from 'class-validator';

export class AiArticleParamDto {
  @IsUUID(4, { message: 'articleId must be a valid UUID v4' })
  articleId: string;
}