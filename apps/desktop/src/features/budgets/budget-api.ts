import { financeApi } from '@/shared/lib/core';

export const budgetApi = {
  list: (query?: Record<string, unknown>) =>
    financeApi.listBudgets(query) as Promise<Record<string, unknown>[]>,

  get: (id: string) =>
    financeApi.getBudget(id) as Promise<Record<string, unknown>>,

  create: (payload: Record<string, unknown>) =>
    financeApi.createBudget(payload) as Promise<Record<string, unknown>>,

  update: (id: string, payload: Record<string, unknown>) =>
    financeApi.updateBudget(id, payload) as Promise<Record<string, unknown>>,

  revisions: (budgetId: string) =>
    financeApi.listBudgetRevisions(budgetId),

  submitRevision: (revisionId: string, payload?: Record<string, unknown>) =>
    financeApi.submitBudgetRevision(revisionId, payload),

  approveRevision: (revisionId: string, payload?: Record<string, unknown>) =>
    financeApi.approveBudgetRevision(revisionId, payload),

  rejectRevision: (revisionId: string, payload?: Record<string, unknown>) =>
    financeApi.rejectBudgetRevision(revisionId, payload),

  returnRevision: (revisionId: string, payload?: Record<string, unknown>) =>
    financeApi.returnBudgetRevision(revisionId, payload),

  copy: (id: string, payload?: Record<string, unknown>) =>
    financeApi.copyBudget(id, payload),
};
