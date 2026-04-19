import {
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  IsUUID,
} from 'class-validator';

export class CreateCommentDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(2000)
  content: string;

  @IsUUID(4)
  articleId: string; // refers to Article

  @IsUUID(4)
  @IsOptional()
  authorId: string | null; // refers to User
}
