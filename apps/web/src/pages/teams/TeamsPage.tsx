import { useState, useMemo } from "react";
import { Link, useNavigate } from "@/shared/router-adapter";
import { PortalLayout, useWorkspace } from "@/components/layout/PortalLayout";
import { useAuth } from "@/shared/context/AuthProvider";
import { PageHeader } from "@/shared";
import { useCachedQuery } from "@/shared/lib/core";
import { getWorkspaceProfile } from "@/shared/api/workspace-api";
import {
  Users,
  Building2,
  Shield,
  Layers,
  Search,
  Filter,
  ArrowRight,
  ChevronRight,
  UserCheck,
  Crown,
  Briefcase,
} from "lucide-react";

export default function TeamsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { mode, isAdmin } = useWorkspace();
  const isAdminView = mode === "admin" && isAdmin;
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState("all");

  const { data: profile, loading: profileLoading } = useCachedQuery(
    "user:profile",
    () => getWorkspaceProfile(),
    { ttlMs: 60_000, storage: "memory" }
  );

  const groups: any[] = profile?.groups ?? profile?.teams ?? [];

  const departmentsCount = groups.filter(
    (g: any) => String(g.type || "").toLowerCase() === "department"
  ).length;

  const leadRolesCount = groups.filter((g: any) =>
    ["lead", "moderator", "manager", "admin", "owner"].includes(
      String(g.role || "").toLowerCase()
    )
  ).length;

  const groupTypes = useMemo(() => {
    const set = new Set<string>();
    groups.forEach((g: any) => {
      if (g.type) set.add(String(g.type).toLowerCase());
    });
    return ["all", ...Array.from(set).sort()];
  }, [groups]);

  const filteredGroups = useMemo(() => {
    return groups.filter((g: any) => {
      const matchesSearch =
        !searchQuery ||
        g.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        g.type?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType =
        selectedType === "all" ||
        String(g.type || "").toLowerCase() === selectedType;
      return matchesSearch && matchesType;
    });
  }, [groups, searchQuery, selectedType]);

  return (
    <PortalLayout activeNav="Teams & Groups">
      <div className="space-y-6">
        {/* Modern Unified Page Header (No Breadcrumbs) */}
        <PageHeader
          title="Teams & Departments"
          description="Browse organizational departments, cross-functional squads, project committees, and your team rosters."
          icon={Users}
          iconColor="bg-neutral-100 text-neutral-700"
          actions={
            isAdminView ? (
              <Link
                to="/admin/groups"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-medium transition shadow-sm active:scale-[0.98]"
              >
                <Building2 className="h-4 w-4" />
                <span>Manage Groups</span>
              </Link>
            ) : null
          }
        />

        {/* 4 KPI Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
          {/* Card 1: Enrolled Groups */}
          <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-white border border-neutral-200/80 shadow-sm flex flex-col justify-between gap-2 sm:gap-3">
            <div className="flex items-center justify-between gap-1.5">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-orange-50 text-[#C2410C] flex items-center justify-center shrink-0">
                <Users className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
              <div className="text-[10px] sm:text-xs font-medium text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded-full">
                Active
              </div>
            </div>
            <div>
              <div className="text-[11px] sm:text-xs font-semibold text-neutral-500 truncate">My Memberships</div>
              <div className="text-lg sm:text-xl font-semibold text-neutral-900 mt-0.5">{groups.length}</div>
            </div>
          </div>

          {/* Card 2: Departments */}
          <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-white border border-neutral-200/80 shadow-sm flex flex-col justify-between gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-neutral-100 text-neutral-700 flex items-center justify-center shrink-0">
              <Building2 className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div>
              <div className="text-[11px] sm:text-xs font-semibold text-neutral-500 truncate">Departments</div>
              <div className="text-lg sm:text-xl font-semibold text-neutral-900 mt-0.5">{departmentsCount}</div>
            </div>
          </div>

          {/* Card 3: Leadership Positions */}
          <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-white border border-neutral-200/80 shadow-sm flex flex-col justify-between gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-neutral-100 text-neutral-700 flex items-center justify-center shrink-0">
              <Crown className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div>
              <div className="text-[11px] sm:text-xs font-semibold text-neutral-500 truncate">Lead / Manager</div>
              <div className="text-lg sm:text-xl font-semibold text-neutral-700 mt-0.5">{leadRolesCount}</div>
            </div>
          </div>

          {/* Card 4: Squads & Committees */}
          <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-white border border-neutral-200/80 shadow-sm flex flex-col justify-between gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <Layers className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div>
              <div className="text-[11px] sm:text-xs font-semibold text-neutral-500 truncate">Committees & Squads</div>
              <div className="text-lg sm:text-xl font-semibold text-emerald-600 mt-0.5">
                {groups.length - departmentsCount}
              </div>
            </div>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="p-4 rounded-2xl bg-white border border-neutral-200/80 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400" />
            <input
              type="text"
              placeholder="Filter teams by name or unit..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-neutral-50 rounded-xl border border-neutral-200 text-neutral-800 placeholder-neutral-400 focus:outline-none focus:border-[#C2410C] focus:ring-1 focus:ring-[#C2410C]"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto scrollbar-none pb-1 sm:pb-0">
            <Filter className="h-3.5 w-3.5 text-neutral-400 shrink-0" />
            <div className="flex items-center gap-1 bg-neutral-100 p-1 rounded-xl text-xs font-semibold text-neutral-600">
              {groupTypes.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setSelectedType(t)}
                  className={`px-3 py-1 rounded-lg capitalize transition-colors whitespace-nowrap ${
                    selectedType === t
                      ? "bg-white text-neutral-900 shadow-sm font-medium"
                      : "text-neutral-500 hover:text-neutral-800"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Groups Grid Cards */}
        {profileLoading ? (
          <div className="p-12 text-center text-xs font-medium text-neutral-400 bg-white rounded-2xl border border-neutral-200/80">
            Loading team assignments...
          </div>
        ) : filteredGroups.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-neutral-200/80 shadow-sm">
            <Users className="h-8 w-8 text-neutral-300 mx-auto mb-2" />
            <p className="text-xs font-medium text-neutral-700">No teams found</p>
            <p className="text-xs text-neutral-400 mt-0.5">
              {searchQuery
                ? "No teams match your search keyword."
                : "Your account is not assigned to any organizational teams."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredGroups.map((group: any) => {
              const isLead = ["lead", "moderator", "manager", "admin", "owner"].includes(
                String(group.role || "").toLowerCase()
              );

              return (
                <div
                  key={group.id}
                  onClick={() => navigate(`/teams/${group.id}`)}
                  className="p-5 rounded-2xl bg-white border border-neutral-200/80 hover:border-[#C2410C]/50 hover:shadow-md transition-colors duration-200 flex flex-col justify-between cursor-pointer group"
                >
                  <div>
                    {/* Top Type & Role Badges */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-neutral-100 text-neutral-600">
                        {group.type || "Team"}
                      </span>

                      <div className="flex items-center gap-1.5">
                        {group.is_primary && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Primary
                          </span>
                        )}
                        {group.role && (
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
                              isLead
                                ? "bg-neutral-100 text-neutral-700 border border-neutral-200"
                                : "bg-neutral-100 text-neutral-700 border border-neutral-200"
                            }`}
                          >
                            {group.role}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Team Icon & Name */}
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-xl bg-orange-50 text-[#C2410C] flex items-center justify-center font-semibold group-hover:bg-[#C2410C] group-hover:text-white transition-colors shrink-0">
                        <Users className="h-5 w-5" />
                      </div>
                      <h3 className="font-medium text-neutral-900 group-hover:text-[#C2410C] transition-colors truncate">
                        {group.name}
                      </h3>
                    </div>

                    <p className="text-xs text-neutral-500 line-clamp-2 mt-1">
                      {group.description || "Active departmental and cross-functional work unit."}
                    </p>
                  </div>

                  {/* Footer Action */}
                  <div className="pt-4 mt-4 border-t border-neutral-100 flex items-center justify-between text-xs">
                    <span className="text-xs font-medium text-neutral-400">
                      ID: {String(group.id).slice(0, 8)}...
                    </span>
                    <span className="font-medium text-[#C2410C] flex items-center gap-1 transition-transform">
                      <span>Open Workspace</span>
                      <ArrowRight className="h-3 w-3" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </PortalLayout>
  );
}
