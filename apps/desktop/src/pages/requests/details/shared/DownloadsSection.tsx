import { Button, Icon } from "@/shared";
import { useEffect, useRef, useState } from "react";
import { useRequestDetails, type DownloadArtifactAction } from "../context";

function DownloadDropdown({
  actionBusy,
  onDownloadRequestPdf,
  onDownloadFullDocument,
  includeFullDocument = true,
}: {
  actionBusy: string;
  onDownloadRequestPdf: () => void;
  onDownloadFullDocument: () => void;
  includeFullDocument?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  if (!includeFullDocument) {
    return (
      <Button
        variant="secondary"
        className="w-full justify-center"
        onClick={onDownloadRequestPdf}
        disabled={actionBusy !== ""}
      >
        {actionBusy === "download_request_pdf" ? "Downloading..." : "Download Request PDF"}
      </Button>
    );
  }

  return (
    <div ref={menuRef} className="relative w-full">
      <Button
        variant="secondary"
        className="w-full justify-center gap-2"
        onClick={() => setOpen((current) => !current)}
        disabled={actionBusy !== ""}
      >
        {actionBusy.startsWith("download") ? "Downloading..." : "Download"}
        <Icon name="expand_more" className="text-[18px]" />
      </Button>
      {open ? (
        <div className="absolute left-0 right-0 top-full z-10 mt-1 overflow-hidden rounded-[18px] border border-slate-200 bg-white shadow-card">
          <button
            type="button"
            className="w-full px-4 py-3 text-left text-sm font-semibold text-slate-900 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-900/20"
            onClick={() => {
              setOpen(false);
              onDownloadRequestPdf();
            }}
          >
            Request PDF
          </button>
          <button
            type="button"
            className="w-full px-4 py-3 text-left text-sm font-semibold text-slate-900 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-900/20"
            onClick={() => {
              setOpen(false);
              onDownloadFullDocument();
            }}
          >
            Full Document
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function DownloadsSection() {
  const {
    actionBusy,
    workflowType,
    workflowStatus,
    handleDownloadArtifact,
    handleDeleteDraft,
  } = useRequestDetails();

  return (
    <div className="space-y-3">
      <DownloadDropdown
        actionBusy={actionBusy}
        onDownloadRequestPdf={() => void handleDownloadArtifact("request_pdf")}
        onDownloadFullDocument={() =>
          void handleDownloadArtifact("full_document")
        }
        includeFullDocument={workflowType !== "leave"}
      />
      {workflowStatus === "draft" ? (
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
  );
}
