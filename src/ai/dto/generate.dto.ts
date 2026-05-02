import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class GenerateRequestDto {
  @IsString()
  @IsNotEmpty()
  prompt: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  sessionId?: string;
}
