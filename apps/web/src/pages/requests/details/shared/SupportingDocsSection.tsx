import { Button, EmptyState, Icon, SectionCard } from "@/shared";
import { useRequestDetails } from "../context";

export function SupportingDocsSection() {
  const { documents } = useRequestDetails();

  return (
    <SectionCard title="Supporting Documents">
      {documents.length ? (
        <div className="grid gap-3 md:grid-cols-2">
          {documents.map((doc) => (
            <article
              key={doc.id}
              className="flex items-start gap-3 rounded-[18px] border border-slate-100 bg-slate-50 px-4 py-4"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-900/10 text-brand-900">
                <Icon name="description" className="text-[20px]" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-950">
                  {doc.file_name}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {doc.mime_type || "Document"}
                </p>
              </div>
              {doc.public_url ? (
                <a
                  href={doc.public_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex"
                >
                  <Button variant="secondary" size="sm">
                    Open
                  </Button>
                </a>
              ) : null}
            </article>
          ))}
        </div>
      ) : (
        <EmptyState
          title="No supporting documents"
          description="No files are attached to this request yet."
        />
      )}
    </SectionCard>
  );
}
