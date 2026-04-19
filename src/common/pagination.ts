export interface PaginatedResponse<T> {
  total: number;
  page: number;
  limit: number;
  data: T[];
}

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;

export function paginate<T>(
  data: T[],
  page?: number,
  limit?: number,
): PaginatedResponse<T> {
  const normalizedPage = page ?? DEFAULT_PAGE;
  const normalizedLimit = limit ?? DEFAULT_LIMIT;
  const start = (normalizedPage - 1) * normalizedLimit;
  const end = start + normalizedLimit;

  return {
    total: data.length,
    page: normalizedPage,
    limit: normalizedLimit,
    data: data.slice(start, end),
  };
}

export function sortItems<T extends Record<string, any>>(
  data: T[],
  sortBy?: string,
  order: 'asc' | 'desc' = 'asc',
  allowedFields: string[] = [],
): T[] {
  if (
    !sortBy ||
    (allowedFields.length > 0 && !allowedFields.includes(sortBy))
  ) {
    return [...data];
  }

  const direction = order === 'asc' ? 1 : -1;

  return [...data].sort((a, b) => {
    const left = a[sortBy];
    const right = b[sortBy];

    if (left === right) {
      return 0;
    }

    if (left == null) {
      return 1 * direction;
    }

    if (right == null) {
      return -1 * direction;
    }

    if (typeof left === 'number' && typeof right === 'number') {
      return (left - right) * direction;
    }

    return String(left).localeCompare(String(right)) * direction;
  });
}

export function shouldPaginate(page?: number, limit?: number): boolean {
  return page !== undefined || limit !== undefined;
}
