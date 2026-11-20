import { Button } from "@/shared";
import { useRequestDetails } from "../../context";

export function NudgeSection() {
  const {
    canShowNudge,
    nudgeHeadline,
    viewerStatus,
    copyNudge,
  } = useRequestDetails();

  if (!canShowNudge) return null;

  return (
    <section className="section-card p-5">
      <p className="text-[0.72rem] font-medium text-neutral-500">
        Need a nudge?
      </p>
      <h3 className="mt-3 text-sm font-semibold text-neutral-950">
        {nudgeHeadline}
      </h3>
      <p className="mt-2 text-sm leading-6 text-neutral-500">
        You do not have an action right now, but you can still remind the next
        reviewer to move this forward.
      </p>
      <div className="mt-4 rounded-[18px] bg-neutral-50 px-4 py-3 text-sm text-neutral-600">
        {viewerStatus.hint}
      </div>
      <Button
        className="mt-4 w-full justify-center"
        variant="secondary"
        onClick={() => void copyNudge()}
      >
        Copy reminder
      </Button>
    </section>
  );
}
