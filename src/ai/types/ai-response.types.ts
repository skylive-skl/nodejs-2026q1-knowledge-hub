export type SummarizeArticleResponse = {
  articleId: string;
  summary: string;
  originalLength: number;
  summaryLength: number;
};

export type TranslateArticleResponse = {
  articleId: string;
  translatedText: string;
  detectedLanguage: string;
};

export type AnalyzeArticleSeverity = 'info' | 'warning' | 'error';

export type AnalyzeArticleResponse = {
  articleId: string;
  analysis: string;
  suggestions: string[];
  severity: AnalyzeArticleSeverity;
};