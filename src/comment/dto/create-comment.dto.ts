import { IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateCommentDto {
  @IsString()
  content: string;

  @IsUUID(4)
  articleId: string; // refers to Article

  @IsUUID(4)
  @IsOptional()
  authorId: string | null; // refers to User
}
