import { IsOptional, IsString, IsUUID } from 'class-validator';

export class SearchArticleDto {
  @IsString()
  @IsOptional()
  status?: string;
  @IsString()
  @IsOptional()
  tag?: string;

  @IsString()
  @IsOptional()
  @IsUUID('4')
  categoryId?: string;
}
