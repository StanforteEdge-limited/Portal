import { ActivityFeed, SectionCard } from "@/shared";
import { useRequestDetails } from "../../context";

export function ActivitySectionCard() {
  const { activityItems } = useRequestDetails();

  return (
    <SectionCard title="Activity">
      <ActivityFeed
        items={activityItems}
        emptyState="No activity recorded for this request yet."
        limit={3}
      />
    </SectionCard>
  );
}
