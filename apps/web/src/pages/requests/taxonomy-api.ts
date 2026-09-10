import { httpRequest } from "@/shared/lib/core";

export type ManagedTaxonomy = {
  id: string;
  key: string;
  name: string;
  description?: string | null;
  module: string | null;
  render_type: string;
  renderType: string;
  is_active: boolean;
  terms: Array<{ id: string; value: string; label: string; is_active: boolean }>;
};

export type TagTerm = {
  id: string;
  value: string;
  label: string;
  is_active?: boolean;
};

function mapTagTerm(row: any): TagTerm {
  return {
    id: String(row.id),
    value: String(row.value),
    label: String(row.label),
    is_active: Boolean(row.is_active ?? row.isActive ?? true),
  };
}

export async function createTaxonomy(payload: { key: string; name: string; description?: string; module?: string; render_type?: string }) {
  const res = await httpRequest<any>("/taxonomy/taxonomies", {
    method: "POST",
    body: payload,
  });
  return res;
}

export async function updateTaxonomy(id: string, payload: { key?: string; name?: string; description?: string; module?: string; render_type?: string; is_active?: boolean }) {
  const res = await httpRequest<any>(`/taxonomy/taxonomies/${id}`, {
    method: "POST",
    body: payload,
  });
  return res;
}

export async function deleteTaxonomy(id: string) {
  const res = await httpRequest<any>(`/taxonomy/taxonomies/${id}`, {
    method: "DELETE",
  });
  return res;
}

export async function syncTaxonomyTerms(id: string, terms: string[]) {
  const res = await httpRequest<any>(`/taxonomy/taxonomies/${id}/terms/sync`, {
    method: "POST",
    body: { terms },
  });
  return res;
}

export async function listManagedTaxonomies(params?: { include_inactive?: boolean; module?: string }) {
  const query = new URLSearchParams();
  if (params?.include_inactive) query.set("include_inactive", "true");
  if (params?.module) query.set("module", params.module);
  const suffix = query.toString() ? `?${query.toString()}` : "";
  const res = await httpRequest<any>(`/taxonomy/taxonomies${suffix}`);
  const rows = (res as any)?.data?.items ?? [];
  return rows.map((row: any) => ({
    id: String(row.id),
    key: String(row.key),
    name: String(row.name),
    description: row.description ?? null,
    module: row.module ?? null,
    render_type: row.render_type ?? row.renderType ?? "select",
    renderType: row.renderType ?? row.render_type ?? "select",
    is_active: Boolean(row.is_active ?? row.isActive ?? true),
    terms: (row.terms ?? []).map((term: any) => ({
      id: String(term.id),
      value: String(term.value),
      label: String(term.label),
      is_active: Boolean(term.is_active ?? term.isActive ?? true),
    })),
  })) as ManagedTaxonomy[];
}

export async function suggestTagTerms(taxonomyKey: string, query?: string) {
  const suffix = query ? `?q=${encodeURIComponent(query)}` : "";
  const res = await httpRequest<any>(`/taxonomy/tags/${taxonomyKey}/suggest${suffix}`);
  const rows = (res as any)?.data?.items ?? [];
  return rows.map(mapTagTerm);
}

export async function replaceEntityTags(
  entityType: string,
  entityId: string,
  taxonomyKey: string,
  payload: { term_ids?: string[]; labels?: string[]; module?: string }
) {
  const query = new URLSearchParams();
  if (payload.module) query.set("module", payload.module);
  const suffix = query.toString() ? `?${query.toString()}` : "";
  return httpRequest<{ taxonomy: unknown; tags: TagTerm[] }>(
    `/taxonomy/tags/${entityType}/${entityId}/${taxonomyKey}${suffix}`,
    {
      method: "POST",
      body: {
        term_ids: payload.term_ids ?? [],
        labels: payload.labels ?? [],
      },
    }
  );
}

export async function listEntityTags(entityType: string, entityId: string, taxonomyKey: string) {
  return httpRequest<{ taxonomy: unknown; tags: TagTerm[] }>(
    `/taxonomy/tags/${entityType}/${entityId}/${taxonomyKey}`
  );
}
