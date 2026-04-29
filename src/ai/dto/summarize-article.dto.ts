import { IsIn, IsOptional } from 'class-validator';

export const SUMMARY_LENGTH_OPTIONS = ['short', 'medium', 'detailed'] as const;

export type SummaryLengthOption = (typeof SUMMARY_LENGTH_OPTIONS)[number];

export class SummarizeArticleRequestDto {
  @IsOptional()
  @IsIn(SUMMARY_LENGTH_OPTIONS)
  maxLength?: SummaryLengthOption;
}