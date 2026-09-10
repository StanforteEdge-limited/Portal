import { useState } from "react";
import {
  Button,
  TextField,
  useToast,
  SectionCard,
} from "@/shared";
import { SlideOver, SlideOverHeader, SlideOverContent, SlideOverFooter } from "@/shared/components/ui/SlideOver";
import { attendanceApi } from "@/shared/lib/core";
import { type AdminCorrectionRow } from "@stanforte/shared";
import { formatDate, formatTime } from "@stanforte/shared";

type Props = {
  correction: AdminCorrectionRow;
  onClose: () => void;
  onReviewed: () => void;
};

export default function CorrectionReviewSlideOver({ correction, onClose, onReviewed }: Props) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [notes, setNotes] = useState("");

  async function handleReview(action: "approve" | "reject") {
    try {
      setLoading(true);
      await attendanceApi.reviewCorrection(correction.id, action, notes || undefined);
      showToast({
        tone: "success",
        title: action === "approve" ? "Approved" : "Rejected",
        message: `Correction request for ${correction.user_name} has been ${action === "approve" ? "approved" : "rejected"}.`,
      });
      onReviewed();
    } catch (err) {
      showToast({
        tone: "danger",
        title: "Review failed",
        message: err instanceof Error ? err.message : "Unable to submit review.",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <SlideOver open={true} onClose={onClose} size="lg">
      <SlideOverHeader
        title="Review Request"
        subtitle="Correction Review"
        onClose={onClose}
      />
      <SlideOverContent>
        <SectionCard title="Staff Identity">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-brand-50 flex items-center justify-center text-brand-900 font-bold">
              {correction.user_name.charAt(0)}
            </div>
            <div>
              <p className="font-bold text-slate-900">{correction.user_name}</p>
              <p className="text-sm text-slate-500">{correction.email}</p>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Request Details">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase">Work Date</p>
              <p className="text-sm font-medium text-slate-900">{formatDate(correction.work_date)}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase">Request Type</p>
              <p className="text-sm font-medium text-slate-900 capitalize">{correction.request_type.replace(/_/g, ' ')}</p>
            </div>
            <div className="col-span-2">
              <p className="text-xs font-semibold text-slate-500 uppercase">Reason</p>
              <p className="text-sm text-slate-700 bg-slate-50 p-3 rounded-2xl border border-slate-100 mt-1 italic">
                "{correction.reason}"
              </p>
            </div>
            {correction.proposed_at && (
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase">Proposed Time</p>
                <p className="text-sm font-medium text-slate-900">{formatTime(correction.proposed_at)}</p>
              </div>
            )}
          </div>
        </SectionCard>

        <SectionCard title="Your Review">
          <TextField 
            label="Review Notes (Optional)" 
            placeholder="Provide context for your decision..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </SectionCard>
      </SlideOverContent>
      <SlideOverFooter>
        <Button 
          className="flex-1 justify-center" 
          onClick={() => handleReview("approve")} 
          disabled={loading}
        >
          {loading ? "Processing..." : "Approve Request"}
        </Button>
        <Button 
          variant="danger" 
          className="flex-1 justify-center" 
          onClick={() => handleReview("reject")} 
          disabled={loading}
        >
          {loading ? "Processing..." : "Reject"}
        </Button>
      </SlideOverFooter>
    </SlideOver>
  );
}
