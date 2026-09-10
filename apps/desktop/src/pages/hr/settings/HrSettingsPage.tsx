import { useState } from "react";
import { AppShell, PageHeader, SectionCard, SidebarTabs } from "@/shared";
import { buildAppNavigation, buildAppMobileNav } from "@/shared/navigation";
import { useAuth } from "@/shared/context/AuthProvider";
import { useCachedQuery } from "@/shared/lib/core";
import { getWorkspaceProfile } from "@/shared/api/workspace-api";
import AttendanceSettingsTab from "./AttendanceSettingsTab";
import LeaveSettingsTab from "./LeaveSettingsTab";
import OfficeLocationsTab from "./OfficeLocationsTab";
import DesignationsTab from "./DesignationsTab";
import AttendanceOverrideSlideOver from "./AttendanceOverrideSlideOver";
import LeaveOverrideSlideOver from "./LeaveOverrideSlideOver";
import LeaveTypeSlideOver from "./LeaveTypeSlideOver";
import OfficeLocationSlideOver from "./OfficeLocationSlideOver";
import DesignationSlideOver from "./DesignationSlideOver";
import { type PolicyRecord } from "@stanforte/shared";
import { type RequestType } from "@stanforte/shared";
import { type OfficeLocation } from "@/shared";

export default function HrSettingsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"attendance" | "leave" | "locations" | "designations">("attendance");
  
  const [attendancePolicy, setAttendancePolicy] = useState<PolicyRecord | null | boolean>(false);
  const [leavePolicy, setLeavePolicy] = useState<PolicyRecord | null | boolean>(false);
  const [leaveType, setLeaveType] = useState<RequestType | null | boolean>(false);
  const [officeLocation, setOfficeLocation] = useState<OfficeLocation | null | boolean>(false);
  const [designation, setDesignation] = useState<any | boolean>(false);

  const { data: profile } = useCachedQuery(
    "hr:profile",
    () => getWorkspaceProfile(),
    { ttlMs: 1000 * 60, storage: "memory" }
  );

  const navItems = [
    { id: "attendance", label: "Attendance", icon: "schedule" },
    { id: "leave", label: "Leave Management", icon: "beach_access" },
    { id: "locations", label: "Office Locations", icon: "location_on" },
    { id: "designations", label: "Job Titles (JDs)", icon: "work" },
  ];

  const userName = `${user?.first_name || ""} ${user?.last_name || ""}`.trim() || user?.email || "HR Admin";

  return (
    <AppShell
      navigation={buildAppNavigation()}
      activeLabel="hr-settings"
      user={{
        name: userName,
        role: profile?.employee_profile?.job_title || "HR Administrator",
      }}
      mobileNav={buildAppMobileNav("HR")}
    >
      <PageHeader
        breadcrumbs={[{ label: "HR", path: "/hr" }, { label: "Settings" }]}
        title="HR Settings"
        description="Manage organization-wide attendance rules, leave entitlements, and office geofences."
      />

      <SidebarTabs items={navItems} activeTab={activeTab} onTabChange={(id) => setActiveTab(id as typeof activeTab)}>
        <SectionCard title={navItems.find((i) => i.id === activeTab)?.label || "Settings"}>
          {activeTab === "attendance" && (
            <AttendanceSettingsTab
              onEditPolicy={(policy) => setAttendancePolicy(policy)}
            />
          )}
          {activeTab === "leave" && (
            <LeaveSettingsTab
              onEditPolicy={(policy) => setLeavePolicy(policy)}
              onEditType={(type) => setLeaveType(type)}
            />
          )}
          {activeTab === "locations" && (
            <OfficeLocationsTab
              onEditLocation={(location) => setOfficeLocation(location)}
            />
          )}
          {activeTab === "designations" && (
            <DesignationsTab
              onEditDesignation={(desig) => setDesignation(desig)}
            />
          )}
        </SectionCard>
      </SidebarTabs>

      {attendancePolicy !== false && (
        <AttendanceOverrideSlideOver
          policy={typeof attendancePolicy === 'object' ? attendancePolicy : null}
          onClose={() => setAttendancePolicy(false)}
          onSaved={() => setAttendancePolicy(false)}
        />
      )}

      {leavePolicy !== false && (
        <LeaveOverrideSlideOver
          policy={typeof leavePolicy === 'object' ? leavePolicy : null}
          onClose={() => setLeavePolicy(false)}
          onSaved={() => setLeavePolicy(false)}
        />
      )}

      {leaveType !== false && (
        <LeaveTypeSlideOver
          requestType={typeof leaveType === 'object' ? leaveType : null}
          onClose={() => setLeaveType(false)}
          onSaved={() => setLeaveType(false)}
        />
      )}

      {officeLocation !== false && (
        <OfficeLocationSlideOver
          location={typeof officeLocation === 'object' ? officeLocation : null}
          onClose={() => setOfficeLocation(false)}
          onSaved={() => setOfficeLocation(false)}
        />
      )}

      {designation !== false && (
        <DesignationSlideOver
          designation={typeof designation === 'object' ? designation : null}
          onClose={() => setDesignation(false)}
          onSaved={() => {
            setDesignation(false);
          }}
        />
      )}
    </AppShell>
  );
}