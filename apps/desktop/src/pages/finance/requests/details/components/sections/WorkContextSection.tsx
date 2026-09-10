import { SectionCard, StatCard } from "@/shared";
import { useRequestDetails } from "../../context";

export function WorkContextSection() {
  const { projectName, teamName, organizationName } = useRequestDetails();

  return (
    <SectionCard
      title="Work Context"
      description="The workstream and ownership context for this request."
    >
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Project" value={projectName} tone="neutral" />
        <StatCard label="Team" value={teamName} tone="neutral" />
        <StatCard
          label="Organization"
          value={organizationName}
          tone="neutral"
        />
      </div>
    </SectionCard>
  );
}
