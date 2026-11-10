import { httpRequest } from "@/shared/lib/core";
import type {
  CreateTaxonomy,
  UpdateTaxonomy,
  TagTerm,
  SyncTaxonomyTerms,
  ReplaceEntityTags,
} from "@stanforte/contract";

export type { TagTerm, CreateTaxonomy, UpdateTaxonomy };

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

function mapTagTerm(row: any): TagTerm {
  return {
    id: String(row.id),
    value: String(row.value ?? row.label ?? ""),
    label: String(row.label ?? row.value ?? ""),
    is_active: Boolean(row.is_active ?? row.isActive ?? true),
  };
}

export async function createTaxonomy(payload: CreateTaxonomy) {
  return httpRequest<any>("/taxonomy", {
    method: "POST",
    body: payload,
  });
}

export async function updateTaxonomy(id: string, payload: UpdateTaxonomy) {
  return httpRequest<any>(`/taxonomy/${id}`, {
    method: "PUT",
    body: payload,
  });
}

export async function deleteTaxonomy(id: string) {
  return httpRequest<any>(`/taxonomy/${id}`, {
    method: "DELETE",
  });
}

export async function syncTaxonomyTerms(idOrKey: string, terms: string[]) {
  return httpRequest<any>(`/taxonomy/${idOrKey}/terms/sync`, {
    method: "POST",
    body: { terms } satisfies SyncTaxonomyTerms,
  });
}

export async function listManagedTaxonomies(params?: { include_inactive?: boolean; module?: string }) {
  const query = new URLSearchParams();
  if (params?.include_inactive) query.set("include_inactive", "true");
  if (params?.module) query.set("module", params.module);
  const suffix = query.toString() ? `?${query.toString()}` : "";
  const res = await httpRequest<any>(`/taxonomy${suffix}`);
  const rows = (res as any)?.data?.items ?? (res as any)?.items ?? (Array.isArray(res) ? res : []);
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
      value: String(term.value ?? term.label ?? ""),
      label: String(term.label ?? term.value ?? ""),
      is_active: Boolean(term.is_active ?? term.isActive ?? true),
    })),
  })) as ManagedTaxonomy[];
}

export async function suggestTagTerms(taxonomyKey: string, query?: string) {
  const suffix = query ? `?query=${encodeURIComponent(query)}` : "";
  const res = await httpRequest<any>(`/taxonomy/${taxonomyKey}/terms/suggest${suffix}`);
  const rows = (res as any)?.data?.items ?? (res as any)?.items ?? (Array.isArray(res) ? res : []);
  return rows.map(mapTagTerm);
}

export async function replaceEntityTags(
  entityType: string,
  entityId: string,
  taxonomyKey: string,
  payload: ReplaceEntityTags & { module?: string },
) {
  const query = new URLSearchParams();
  if (payload.module) query.set("module", payload.module);
  const suffix = query.toString() ? `?${query.toString()}` : "";
  const { module, ...body } = payload;
  return httpRequest<{ taxonomy: unknown; tags: TagTerm[] }>(
    `/taxonomy/entities/${entityType}/${entityId}/tags/${taxonomyKey}${suffix}`,
    {
      method: "PUT",
      body,
    },
  );
}

export async function listEntityTags(entityType: string, entityId: string, taxonomyKey: string) {
  return httpRequest<{ taxonomy: unknown; tags: TagTerm[] }>(
    `/taxonomy/entities/${entityType}/${entityId}/tags/${taxonomyKey}`,
  );
}
