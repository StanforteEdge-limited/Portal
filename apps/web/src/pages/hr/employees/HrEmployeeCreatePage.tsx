import {
    Button,
    Icon,
    PageHeader,
    SectionCard,
    SelectField,
    TextField,
    WorkflowStepper,
    useToast,
} from "@/shared";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppShell } from "@/shared/components/layout/AppShell";
import { useAuth } from "@/shared/context/AuthProvider";
import { hrApi, resourceApi, adminUsersApi, useCachedQuery } from "@/shared/lib/core";
import { type EmploymentType, type OrganizationItem } from "@stanforte/shared";
import { buildAppNavigation, buildAppMobileNav } from "@/shared/navigation";
import { getWorkspaceProfile } from "@/shared/api/workspace-api";

type SearchMode = "search" | "results" | "request" | "create";

interface SearchResult {
    id: string;
    email: string;
    first_name?: string | null;
    last_name?: string | null;
    status: string;
    type: string;
}

export default function HrEmployeeCreatePage() {
    const { user } = useAuth();
    const { data: profile } = useCachedQuery(
        "hr:profile:create",
        () => getWorkspaceProfile(),
        { ttlMs: 1000 * 60, storage: "memory" },
    );

    const { showToast } = useToast();
    const navigate = useNavigate();

    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
    const [searching, setSearching] = useState(false);
    const [searchMode, setSearchMode] = useState<SearchMode>("search");
    const [selectedUser, setSelectedUser] = useState<SearchResult | null>(null);

    const [organizations, setOrganizations] = useState<OrganizationItem[]>([]);
    const [primaryOrgId, setPrimaryOrgId] = useState("");
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [email, setEmail] = useState("");
    const [jobTitle, setJobTitle] = useState("");
    const [employmentType, setEmploymentType] = useState<EmploymentType>("full_time");
    const [hireDate, setHireDate] = useState(new Date().toISOString().slice(0, 10));
    const [submitting, setSubmitting] = useState(false);
    const [apiError, setApiError] = useState<string | null>(null);

    useEffect(() => {
        resourceApi.listOrganizations()
            .then(setOrganizations)
            .catch(() => setOrganizations([]));
    }, []);

    const userName =
        `${user?.first_name || ""} ${user?.last_name || ""}`.trim() ||
        user?.email ||
        "HR Staff";

    const handleSearch = async () => {
        if (!searchQuery.trim()) return;
        setSearching(true);
        setApiError(null);
        try {
            const results = await adminUsersApi.searchUsers(searchQuery.trim());
            setSearchResults(results);
            setSearchMode("results");
        } catch {
            setSearchResults([]);
            setSearchMode("results");
        } finally {
            setSearching(false);
        }
    };

    const handleSelectUser = (result: SearchResult) => {
        setSelectedUser(result);
        setFirstName(result.first_name || "");
        setLastName(result.last_name || "");
        setEmail(result.email);
        setSearchMode("create");
    };

    const handleRequestAdmin = () => {
        setSearchMode("request");
    };

    const handleRequestSubmit = async () => {
        setApiError(null);

        if (!firstName.trim() || !lastName.trim() || !email.trim()) {
            showToast({
                tone: "warning",
                title: "Validation error",
                message: "Name and email are required.",
            });
            return;
        }

        try {
            setSubmitting(true);
            const api = adminUsersApi as any;
            await api.createUser({
                email: email.trim(),
                first_name: firstName.trim(),
                last_name: lastName.trim(),
                type: "staff",
                status: "pending_invite",
                organization_id: primaryOrgId || undefined,
            });

            showToast({
                tone: "success",
                title: "Request submitted",
                message: "Admin has been notified to create this user.",
            });

            navigate("/hr/employees", { replace: true });
        } catch (err: any) {
            const message = err?.message || err?.error?.message || "Failed to submit request";
            setApiError(message);
            showToast({
                tone: "danger",
                title: "Request failed",
                message,
            });
        } finally {
            setSubmitting(false);
        }
    };

    async function handleCreateEmployee() {
        setApiError(null);

        if (!firstName.trim() || !lastName.trim() || !email.trim() || !jobTitle.trim() || !hireDate || !primaryOrgId) {
            showToast({
                tone: "warning",
                title: "Validation error",
                message: "All fields are required, including primary organization.",
            });
            return;
        }

        try {
            setSubmitting(true);
            const result = await hrApi.createEmployee({
                first_name: firstName.trim(),
                last_name: lastName.trim(),
                email: email.trim(),
                job_title: jobTitle.trim(),
                employment_type: employmentType,
                hire_date: hireDate,
                primary_organization_id: primaryOrgId,
            });

            showToast({
                tone: "success",
                title: "Employee created",
                message: `${firstName} ${lastName} has been added. Complete their profile below.`,
            });

            navigate(`/hr/employees/${result.id}`, { replace: true });
        } catch (err: any) {
            const message = err?.message || err?.error?.message || "Failed to create employee";
            setApiError(message);
            showToast({
                tone: "danger",
                title: "Create failed",
                message,
            });
        } finally {
            setSubmitting(false);
        }
    }

    const resetSearch = () => {
        setSearchQuery("");
        setSearchResults([]);
        setSelectedUser(null);
        setSearchMode("search");
        setFirstName("");
        setLastName("");
        setEmail("");
        setJobTitle("");
    };

    return (
        <AppShell
            navigation={buildAppNavigation()}
            activeLabel="hr-employees"
            user={{
                name: userName,
                role: profile?.employee_profile?.job_title || "HR Staff",
            }}
            mobileNav={buildAppMobileNav("Employees")}
        >
            <PageHeader
                breadcrumbs={[
                    { label: "Dashboard", path: "/" },
                    { label: "HR", path: "/hr" },
                    { label: "Employees", path: "/hr/employees" },
                    { label: "New" },
                ]}
                title="Add Employee"
                description="Create a new employee account and send an invite."
            />

            <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
                <SectionCard title="Progress">
                    <WorkflowStepper
                        steps={[
                            { label: "Search", detail: "Find existing user", status: searchMode === "search" ? "current" : "complete" },
                            { label: "Details", detail: "Complete employee info", status: searchMode === "search" ? "upcoming" : "current" },
                        ]}
                    />
                </SectionCard>

                <SectionCard
                    title={searchMode === "search" ? "Step 1 — Search User" : searchMode === "results" ? "Step 1 — Search Results" : searchMode === "request" ? "Request Admin to Create User" : "Step 2 — Employee Details"}
                    description={searchMode === "search" ? "Search for an existing user by name or email." : searchMode === "results" ? "Select a user or request a new one." : "Fill in the details for the new user request."}
                >
                    {apiError && (
                        <div className="mb-4 rounded-2xl border border-danger/20 bg-danger/10 px-4 py-4 text-sm text-danger">
                            {apiError}
                        </div>
                    )}

                    {searchMode === "search" && (
                        <div className="max-w-2xl">
                            <div className="flex gap-3">
                                <TextField
                                    label="Search by name or email"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="john.doe or john@company.com"
                                    className="flex-1"
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                            void handleSearch();
                                        }
                                    }}
                                />
                                <div className="pt-5">
                                    <Button
                                        onClick={() => void handleSearch()}
                                        disabled={searching || !searchQuery.trim()}
                                    >
                                        {searching ? "Searching..." : "Search"}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}

                    {searchMode === "results" && (
                        <div className="max-w-2xl">
                            {searchResults.length > 0 ? (
                                <div className="space-y-2">
                                    <p className="text-sm text-muted mb-3">Found {searchResults.length} user(s). Select one to continue:</p>
                                    {searchResults.map((result) => (
                                        <div
                                            key={result.id}
                                            className="flex items-center justify-between rounded-xl border border-border p-3 hover:bg-muted/50 cursor-pointer transition-colors"
                                            onClick={() => handleSelectUser(result)}
                                        >
                                            <div>
                                                <div className="font-medium">
                                                    {result.first_name} {result.last_name}
                                                </div>
                                                <div className="text-sm text-muted">{result.email}</div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className={`text-xs px-2 py-1 rounded-full ${result.status === "active" ? "bg-success/10 text-success" : "bg-muted text-muted"}`}>
                                                    {result.status}
                                                </span>
                                                <Icon name="chevron_right" className="text-muted" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-6">
                                    <p className="text-muted mb-4">No users found matching "{searchQuery}"</p>
                                    <Button onClick={handleRequestAdmin}>
                                        <Icon name="person_add" className="text-[18px] mr-2" />
                                        Request Admin to Create User
                                    </Button>
                                </div>
                            )}
                            <Button
                                variant="secondary"
                                className="mt-4"
                                onClick={resetSearch}
                            >
                                Search Again
                            </Button>
                        </div>
                    )}

                    {(searchMode === "create" || searchMode === "request") && (
                        <div className="grid gap-4 max-w-2xl">
                            {selectedUser && (
                                <div className="rounded-xl bg-muted/50 p-3 mb-2">
                                    <div className="flex items-center gap-2 text-sm">
                                        <Icon name="person" className="text-muted" />
                                        <span>Selected: {selectedUser.first_name} {selectedUser.last_name} ({selectedUser.email})</span>
                                    </div>
                                </div>
                            )}

                            <div className="grid gap-4 sm:grid-cols-2">
                                <TextField
                                    label="First Name"
                                    value={firstName}
                                    onChange={(e) => setFirstName(e.target.value)}
                                    placeholder="John"
                                />
                                <TextField
                                    label="Last Name"
                                    value={lastName}
                                    onChange={(e) => setLastName(e.target.value)}
                                    placeholder="Doe"
                                />
                            </div>

                            <TextField
                                label="Email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="john.doe@company.com"
                                disabled={!!selectedUser}
                            />

                            <TextField
                                label="Job Title"
                                value={jobTitle}
                                onChange={(e) => setJobTitle(e.target.value)}
                                placeholder="Software Engineer"
                            />

                            <SelectField
                                label="Primary Organization"
                                value={primaryOrgId}
                                onChange={(e) => setPrimaryOrgId(e.target.value)}
                            >
                                <option value="">Select organization…</option>
                                {organizations.map((org) => (
                                    <option key={org.id} value={org.id}>
                                        {org.name} {org.code ? `(${org.code})` : ""}
                                    </option>
                                ))}
                            </SelectField>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <SelectField
                                    label="Employment Type"
                                    value={employmentType}
                                    onChange={(e) => setEmploymentType(e.target.value as EmploymentType)}
                                >
                                    <option value="full_time">Full-time</option>
                                    <option value="contract">Contract</option>
                                    <option value="intern">Intern</option>
                                    <option value="consultant">Consultant</option>
                                </SelectField>

                                <TextField
                                    label="Hire Date"
                                    type="date"
                                    value={hireDate}
                                    onChange={(e) => setHireDate(e.target.value)}
                                />
                            </div>

                            <div className="pt-4 flex gap-3">
                                <Button
                                    className="gap-2"
                                    onClick={() => void (searchMode === "request" ? handleRequestSubmit() : handleCreateEmployee())}
                                    disabled={submitting}
                                >
                                    {submitting ? (
                                        <>
                                            <Icon name="hourglass_empty" className="text-[18px] animate-spin" />
                                            {searchMode === "request" ? "Submitting..." : "Creating..."}
                                        </>
                                    ) : (
                                        <>
                                            <Icon name={searchMode === "request" ? "send" : "person_add"} className="text-[18px]" />
                                            {searchMode === "request" ? "Submit Request" : "Create Employee"}
                                        </>
                                    )}
                                </Button>
                                <Button
                                    variant="secondary"
                                    onClick={resetSearch}
                                    disabled={submitting}
                                >
                                    Back
                                </Button>
                            </div>
                        </div>
                    )}
                </SectionCard>
            </div>
        </AppShell>
    );
}
