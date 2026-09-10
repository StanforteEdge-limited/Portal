import { Button, Icon, SectionCard } from "@/shared";
import { useRequestDetails } from "../../context";

export function DownloadsSection() {
  const {
    actionBusy,
    canEditDraft,
    handleDownloadArtifact,
    handleDeleteDraft,
  } = useRequestDetails();

  return (
    <SectionCard title="Downloads & Draft">
      <div className="space-y-3">
        <Button
          variant="secondary"
          className="w-full justify-center"
          onClick={() => void handleDownloadArtifact("request_pdf")}
          disabled={actionBusy !== ""}
        >
          <span className="inline-flex items-center gap-2">
            <Icon name="description" className="text-[18px]" />
            {actionBusy === "download_request_pdf" ? "Downloading..." : "Download Request PDF"}
          </span>
        </Button>
        <Button
          variant="secondary"
          className="w-full justify-center"
          onClick={() => void handleDownloadArtifact("full_document")}
          disabled={actionBusy !== ""}
        >
          <span className="inline-flex items-center gap-2">
            <Icon name="folder_zip" className="text-[18px]" />
            {actionBusy === "download_full_document" ? "Downloading..." : "Download Full Document"}
          </span>
        </Button>
        {canEditDraft ? (
          <Button
            variant="danger"
            className="w-full justify-center"
            onClick={() => void handleDeleteDraft()}
            disabled={actionBusy !== ""}
          >
            {actionBusy === "delete" ? "Deleting..." : "Delete Draft"}
          </Button>
        ) : null}
      </div>
    </SectionCard>
  );
}
