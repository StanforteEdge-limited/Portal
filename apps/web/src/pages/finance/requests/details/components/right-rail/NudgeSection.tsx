import { RequestNudgeCard } from "@/shared";
import { useRequestDetails } from "../../context";

export function NudgeSection() {
  const { canShowNudge, nudgeHeadline, viewerStatus, copyNudge } = useRequestDetails();

  return (
    <RequestNudgeCard
      visible={canShowNudge}
      headline={nudgeHeadline}
      hint={viewerStatus.hint}
      onCopy={copyNudge}
    />
  );
}
