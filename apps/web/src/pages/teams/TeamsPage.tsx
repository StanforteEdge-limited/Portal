import { useNavigate } from "react-router-dom";
import {
  AppShell,
  PageHeader,
  SectionCard,
} from "@/shared";
import { useAuth } from "@/shared/context/AuthProvider";
import { useCachedQuery } from "@/shared/lib/core";
import { buildAppNavigation, buildAppMobileNav } from "@/shared/navigation";
import { getWorkspaceProfile } from "@/shared/api/workspace-api";

const cardStyle: React.CSSProperties = {
  border: "1px solid #e2e8f0",
  borderRadius: "8px",
  padding: "16px",
  cursor: "pointer",
  transition: "box-shadow 0.15s",
};

export default function TeamsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const userName =
    `${user?.first_name || ""} ${user?.last_name || ""}`.trim() ||
    user?.email ||
    "Staff";

  const { data: profile } = useCachedQuery(
    "user:profile",
    () => getWorkspaceProfile(),
    { ttlMs: 60_000, storage: "memory" },
  );

  const groups = profile?.groups ?? profile?.teams ?? [];
  const grouped = groups.reduce<Record<string, any[]>>((acc, group) => {
    const type = String(group.type || "other");
    acc[type] ??= [];
    acc[type].push(group);
    return acc;
  }, {});
  const groupTypes = Object.keys(grouped).sort((a, b) => a.localeCompare(b));

  return (
    <AppShell
      navigation={buildAppNavigation()}
      activeLabel="workspace-groups"
      user={{ name: userName, role: profile?.employee_profile?.job_title || "Staff" }}
      mobileNav={buildAppMobileNav("Workspace")}
    >
      <PageHeader
        breadcrumbs={[{ label: "Workspace" }, { label: "Groups" }]}
        title="Groups"
        description="Browse your departments, teams, committees, clubs, and other shared work groups."
      />

      {groups.length === 0 ? (
        <SectionCard title="No Groups" description="You are not assigned to any groups yet.">
          <div style={{ textAlign: "center", padding: "24px", color: "#94a3b8", fontSize: "14px" }}>
            Group assignments will appear here once configured by your administrator.
          </div>
        </SectionCard>
      ) : (
        <div style={{ display: "grid", gap: "16px" }}>
          {groupTypes.map((type) => (
            <SectionCard
              key={type}
              title={type.charAt(0).toUpperCase() + type.slice(1)}
              description={`Groups categorized as ${type}.`}
            >
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "12px" }}>
                {grouped[type].map((group: any) => (
                  <div
                    key={group.id}
                    style={cardStyle}
                    onClick={() => navigate(`/teams/${group.id}`)}
                    onMouseEnter={(e) => {
                      const el = e.currentTarget;
                      el.style.boxShadow = "0 2px 8px rgba(0,0,0,0.08)";
                    }}
                    onMouseLeave={(e) => {
                      const el = e.currentTarget;
                      el.style.boxShadow = "none";
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                      <span style={{ fontSize: "20px", color: "#2563eb" }} className="material-symbols-outlined">groups</span>
                      <span style={{ fontSize: "15px", fontWeight: 600, color: "#1e293b" }}>{group.name}</span>
                    </div>
                    <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                      <span style={{
                        display: "inline-block", padding: "2px 8px", fontSize: "11px", fontWeight: 600,
                        borderRadius: "10px", background: "#dbeafe", color: "#1e40af",
                      }}>
                        {group.type || "other"}
                      </span>
                      {group.role ? (
                        <span style={{
                          display: "inline-block", padding: "2px 8px", fontSize: "11px", fontWeight: 600,
                          borderRadius: "10px", background: "#f1f5f9", color: "#475569",
                        }}>
                          {group.role}
                        </span>
                      ) : null}
                      {group.is_primary ? (
                        <span style={{
                          display: "inline-block", padding: "2px 8px", fontSize: "11px", fontWeight: 600,
                          borderRadius: "10px", background: "#ecfccb", color: "#3f6212",
                        }}>
                          Primary
                        </span>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>
          ))}
        </div>
      )}
    </AppShell>
  );
}
