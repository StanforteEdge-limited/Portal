import { useCachedQuery, hrApi } from "@/shared/lib/core";

export interface WorkspaceColleague {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar: string;
}

function makeInitials(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .map((p) => p[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "ST"
  );
}

/**
 * Fetches real active colleagues for the current workspace from the HR Employees API.
 */
export function useColleagues() {
  const { data, loading } = useCachedQuery<WorkspaceColleague[]>(
    "workspace:colleagues:active",
    async () => {
      try {
        const res = await hrApi.listEmployees({ status: "active", per_page: 100 });
        const raw =
          (res as any)?.data?.items ??
          (res as any)?.items ??
          (res as any)?.result ??
          (res as any)?.data ??
          (Array.isArray(res) ? res : []);
        if (!Array.isArray(raw)) return [];

        const seen = new Set<string>();
        const formatted: WorkspaceColleague[] = [];
        for (const item of raw) {
          const profile = item?.profile ?? item;
          const id = String(profile?.id ?? item?.profile_id ?? item?.id ?? "");
          if (!id || seen.has(id)) continue;
          seen.add(id);
          const name =
            `${profile?.first_name ?? profile?.firstName ?? ""} ${profile?.last_name ?? profile?.lastName ?? ""}`.trim() ||
            profile?.name ||
            profile?.username ||
            profile?.email ||
            "Colleague";
          formatted.push({
            id,
            name,
            email: String(profile?.email ?? ""),
            role: String(
              item?.designation?.title ??
                item?.job_title ??
                item?.jobTitle ??
                profile?.occupation ??
                profile?.role ??
                "Team Member",
            ),
            avatar: makeInitials(name),
          });
        }
        return formatted;
      } catch {
        return [];
      }
    },
    { ttlMs: 1000 * 60 * 5, storage: "memory" },
  );

  return {
    colleagues: data ?? [],
    loading,
  };
}
