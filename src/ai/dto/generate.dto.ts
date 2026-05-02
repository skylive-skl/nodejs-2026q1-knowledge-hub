import { IsNotEmpty, IsString } from 'class-validator';

export class GenerateRequestDto {
  @IsString()
  @IsNotEmpty()
  prompt: string;
}
