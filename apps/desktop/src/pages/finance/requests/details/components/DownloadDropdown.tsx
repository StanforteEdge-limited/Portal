import { Button, Icon } from "@/shared";
import { useEffect, useRef, useState } from "react";

export function DownloadDropdown(props: {
  actionBusy: string;
  onDownloadRequestPdf: () => void;
  onDownloadFullDocument: () => void;
}) {
  const { actionBusy, onDownloadRequestPdf, onDownloadFullDocument } = props;
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

  return (
    <div ref={menuRef} className="relative w-full">
      <Button
        variant="secondary"
        className="w-full justify-between"
        onClick={() => setOpen((current) => !current)}
        disabled={actionBusy !== ""}
      >
        <span className="inline-flex items-center gap-2">
          <Icon name="download" className="text-[18px]" />
          Download
        </span>
        <Icon
          name={open ? "expand_less" : "expand_more"}
          className="text-[18px]"
        />
      </Button>
      {open ? (
        <div className="absolute right-0 z-80 mt-2 w-full min-w-[240px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
          <button
            type="button"
            className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            onClick={() => {
              setOpen(false);
              onDownloadRequestPdf();
            }}
          >
            <Icon name="description" className="text-[18px]" />
            Request PDF
          </button>
          <button
            type="button"
            className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            onClick={() => {
              setOpen(false);
              onDownloadFullDocument();
            }}
          >
            <Icon name="folder_zip" className="text-[18px]" />
            Full Document
          </button>
        </div>
      ) : null}
    </div>
  );
}
