export function paginatedResponse<T>(items: T[], meta: { page: number; per_page: number; total: number }) {
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