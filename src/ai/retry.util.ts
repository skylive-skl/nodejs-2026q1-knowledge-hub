export type RetryOptions<E = unknown> = {
  retryCount: number;
  retryBaseDelayMs: number;
  /** Return true → throw immediately, do NOT retry */
  isAbort: (error: E) => boolean;
  /** Return true → eligible for retry */
  isRetryable: (error: E) => boolean;
  /** Transform unknown/exhausted error to a domain error */
  toFinalError: (error: E) => Error;
  onRetry?: (attempt: number, error: E) => void;
  onSuccess?: (attempt: number) => void;
};

export async function withRetry<T, E = unknown>(
  fn: () => Promise<T>,
  options: RetryOptions<E>,
): Promise<T> {
  const {
    retryCount,
    retryBaseDelayMs,
    isAbort,
    isRetryable,
    toFinalError,
    onRetry,
    onSuccess,
  } = options;

  let lastError: E | undefined;

  for (let attempt = 0; attempt <= retryCount; attempt++) {
    if (attempt > 0) {
      const delayMs = retryBaseDelayMs * Math.pow(2, attempt - 1);
      await delay(delayMs);
    }

    try {
      const result = await fn();
      onSuccess?.(attempt);
      return result;
    } catch (error) {
      const err = error as E;

      if (isAbort(err)) {
        throw err;
      }

      if (isRetryable(err) && attempt < retryCount) {
        lastError = err;
        onRetry?.(attempt, err);
        continue;
      }

      throw toFinalError(err);
    }
  }

  throw toFinalError(lastError as E);
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
