import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class TranslateArticleRequestDto {
  @IsString()
  @IsNotEmpty()
  targetLanguage: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  sourceLanguage?: string;
}