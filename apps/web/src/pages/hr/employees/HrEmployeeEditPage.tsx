import {
    Button,
    Icon,
    PageHeader,
    SectionCard,
    SelectField,
    TextField,
    TextAreaField,
    useToast,
} from "@/shared";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AppShell } from "@/shared/components/layout/AppShell";
import { useAuth } from "@/shared/context/AuthProvider";
import { hrApi, resourceApi, useCachedQuery } from "@/shared/lib/core";
import { type EmploymentType, type EmploymentStatus, type EmployeeDetail } from "@stanforte/shared";
import { buildAppNavigation, buildAppMobileNav } from "@/shared/navigation";
import { getWorkspaceProfile } from "@/shared/api/workspace-api";

function humanize(value: string) {
    return String(value || "")
        .replaceAll("_", " ")
        .replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function HrEmployeeEditPage() {
    const { user } = useAuth();
    const { id } = useParams<{ id: string }>();
    const { data: profile } = useCachedQuery(
        "hr:profile:edit",
        () => getWorkspaceProfile(),
        { ttlMs: 1000 * 60, storage: "memory" },
    );

    const { data: employeeData, loading: employeeLoading } = useCachedQuery(
        `hr:employee:edit:${id}`,
        () => hrApi.getEmployee(id!),
        { ttlMs: 1000 * 30, storage: "memory" },
    );

    const employee = employeeData as EmployeeDetail | undefined;

    const { showToast } = useToast();
    const navigate = useNavigate();

    const [organizations, setOrganizations] = useState<any[]>([]);
    const [primaryOrgId, setPrimaryOrgId] = useState("");
    const [teams, setTeams] = useState<any[]>([]);
    const [primaryTeamId, setPrimaryTeamId] = useState("");
    const [managers, setManagers] = useState<any[]>([]);
    const [managerUserId, setManagerUserId] = useState("");
    const [designationId, setDesignationId] = useState("");
    const [designations, setDesignations] = useState<any[]>([]);
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [jobTitle, setJobTitle] = useState("");
    const [jobDescription, setJobDescription] = useState("");
    const [employmentType, setEmploymentType] = useState<EmploymentType>("full_time");
    const [employmentStatus, setEmploymentStatus] = useState<EmploymentStatus>("active");
    const [workMode, setWorkMode] = useState<string>("onsite");
    const [hireDate, setHireDate] = useState("");
    const [confirmationDate, setConfirmationDate] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [apiError, setApiError] = useState<string | null>(null);

    useEffect(() => {
        resourceApi.listOrganizations()
            .then(setOrganizations)
            .catch(() => setOrganizations([]));

        resourceApi.listGroups()
            .then(setTeams)
            .catch(() => setTeams([]));

        hrApi.listEmployees({ status: "active" })
            .then((res: any) => {
                const list = Array.isArray(res?.result) ? res.result : [];
                setManagers(list);
            })
            .catch(() => setManagers([]));

        hrApi.listDesignations()
            .then((res: any) => {
                setDesignations(Array.isArray(res) ? res : []);
            })
            .catch(() => setDesignations([]));
    }, []);

    useEffect(() => {
        if (employee) {
            setFirstName(employee.first_name || "");
            setLastName(employee.last_name || "");
            setEmail(employee.email || "");
            setPhone(employee.phone || "");
            setDesignationId(employee.designation_id || "");
            setJobTitle(employee.job_title || "");
            setJobDescription(employee.job_description || "");
            setEmploymentType((employee.employment_type || "full_time") as EmploymentType);
            setEmploymentStatus((employee.employment_status || "active") as EmploymentStatus);
            setWorkMode(employee.work_mode || "onsite");
            setHireDate(employee.hire_date || "");
            setConfirmationDate(employee.confirmation_date || "");
            setPrimaryOrgId(employee.primary_organization?.id || "");
            setPrimaryTeamId(employee.primary_team?.id || "");
            setManagerUserId(employee.manager?.id || "");
        }
    }, [employee]);

    const userName =
        `${user?.first_name || ""} ${user?.last_name || ""}`.trim() ||
        user?.email ||
        "HR Staff";

    async function handleSubmit() {
        setApiError(null);

        if (!firstName.trim() || !lastName.trim() || !email.trim() || !jobTitle.trim()) {
            showToast({
                tone: "warning",
                title: "Validation error",
                message: "First name, last name, email, and job title are required.",
            });
            return;
        }

        try {
            setSubmitting(true);
            await hrApi.updateEmployee(id!, {
                first_name: firstName.trim(),
                last_name: lastName.trim(),
                email: email.trim(),
                phone: phone.trim() || undefined,
                job_title: jobTitle.trim(),
                job_description: jobDescription.trim() || undefined,
                designation_id: designationId || undefined,
                employment_type: employmentType,
                employment_status: employmentStatus,
                work_mode: workMode,
                hire_date: hireDate || undefined,
                confirmation_date: confirmationDate || undefined,
                primary_organization_id: primaryOrgId || undefined,
                primary_team_id: primaryTeamId || undefined,
                manager_user_id: managerUserId || undefined,
            });

            showToast({
                tone: "success",
                title: "Employee updated",
                message: `${firstName} ${lastName}'s profile has been updated.`,
            });

            navigate(`/hr/employees/${id}`);
        } catch (err: any) {
            const message = err?.message || err?.error?.message || "Failed to update employee";
            setApiError(message);
            showToast({
                tone: "danger",
                title: "Update failed",
                message,
            });
        } finally {
            setSubmitting(false);
        }
    }

    if (employeeLoading) {
        return (
            <AppShell
                navigation={buildAppNavigation()}
                activeLabel="hr-employees"
                user={{ name: userName, role: profile?.employee_profile?.job_title || "HR Staff" }}
                mobileNav={buildAppMobileNav("Employees")}
            >
                <div className="rounded-2xl bg-slate-50 px-4 py-6 text-sm text-slate-500">Loading employee...</div>
            </AppShell>
        );
    }

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
                    { label: `${employee?.first_name || ""} ${employee?.last_name || ""}`, path: `/hr/employees/${id}` },
                    { label: "Edit" },
                ]}
                title={`Edit ${employee?.first_name} ${employee?.last_name}`}
                description="Update employee profile and employment details."
                actions={
                    <Button
                        variant="ghost"
                        onClick={() => navigate(`/hr/employees/${id}`)}
                    >
                        Cancel
                    </Button>
                }
            />

            {apiError && (
                <div className="mb-6 rounded-2xl border border-danger/20 bg-danger/10 px-4 py-4 text-sm text-danger">
                    {apiError}
                </div>
            )}

            <div className="grid gap-6">
                <SectionCard title="Personal Information" description="Basic identity and contact details.">
                    <div className="grid gap-4 max-w-2xl">
                        <div className="grid gap-4 sm:grid-cols-2">
                            <TextField
                                label="First Name"
                                value={firstName}
                                onChange={(e) => setFirstName(e.target.value)}
                            />
                            <TextField
                                label="Last Name"
                                value={lastName}
                                onChange={(e) => setLastName(e.target.value)}
                            />
                        </div>

                        <TextField
                            label="Email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />

                        <TextField
                            label="Phone"
                            type="tel"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="+234..."
                        />
                    </div>
                </SectionCard>

                <SectionCard title="Job & Employment" description="Job title, description, and employment terms.">
                    <div className="grid gap-4 max-w-2xl">
                        <div className="grid gap-4 sm:grid-cols-2">
                            <SelectField
                                label="Job Title Template"
                                value={designationId}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    setDesignationId(val);
                                    const selected = designations.find((d: any) => d.id === val);
                                    if (selected) {
                                        setJobTitle(selected.name);
                                        setJobDescription(selected.job_description || "");
                                    } else {
                                        setJobTitle("");
                                        setJobDescription("");
                                    }
                                }}
                            >
                                <option value="">-- No Template (Custom Title) --</option>
                                {designations.map((d: any) => (
                                    <option key={d.id} value={d.id}>
                                        {d.name}
                                    </option>
                                ))}
                            </SelectField>

                            <TextField
                                label="Job Title Name"
                                value={jobTitle}
                                onChange={(e) => setJobTitle(e.target.value)}
                                placeholder="e.g. Senior Backend Dev"
                                required
                            />
                        </div>

                        <TextAreaField
                             label="Job Description Template (or Custom Override)"
                             value={jobDescription}
                             onChange={(e) => setJobDescription(e.target.value)}
                             placeholder="Detailed responsibilities, expectations, and role description..."
                             rows={6}
                         />

                        <div className="grid gap-4 sm:grid-cols-2">
                            <SelectField
                                label="Primary Organization"
                                value={primaryOrgId}
                                onChange={(e) => setPrimaryOrgId(e.target.value)}
                            >
                                <option value="">Select organization…</option>
                                {organizations.map((org: any) => (
                                    <option key={org.id} value={org.id}>
                                        {org.name} {org.code ? `(${org.code})` : ""}
                                    </option>
                                ))}
                            </SelectField>

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
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                            <SelectField
                                label="Work Mode"
                                value={workMode}
                                onChange={(e) => setWorkMode(e.target.value)}
                            >
                                <option value="onsite">Onsite</option>
                                <option value="hybrid">Hybrid</option>
                                <option value="remote">Remote</option>
                            </SelectField>

                            <SelectField
                                label="Employment Status"
                                value={employmentStatus}
                                onChange={(e) => setEmploymentStatus(e.target.value as EmploymentStatus)}
                            >
                                <option value="active">Active</option>
                                <option value="suspended">Suspended</option>
                                <option value="exited">Exited</option>
                            </SelectField>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                            <SelectField
                                label="Primary Team"
                                value={primaryTeamId}
                                onChange={(e) => setPrimaryTeamId(e.target.value)}
                            >
                                <option value="">Select team...</option>
                                {teams.map((t: any) => (
                                    <option key={t.id} value={t.id}>
                                        {t.name}
                                    </option>
                                ))}
                            </SelectField>

                            <SelectField
                                label="Reporting Manager"
                                value={managerUserId}
                                onChange={(e) => setManagerUserId(e.target.value)}
                            >
                                <option value="">Select manager...</option>
                                {managers.filter(m => String(m.id) !== id).map((m: any) => (
                                    <option key={m.id} value={String(m.id)}>
                                        {`${m.first_name || ""} ${m.last_name || ""}`.trim() || m.email}
                                    </option>
                                ))}
                            </SelectField>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                            <TextField
                                label="Employee Code"
                                value={employee?.employee_code || ""}
                                disabled
                                helpText="Assigned automatically"
                            />
                        </div>
                    </div>
                </SectionCard>

                <SectionCard title="Employment Dates" description="Hire date and confirmation details.">
                    <div className="grid gap-4 max-w-2xl">
                        <div className="grid gap-4 sm:grid-cols-2">
                            <TextField
                                label="Hire Date"
                                type="date"
                                value={hireDate}
                                onChange={(e) => setHireDate(e.target.value)}
                            />

                            <TextField
                                label="Confirmation Date"
                                type="date"
                                value={confirmationDate}
                                onChange={(e) => setConfirmationDate(e.target.value)}
                            />
                        </div>
                    </div>
                </SectionCard>

                <SectionCard>
                    <div className="flex items-center gap-4">
                        <Button
                            className="gap-2"
                            onClick={() => void handleSubmit()}
                            disabled={submitting}
                        >
                            {submitting ? (
                                <>
                                    <Icon name="hourglass_empty" className="text-[18px] animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Icon name="save" className="text-[18px]" />
                                    Save Changes
                                </>
                            )}
                        </Button>
                        <Button
                            variant="ghost"
                            onClick={() => navigate(`/hr/employees/${id}`)}
                        >
                            Cancel
                        </Button>
                    </div>
                </SectionCard>
            </div>
        </AppShell>
    );
}
