import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import DOMPurify from "dompurify";
import {
  X,
  Minus,
  Maximize2,
  Minimize2,
  FileText,
  Film,
  Image as ImageIcon,
  Music,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { formatFileSize } from "@stanforte/shared";
import { getPresignedFileUrl } from "@/pages/files/files-api";

type WindowState = "normal" | "maximized" | "minimized";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface PreviewableFile {
  id?: string | number | null;
  file_name: string;
  mime_type?: string | null;
  file_size?: number | null;
  public_url?: string | null;
}

interface FilePreviewModalProps {
  file: PreviewableFile | null;
  isOpen: boolean;
  onClose: () => void;
  fallbackHtml?: string;
}

function detectMediaKind(file: PreviewableFile): "video" | "image" | "audio" | "pdf" | "text" | "other" {
  const mime = (file.mime_type || "").toLowerCase();
  const name = (file.file_name || "").toLowerCase();

  if (mime.startsWith("video/") || /\.(mp4|webm|mov|m4v|ogv)$/.test(name)) return "video";
  if (mime.startsWith("image/") || /\.(png|jpe?g|gif|webp|svg|bmp|avif)$/.test(name)) return "image";
  if (mime.startsWith("audio/") || /\.(mp3|wav|m4a|aac|ogg|flac)$/.test(name)) return "audio";
  if (mime === "application/pdf" || /\.pdf$/.test(name)) return "pdf";
  if (mime.startsWith("text/") || /\.(txt|csv|json|md|log)$/.test(name)) return "text";
  return "other";
}

export function FilePreviewModal({ file, isOpen, onClose, fallbackHtml }: FilePreviewModalProps) {
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [useFallbackHtml, setUseFallbackHtml] = useState(false);
  const [windowState, setWindowState] = useState<WindowState>("normal");

  useEffect(() => {
    if (!isOpen || !file) {
      setResolvedUrl(null);
      setError(null);
      setLoading(false);
      setUseFallbackHtml(false);
      setWindowState("normal");
      return;
    }

    setWindowState("normal");

    let cancelled = false;

    async function resolve() {
      setLoading(true);
      setError(null);
      setResolvedUrl(null);
      setUseFallbackHtml(false);

      const fileIdStr = file?.id ? String(file.id) : "";
      const isUuid = UUID_REGEX.test(fileIdStr);

      try {
        if (isUuid) {
          const url = await getPresignedFileUrl(fileIdStr, {
            inline: true,
            expiresInSeconds: 900,
          });
          if (!cancelled) setResolvedUrl(url);
        } else if (file?.public_url) {
          if (!cancelled) setResolvedUrl(file.public_url);
        } else if (fallbackHtml) {
          if (!cancelled) setUseFallbackHtml(true);
        } else {
          if (!cancelled) {
            setError("This is a sample placeholder file. Upload an actual file to preview it.");
          }
        }
      } catch (err) {
        if (!cancelled) {
          if (fallbackHtml) {
            setUseFallbackHtml(true);
          } else {
            setError(err instanceof Error ? err.message : "Failed to load file preview.");
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void resolve();

    return () => {
      cancelled = true;
    };
  }, [isOpen, file?.id, file?.public_url, fallbackHtml]);

  useEffect(() => {
    if (!isOpen || windowState === "minimized") return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        if (windowState === "maximized") {
          setWindowState("normal");
        } else {
          onClose();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, windowState, onClose]);

  if (!isOpen || !file) return null;

  const kind = detectMediaKind(file);
  const isMaximized = windowState === "maximized";
  const isMinimized = windowState === "minimized";

  const HeaderIcon =
    kind === "video"
      ? Film
      : kind === "image"
        ? ImageIcon
        : kind === "audio"
          ? Music
          : FileText;

  const mediaHeightClass = isMaximized ? "max-h-[calc(100vh-88px)]" : "max-h-[72vh]";
  const iframeHeightClass = isMaximized ? "h-[calc(100vh-88px)]" : "h-[72vh]";

  const modal = (
    <div
      role={isMinimized ? undefined : "dialog"}
      aria-modal={isMinimized ? undefined : true}
      aria-label={`Preview ${file.file_name}`}
      className={
        isMinimized
          ? "fixed bottom-4 right-4 z-[100] w-80 max-w-[calc(100vw-2rem)]"
          : isMaximized
            ? "fixed inset-0 z-[100] flex items-center justify-center bg-neutral-950/60"
            : "fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-neutral-950/60"
      }
      onClick={isMinimized ? undefined : onClose}
    >
      <div
        className={
          isMinimized
            ? "w-full flex flex-col rounded-xl bg-white dark:bg-neutral-900 border border-neutral-900/[0.12] dark:border-neutral-700 shadow-2xl overflow-hidden"
            : isMaximized
              ? "w-screen h-screen flex flex-col rounded-none bg-white dark:bg-neutral-900 overflow-hidden"
              : "w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-900/[0.08] dark:border-neutral-800 shadow-2xl overflow-hidden"
        }
        onClick={(e) => e.stopPropagation()}
      >
        {/* Window Title Bar */}
        <div
          onDoubleClick={() =>
            setWindowState((prev) => (prev === "maximized" ? "normal" : "maximized"))
          }
          onClick={isMinimized ? () => setWindowState("normal") : undefined}
          className={`px-4 py-3 border-b border-neutral-900/[0.08] dark:border-neutral-800 bg-[#fafafa] dark:bg-neutral-900/95 flex items-center justify-between gap-3 shrink-0 select-none ${
            isMinimized ? "border-b-0 cursor-pointer hover:bg-neutral-100/80 dark:hover:bg-neutral-800/80" : ""
          }`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-orange-50 dark:bg-orange-500/10 border border-orange-200/60 dark:border-orange-500/20 text-[#ff6900] flex items-center justify-center shrink-0">
              <HeaderIcon className="h-4 w-4" strokeWidth={1.75} />
            </div>
            <div className="min-w-0">
              <h3 className="font-headline text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">
                {file.file_name}
              </h3>
              {!isMinimized && (
                <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate mt-0.5">
                  {file.mime_type || "File"}
                  {file.file_size ? ` • ${formatFileSize(file.file_size)}` : ""}
                </p>
              )}
            </div>
          </div>

          <div
            className="flex items-center gap-1 shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            {!isMinimized && (
              <button
                type="button"
                onClick={() => setWindowState("minimized")}
                className="p-2 rounded-lg text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-200/60 dark:hover:bg-neutral-800 transition-colors"
                title="Minimize"
                aria-label="Minimize preview"
              >
                <Minus className="h-4 w-4" strokeWidth={1.5} />
              </button>
            )}

            <button
              type="button"
              onClick={() =>
                setWindowState((prev) =>
                  prev === "minimized" ? "normal" : prev === "maximized" ? "normal" : "maximized",
                )
              }
              className="p-2 rounded-lg text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-200/60 dark:hover:bg-neutral-800 transition-colors"
              title={isMinimized ? "Restore" : isMaximized ? "Restore size" : "Maximize"}
              aria-label={isMinimized ? "Restore preview" : isMaximized ? "Restore window size" : "Maximize preview"}
            >
              {isMaximized ? (
                <Minimize2 className="h-4 w-4" strokeWidth={1.5} />
              ) : (
                <Maximize2 className="h-4 w-4" strokeWidth={1.5} />
              )}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg text-neutral-500 dark:text-neutral-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
              title="Close"
              aria-label="Close preview"
            >
              <X className="h-4 w-4" strokeWidth={1.5} />
            </button>
          </div>
        </div>

        {/* Viewer Body (hidden while minimized so playback/state is preserved) */}
        <div
          className={
            isMinimized
              ? "hidden"
              : "flex-1 min-h-[320px] overflow-auto bg-neutral-100/80 dark:bg-neutral-950 p-4 sm:p-6 flex items-center justify-center"
          }
        >
          {loading ? (
            <div className="flex flex-col items-center gap-2.5 text-neutral-500 dark:text-neutral-400">
              <Loader2 className="h-6 w-6 animate-spin text-[#ff6900]" />
              <p className="text-xs font-medium">Loading preview...</p>
            </div>
          ) : error ? (
            <div className="max-w-sm text-center space-y-2">
              <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200/60 dark:border-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
                <AlertCircle className="h-5 w-5" />
              </div>
              <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">Unable to load preview</p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">{error}</p>
            </div>
          ) : useFallbackHtml && fallbackHtml ? (
            <div className="w-full max-w-2xl bg-white dark:bg-neutral-900 rounded-xl border border-neutral-900/[0.08] dark:border-neutral-800 shadow-xs p-6 sm:p-8 space-y-4 self-start">
              <div className="px-3 py-2 rounded-lg bg-orange-50 dark:bg-orange-500/10 border border-orange-200/60 dark:border-orange-500/20 text-xs text-[#c2410c] dark:text-orange-300">
                Sample document preview — no uploaded PDF is attached yet. Edit this document to attach a file.
              </div>
              <div
                className="prose prose-sm max-w-none text-neutral-700 dark:text-neutral-200 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(fallbackHtml) }}
              />
            </div>
          ) : !resolvedUrl ? null : kind === "video" ? (
            <video
              key={resolvedUrl}
              src={resolvedUrl}
              controls
              autoPlay
              playsInline
              controlsList="nodownload"
              onContextMenu={(e) => e.preventDefault()}
              className={`${mediaHeightClass} max-w-full rounded-xl bg-black shadow-sm`}
            >
              Your browser does not support inline video playback.
            </video>
          ) : kind === "image" ? (
            <img
              src={resolvedUrl}
              alt={file.file_name}
              onContextMenu={(e) => e.preventDefault()}
              className={`${mediaHeightClass} max-w-full object-contain rounded-xl shadow-sm`}
            />
          ) : kind === "audio" ? (
            <div className="w-full max-w-md p-6 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-900/[0.08] dark:border-neutral-800 shadow-xs space-y-4 text-center">
              <div className="w-12 h-12 rounded-xl bg-orange-50 dark:bg-orange-500/10 border border-orange-200/60 dark:border-orange-500/20 text-[#ff6900] flex items-center justify-center mx-auto">
                <Music className="h-5 w-5" />
              </div>
              <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">{file.file_name}</p>
              <audio
                src={resolvedUrl}
                controls
                controlsList="nodownload"
                className="w-full"
              />
            </div>
          ) : kind === "pdf" ? (
            <iframe
              src={`${resolvedUrl}#toolbar=0`}
              title={file.file_name}
              className={`w-full ${iframeHeightClass} rounded-xl border border-neutral-900/[0.08] dark:border-neutral-800 bg-white`}
            />
          ) : kind === "text" ? (
            <iframe
              src={resolvedUrl}
              title={file.file_name}
              className={`w-full ${iframeHeightClass} rounded-xl border border-neutral-900/[0.08] dark:border-neutral-800 bg-white`}
            />
          ) : (
            <div className="max-w-sm text-center space-y-2 py-8">
              <div className="w-12 h-12 rounded-xl bg-orange-50 dark:bg-orange-500/10 border border-orange-200/60 dark:border-orange-500/20 text-[#ff6900] flex items-center justify-center mx-auto">
                <FileText className="h-5 w-5" />
              </div>
              <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">Inline preview unavailable</p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                This file format ({file.mime_type || "unknown"}) cannot be rendered directly in the browser viewer.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  if (typeof document === "undefined") return modal;
  return createPortal(modal, document.body);
}
