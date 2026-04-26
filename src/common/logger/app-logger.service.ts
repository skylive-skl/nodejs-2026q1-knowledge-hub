import { Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

type SupportedLogLevel = 'log' | 'debug' | 'warn' | 'error' | 'verbose';

const SUPPORTED_LOG_LEVELS: SupportedLogLevel[] = [
  'error',
  'warn',
  'log',
  'debug',
  'verbose',
];

@Injectable()
export class AppLoggerService implements LoggerService {
  private readonly isProduction: boolean;
  private readonly minLevelIndex: number;

  constructor(private readonly configService: ConfigService) {
    const nodeEnv = this.configService.get<string>('NODE_ENV') ?? 'development';
    this.isProduction = nodeEnv === 'production';

    const configuredLevel =
      (this.configService.get<string>('LOG_LEVEL')?.toLowerCase() as SupportedLogLevel) ??
      'log';

    const normalizedLevel = SUPPORTED_LOG_LEVELS.includes(configuredLevel)
      ? configuredLevel
      : 'log';

    this.minLevelIndex = SUPPORTED_LOG_LEVELS.indexOf(normalizedLevel);
  }

  log(message: unknown, ...optionalParams: unknown[]): void {
    this.write('log', message, optionalParams);
  }

  error(message: unknown, ...optionalParams: unknown[]): void {
    this.write('error', message, optionalParams);
  }

  warn(message: unknown, ...optionalParams: unknown[]): void {
    this.write('warn', message, optionalParams);
  }

  debug(message: unknown, ...optionalParams: unknown[]): void {
    this.write('debug', message, optionalParams);
  }

  verbose(message: unknown, ...optionalParams: unknown[]): void {
    this.write('verbose', message, optionalParams);
  }

  private write(level: SupportedLogLevel, message: unknown, optionalParams: unknown[]): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const timestamp = new Date().toISOString();
    const context = this.extractContext(optionalParams);
    const metadata = this.extractMetadata(optionalParams);

    if (this.isProduction) {
      const payload = {
        timestamp,
        level,
        message: this.stringify(message),
        context,
        metadata,
      };

      const output = JSON.stringify(payload);
      this.writeToConsole(level, output);
      return;
    }

    const contextChunk = context ? ` [${context}]` : '';
    const metadataChunk = metadata.length > 0 ? ` ${JSON.stringify(metadata)}` : '';
    const output = `[${timestamp}] [${level.toUpperCase()}]${contextChunk} ${this.stringify(message)}${metadataChunk}`;

    this.writeToConsole(level, output);
  }

  private shouldLog(level: SupportedLogLevel): boolean {
    const levelIndex = SUPPORTED_LOG_LEVELS.indexOf(level);
    return levelIndex <= this.minLevelIndex;
  }

  private writeToConsole(level: SupportedLogLevel, output: string): void {
    if (level === 'error') {
      console.error(output);
      return;
    }

    if (level === 'warn') {
      console.warn(output);
      return;
    }

    if (level === 'debug') {
      console.debug(output);
      return;
    }

    console.log(output);
  }

  private stringify(value: unknown): string {
    if (typeof value === 'string') {
      return value;
    }

    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }

  private extractContext(optionalParams: unknown[]): string | undefined {
    const lastParam = optionalParams[optionalParams.length - 1];
    return typeof lastParam === 'string' ? lastParam : undefined;
  }

  private extractMetadata(optionalParams: unknown[]): unknown[] {
    if (optionalParams.length === 0) {
      return [];
    }

    const context = this.extractContext(optionalParams);
    if (context) {
      return optionalParams.slice(0, -1);
    }

    return optionalParams;
  }
}
