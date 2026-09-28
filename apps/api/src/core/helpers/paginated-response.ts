import type { PaginatedListResponse } from '@stanforte/contract';

/**
 * Builds the standard list envelope: `{ success, data: { items, meta } }`.
 *
 * The response interceptor leaves this untouched because it already carries a
 * boolean `success`, so the shape below is exactly what reaches the client and
 * is kept in sync with the contract package via `PaginatedListResponse`.
 */
export function paginatedResponse<T>(
  items: T[],
  meta: { page: number; per_page: number; total: number },
): PaginatedListResponse<T> {
  return {
    success: true,
    data: {
      items,
      meta: {
        page: meta.page,
        per_page: meta.per_page,
        total: meta.total,
        pages: Math.ceil(meta.total / meta.per_page),
      },
    },
  };
}
