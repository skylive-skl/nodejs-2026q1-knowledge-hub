import { AnalyzeTaskOption, SummaryLengthOption } from '../dto';

export function buildSummarizeArticlePrompt(
  title: string,
  content: string,
  maxLength: SummaryLengthOption,
): string {
  return [
    'You are summarizing a Knowledge Hub article.',
    `Summary length: ${maxLength}.`,
    'Preserve the main meaning and key facts.',
    'Return plain text only.',
    `Title: ${title}`,
    'Content:',
    content,
  ].join('\n');
}

export function buildTranslateArticlePrompt(
  title: string,
  content: string,
  targetLanguage: string,
  sourceLanguage?: string,
): string {
  return [
    'You are translating a Knowledge Hub article.',
    `Target language: ${targetLanguage}.`,
    sourceLanguage
      ? `Source language: ${sourceLanguage}.`
      : 'Detect the source language.',
    'Return only the translated article text.',
    `Title: ${title}`,
    'Content:',
    content,
  ].join('\n');
}

export function buildAnalyzeArticlePrompt(
  title: string,
  content: string,
  task: AnalyzeTaskOption,
): string {
  return [
    'You are analyzing a Knowledge Hub article.',
    `Task: ${task}.`,
    'Respond ONLY in the following structured format (no extra text before or after):',
    'ANALYSIS:',
    '<your analysis here>',
    '',
    'SUGGESTIONS:',
    '- <suggestion 1>',
    '- <suggestion 2>',
    '',
    'SEVERITY: info|warning|error',
    '',
    `Title: ${title}`,
    'Content:',
    content,
  ].join('\n');
}
