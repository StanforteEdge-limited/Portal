import { ActivityFeed, SectionCard } from "@/shared";
import { useRequestDetails } from "../context";

export function ActivitySection({ limit = 3 }: { limit?: number }) {
  const { activityItems } = useRequestDetails();
  return (
    <SectionCard title="Activity">
      <ActivityFeed
        items={activityItems}
        emptyState="No activity recorded for this request yet."
        limit={limit}
      />
    </SectionCard>
  );
}
