import { Button, Chip, Icon, SelectField, useToast } from "@/shared";
import { useEffect, useMemo, useState } from "react";
import { hrApi, resourceApi } from "@/shared/lib/core";
import { type EmployeeDetail, type OrganizationItem, type TeamOption } from "@stanforte/shared";

export default function EmployeeOrgsTeamsTab({ employee, onSaved }: { employee: EmployeeDetail; onSaved: () => void }) {
    const { showToast } = useToast();
    const [organizations, setOrganizations] = useState<any[]>(employee.organizations || []);
    const [teams, setTeams] = useState<any[]>(employee.teams || []);
    const [allOrganizations, setAllOrganizations] = useState<OrganizationItem[]>([]);
    const [allTeams, setAllTeams] = useState<TeamOption[]>([]);
    const [newOrgId, setNewOrgId] = useState("");
    const [orgIsPrimary, setOrgIsPrimary] = useState(false);
    const [newTeamId, setNewTeamId] = useState("");
    const [teamRole, setTeamRole] = useState<"member" | "lead" | "manager">("member");
    const [actingOrg, setActingOrg] = useState<string | null>(null);
    const [actingTeam, setActingTeam] = useState<string | null>(null);

    // Load organizations and teams for dropdowns
    useEffect(() => {
        Promise.all([
            resourceApi.listOrganizations(),
            resourceApi.listGroups(),
        ])
            .then(([orgs, tms]) => {
                setAllOrganizations(orgs);
                setAllTeams(tms);
            })
            .catch(() => {
                setAllOrganizations([]);
                setAllTeams([]);
            });
    }, []);

    async function handleAddOrg() {
        if (!newOrgId.trim()) {
            showToast({ tone: "warning", title: "Validation", message: "Please select an organization." });
            return;
        }
        try {
            setActingOrg("add");
            await hrApi.addOrganization(employee.id, { organization_id: newOrgId.trim(), is_primary: orgIsPrimary });
            const selectedOrg = allOrganizations.find(o => o.id === newOrgId);
            setOrganizations([...organizations, { id: newOrgId.trim(), name: selectedOrg?.name || newOrgId, is_primary: orgIsPrimary }]);
            setNewOrgId("");
            setOrgIsPrimary(false);
            showToast({ tone: "success", title: "Added", message: orgIsPrimary ? "Primary organization set." : "Organization assigned." });
            onSaved();
        } catch (err: any) {
            showToast({ tone: "danger", title: "Failed", message: err?.message || "Failed to add organization" });
        } finally {
            setActingOrg(null);
        }
    }

    async function handleRemoveOrg(orgId: string) {
        try {
            setActingOrg(orgId);
            await hrApi.removeOrganization(employee.id, orgId);
            setOrganizations(organizations.filter((o) => o.id !== orgId));
            showToast({ tone: "success", title: "Removed", message: "Organization removed." });
            onSaved();
        } catch (err: any) {
            showToast({ tone: "danger", title: "Failed", message: err?.message || "Failed to remove" });
        } finally {
            setActingOrg(null);
        }
    }

    async function handleSetPrimaryOrg(orgId: string) {
        try {
            setActingOrg(orgId);
            await hrApi.addOrganization(employee.id, { organization_id: orgId, is_primary: true });
            setOrganizations(organizations.map((o) => ({ ...o, is_primary: o.id === orgId })));
            showToast({ tone: "success", title: "Updated", message: "Primary organization set." });
            onSaved();
        } catch (err: any) {
            showToast({ tone: "danger", title: "Failed", message: err?.message || "Failed to update" });
        } finally {
            setActingOrg(null);
        }
    }

    async function handleAddTeam() {
        if (!newTeamId.trim()) {
            showToast({ tone: "warning", title: "Validation", message: "Please select a team." });
            return;
        }
        try {
            setActingTeam("add");
            await hrApi.addTeam(employee.id, { team_id: newTeamId.trim(), role: teamRole });
            const selectedTeam = allTeams.find(t => t.id === newTeamId);
            setTeams([...teams, { id: newTeamId.trim(), name: selectedTeam?.name || newTeamId, type: selectedTeam?.groupType, role: teamRole }]);
            setNewTeamId("");
            showToast({ tone: "success", title: "Added", message: "Team assigned." });
            onSaved();
        } catch (err: any) {
            showToast({ tone: "danger", title: "Failed", message: err?.message || "Failed to add team" });
        } finally {
            setActingTeam(null);
        }
    }

    async function handleRemoveTeam(teamId: string) {
        try {
            setActingTeam(teamId);
            await hrApi.removeTeam(employee.id, teamId);
            setTeams(teams.filter((t) => t.id !== teamId));
            showToast({ tone: "success", title: "Removed", message: "Team removed." });
            onSaved();
        } catch (err: any) {
            showToast({ tone: "danger", title: "Failed", message: err?.message || "Failed to remove" });
        } finally {
            setActingTeam(null);
        }
    }

    return (
        <div className="grid gap-6 lg:grid-cols-2">
            {/* Organizations */}
            <div className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-950">Organizations</h3>
                <div className="space-y-2">
                    {organizations.map((org) => (
                        <div key={org.id} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                            <div className="flex items-center gap-2">
                                <p className="text-sm font-semibold text-slate-950">{org.name}</p>
                                {org.is_primary && <Chip variant="success">Primary</Chip>}
                            </div>
                            <div className="flex items-center gap-2">
                                {!org.is_primary && (
                                    <Button
                                        size="sm"
                                        variant="secondary"
                                        onClick={() => void handleSetPrimaryOrg(org.id)}
                                        disabled={actingOrg === org.id}
                                    >
                                        Set Primary
                                    </Button>
                                )}
                                <Button
                                    size="sm"
                                    variant="secondary"
                                    onClick={() => void handleRemoveOrg(org.id)}
                                    disabled={actingOrg === org.id}
                                >
                                    <Icon name="delete" className="text-[16px]" />
                                </Button>
                            </div>
                        </div>
                    ))}
                    {organizations.length === 0 && (
                        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                            No organizations assigned.
                        </div>
                    )}
                </div>

                <div className="flex gap-2">
                    <SelectField
                        label=""
                        value={newOrgId}
                        onChange={(e) => setNewOrgId(e.target.value)}
                        className="flex-1"
                    >
                        <option value="">Select organization</option>
                        {allOrganizations.map(org => (
                            <option key={org.id} value={org.id}>{org.name}</option>
                        ))}
                    </SelectField>
                    <label className="flex items-center gap-2 px-2 text-xs whitespace-nowrap border rounded">
                        <input
                            type="checkbox"
                            checked={orgIsPrimary}
                            onChange={(e) => setOrgIsPrimary(e.target.checked)}
                        />
                        Primary
                    </label>
                    <Button onClick={() => void handleAddOrg()} disabled={actingOrg === "add"}>
                        <Icon name="add" className="text-[18px]" />
                    </Button>
                </div>
            </div>

            {/* Teams */}
            <div className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-950">Teams</h3>
                <div className="space-y-2">
                    {teams.map((team) => (
                        <div key={team.id} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                            <div>
                                <p className="text-sm font-semibold text-slate-950">{team.name}</p>
                                {team.role && (
                                    <Chip variant={
                                        team.role === 'lead' ? 'warning' :
                                            team.role === 'manager' ? 'success' :
                                                'neutral'
                                    }>
                                        {team.role.charAt(0).toUpperCase() + team.role.slice(1)}
                                    </Chip>
                                )}
                            </div>
                            <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => void handleRemoveTeam(team.id)}
                                disabled={actingTeam === team.id}
                            >
                                <Icon name="delete" className="text-[16px]" />
                            </Button>
                        </div>
                    ))}
                    {teams.length === 0 && (
                        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                            No teams assigned.
                        </div>
                    )}
                </div>

                <div className="space-y-2">
                    <SelectField
                        label=""
                        value={newTeamId}
                        onChange={(e) => setNewTeamId(e.target.value)}
                    >
                        <option value="">Select team</option>
                        {allTeams.map(team => (
                            <option key={team.id} value={team.id}>{team.name}</option>
                        ))}
                    </SelectField>
                    <SelectField
                        label=""
                        value={teamRole}
                        onChange={(e) => setTeamRole(e.target.value as 'member' | 'lead' | 'manager')}
                    >
                        <option value="member">Member</option>
                        <option value="lead">Lead</option>
                        <option value="manager">Manager</option>
                    </SelectField>
                    <Button onClick={() => void handleAddTeam()} disabled={actingTeam === "add"} className="w-full">
                        Add Team
                    </Button>
                </div>
            </div>
        </div>
    );
}
