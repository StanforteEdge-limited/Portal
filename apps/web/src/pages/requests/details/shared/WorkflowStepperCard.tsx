import { SectionCard, WorkflowStepper } from "@/shared";
import { useRequestDetails } from "../context";

export function WorkflowStepperCard() {
  const { workflow } = useRequestDetails();
  return (
    <SectionCard title="Approval Workflow">
      <WorkflowStepper steps={workflow} />
    </SectionCard>
  );
}
