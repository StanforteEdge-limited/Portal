import { useState } from "react";
import { AppShell, Button, Icon, PageHeader, SectionCard, useToast, TextField } from "@/shared";
import { buildAppNavigation, buildAppMobileNav } from "@/shared/navigation";
import { useAuth } from "@/shared/context/AuthProvider";
import { useCachedQuery, documentApi } from "@/shared/lib/core";
import { getWorkspaceProfile } from "@/shared/api/workspace-api";
import { useParams, useNavigate } from "react-router-dom";
import DocumentSlideOver from "./DocumentSlideOver";

export default function DocumentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [signature, setSignature] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [submittingSign, setSubmittingSign] = useState(false);
  const [editingDoc, setEditingDoc] = useState(false);

  const { data: profile } = useCachedQuery(
    "hr:profile",
    () => getWorkspaceProfile(),
    { ttlMs: 1000 * 60, storage: "memory" }
  );

  const { data: documentRecord, refetch } = useCachedQuery(
    `documents:detail:${id}`,
    () => documentApi.get(id!)
  );

  const userName = `${user?.first_name || ""} ${user?.last_name || ""}`.trim() || user?.email || "Staff Member";
  const userRole = profile?.employee_profile?.job_title || "Staff Member";

  const userPerms = user?.permissions ?? [];
  const isHrOrAdmin = userPerms.includes('*') || userPerms.includes('hr.manage') || userPerms.includes('settings.manage');

  async function handleAcknowledge() {
    if (!agreed) {
      showToast({ tone: "warning", title: "Validation", message: "You must check the agreement box." });
      return;
    }
    const expectedName = `${user?.first_name || ""} ${user?.last_name || ""}`.trim().toLowerCase();
    if (signature.trim().toLowerCase() !== expectedName) {
      showToast({ tone: "warning", title: "Validation", message: `Signature must exactly match your name: "${user?.first_name || ""} ${user?.last_name || ""}".` });
      return;
    }

    try {
      setSubmittingSign(true);
      await documentApi.acknowledge(id!, {
        ip_address: "127.0.0.1",
        user_agent: navigator.userAgent
      });
      showToast({ tone: "success", title: "Signed Off", message: "You have formally acknowledged this document." });
      void refetch();
    } catch (err: any) {
      showToast({ tone: "danger", title: "Failed", message: err?.message || "Failed to sign document" });
    } finally {
      setSubmittingSign(false);
    }
  }

  if (!documentRecord) {
    return <div className="p-8 text-center text-slate-500">Loading document details...</div>;
  }

  // Determine acknowledgement status
  const ack = Array.isArray(documentRecord.acknowledgements) ? documentRecord.acknowledgements[0] : null;
  const isSigned = !!ack;

  return (
    <AppShell
      navigation={buildAppNavigation()}
      activeLabel="documents"
      user={{ name: userName, role: userRole }}
      mobileNav={buildAppMobileNav("Dashboard")}
    >
      <PageHeader
        breadcrumbs={[
          { label: "Workspace" },
          { label: "Documents", path: "/documents" },
          { label: "Details" }
        ]}
        title={documentRecord.title}
        description={`Category: ${documentRecord.category?.toUpperCase()} | Version: ${documentRecord.version || "1.0"}`}
        actions={
          <div className="flex gap-2">
            {isHrOrAdmin && (
              <Button onClick={() => setEditingDoc(true)} className="gap-1">
                <Icon name="edit" />
                Edit Document
              </Button>
            )}
            <Button variant="secondary" onClick={() => navigate("/documents")}>
              Back to List
            </Button>
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <SectionCard title={documentRecord.title}>
            {documentRecord.content_html ? (
              <div
                className="prose max-w-none text-slate-700 leading-7 text-sm"
                dangerouslySetInnerHTML={{ __html: documentRecord.content_html }}
              />
            ) : (
              <p className="text-slate-400 text-sm">No written content provided.</p>
            )}
          </SectionCard>

          {documentRecord.file && (
            <SectionCard title="Attached File">
              <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon name="attach_file" className="text-xl" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">{documentRecord.file.file_name}</p>
                  {documentRecord.file.file_size && (
                    <p className="text-xs text-slate-500">{(documentRecord.file.file_size / 1024).toFixed(1)} KB</p>
                  )}
                </div>
                {documentRecord.file.public_url && (
                  <a
                    href={documentRecord.file.public_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-primary/90 transition"
                  >
                    <Icon name="download" className="text-sm" />
                    Download
                  </a>
                )}
              </div>
            </SectionCard>
          )}

          {documentRecord.link_url && (
            <SectionCard title="External Link">
              <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon name="link" className="text-xl" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">{documentRecord.link_url}</p>
                </div>
                <a
                  href={documentRecord.link_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-primary/90 transition"
                >
                  <Icon name="open_in_new" className="text-sm" />
                  Open Link
                </a>
              </div>
            </SectionCard>
          )}
        </div>

        <div className="space-y-6">
          <SectionCard title="Metadata">
            <div className="space-y-3 text-xs text-slate-600">
              <div className="flex justify-between border-b pb-1.5 border-slate-100">
                <span className="font-medium">Category</span>
                <span className="capitalize">{documentRecord.category}</span>
              </div>
              <div className="flex justify-between border-b pb-1.5 border-slate-100">
                <span className="font-medium">Version</span>
                <span>v{documentRecord.version || "1.0"}</span>
              </div>
              <div className="flex justify-between border-b pb-1.5 border-slate-100">
                <span className="font-medium">Effective Date</span>
                <span>{documentRecord.effective_date ? new Date(documentRecord.effective_date).toLocaleDateString() : "-"}</span>
              </div>
              <div className="flex justify-between border-b pb-1.5 border-slate-100">
                <span className="font-medium">Acknowledgement</span>
                <span>{documentRecord.require_acknowledgement ? "Required" : "Optional"}</span>
              </div>
            </div>
          </SectionCard>

          {documentRecord.require_acknowledgement && (
            <SectionCard title="Formal Sign-Off">
              {isSigned ? (
                <div className="bg-success/5 border border-success/20 rounded-xl p-4 text-center space-y-2">
                  <Icon name="check_circle" className="text-success text-3xl" />
                  <h4 className="text-sm font-semibold text-slate-900">Signed & Acknowledged</h4>
                  <p className="text-[0.7rem] text-slate-500">
                    Acknowledged on: {new Date(ack.acknowledged_at).toLocaleString()}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-slate-700 text-xs leading-5">
                    <p className="font-semibold text-amber-900 flex items-center gap-1 mb-1">
                      <Icon name="warning" className="text-sm" /> Signature Required
                    </p>
                    This is an official document. Type your full name exactly as shown below to sign:
                    <p className="font-bold text-slate-900 mt-1 select-none">"{user?.first_name} {user?.last_name}"</p>
                  </div>

                  <TextField
                    label="Electronic Signature"
                    value={signature}
                    onChange={(e) => setSignature(e.target.value)}
                    placeholder="Type your first and last name"
                  />

                  <div className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      id="agreeCheck"
                      checked={agreed}
                      onChange={(e) => setAgreed(e.target.checked)}
                      className="h-4 w-4 mt-0.5 rounded border-slate-300 text-primary focus:ring-primary"
                    />
                    <label htmlFor="agreeCheck" className="text-[0.7rem] leading-4 text-slate-600 select-none cursor-pointer">
                      I confirm that I have read, understood, and agree to follow all conditions and guidelines stated in this document.
                    </label>
                  </div>

                  <Button
                    onClick={() => void handleAcknowledge()}
                    disabled={submittingSign}
                    className="w-full justify-center"
                  >
                    {submittingSign ? "Submitting..." : "Submit Acknowledgement"}
                  </Button>
                </div>
              )}
            </SectionCard>
          )}
        </div>
      </div>

      {editingDoc && (
        <DocumentSlideOver
          documentRecord={documentRecord}
          onClose={() => setEditingDoc(false)}
          onSaved={() => {
            setEditingDoc(false);
            void refetch();
          }}
        />
      )}
    </AppShell>
  );
}
