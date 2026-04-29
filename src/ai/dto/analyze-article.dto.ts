import { IsIn, IsOptional } from 'class-validator';

export const ANALYZE_TASK_OPTIONS = [
  'review',
  'bugs',
  'optimize',
  'explain',
] as const;

export type AnalyzeTaskOption = (typeof ANALYZE_TASK_OPTIONS)[number];

export class AnalyzeArticleRequestDto {
  @IsOptional()
  @IsIn(ANALYZE_TASK_OPTIONS)
  task?: AnalyzeTaskOption;
}