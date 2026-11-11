import { useState, useMemo } from "react";
import { Link, useParams, useNavigate } from "@/shared/router-adapter";
import { PortalLayout } from "@/components/layout/PortalLayout";
import { useAuth } from "@/shared/context/AuthProvider";
import { useToast, PageHeader } from "@/shared";
import { useCachedQuery, documentApi } from "@/shared/lib/core";
import DocumentSlideOver from "./DocumentSlideOver";
import DocumentShareModal from "./DocumentShareModal";
import { INITIAL_DOCUMENTS, type DocumentItem, type DocumentSharedRecord } from "./types";
import {
  FileText,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Clock,
  ShieldCheck,
  ChevronRight,
  ArrowLeft,
  Edit3,
  User,
  Share2,
  Paperclip,
  Download,
  ExternalLink,
  Mail,
  MessageSquare,
  Users,
} from "lucide-react";

export default function DocumentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [signature, setSignature] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [submittingSign, setSubmittingSign] = useState(false);
  const [editingDoc, setEditingDoc] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [localRefresh, setLocalRefresh] = useState(0);

  const { data: apiRecord, loading, refetch } = useCachedQuery(
    `documents:detail:${id}`,
    () => (id ? documentApi.get(id).catch(() => null) : Promise.resolve(null)),
    { ttlMs: 1000 * 10 }
  );

  const documentRecord: DocumentItem | null = useMemo(() => {
    const raw = (apiRecord as any)?.data ?? apiRecord;

    // Check local catalog first
    try {
      const saved: DocumentItem[] = JSON.parse(
        localStorage.getItem("portal_documents_catalog") || "[]"
      );
      const found = saved.find((d) => d.id === id || d.slug === id);
      if (found) return found;
    } catch {}

    if (raw?.id) return raw;

    // Check INITIAL_DOCUMENTS
    const foundInitial = INITIAL_DOCUMENTS.find(
      (d) => d.id === id || d.slug === id
    );
    if (foundInitial) return foundInitial;

    return null;
  }, [apiRecord, id, localRefresh]);

  const userName =
    `${user?.first_name || ""} ${user?.last_name || ""}`.trim() ||
    user?.email ||
    "Staff Member";

  const userPerms = user?.permissions ?? [];
  const isHrOrAdmin =
    userPerms.includes("*") ||
    userPerms.includes("hr.manage") ||
    userPerms.includes("settings.manage");

  function handleDocumentShared(record: DocumentSharedRecord) {
    if (!documentRecord) return;
    try {
      const saved = JSON.parse(localStorage.getItem("portal_documents_catalog") || "[]");
      const updated = saved.map((d: any) => {
        if (d.id === documentRecord.id) {
          const shares = d.shares || [];
          return { ...d, shares: [record, ...shares] };
        }
        return d;
      });
      if (!saved.some((d: any) => d.id === documentRecord.id)) {
        updated.unshift({
          ...documentRecord,
          shares: [record, ...(documentRecord.shares || [])],
        });
      }
      localStorage.setItem("portal_documents_catalog", JSON.stringify(updated));
      setLocalRefresh((c) => c + 1);
    } catch {}
  }

  async function handleAcknowledge() {
    if (!agreed) {
      showToast({
        tone: "warning",
        title: "Agreement Required",
        message: "You must check the agreement box before submitting your signature.",
      });
      return;
    }
    const expectedName = `${user?.first_name || ""} ${user?.last_name || ""}`
      .trim()
      .toLowerCase();
    if (expectedName && signature.trim().toLowerCase() !== expectedName) {
      showToast({
        tone: "warning",
        title: "Signature Mismatch",
        message: `Your signature must match your full name: "${user?.first_name || ""} ${user?.last_name || ""}".`,
      });
      return;
    }

    try {
      setSubmittingSign(true);
      if (id) {
        await documentApi.acknowledge(id, {
          ip_address: "127.0.0.1",
          user_agent: navigator.userAgent,
        }).catch(() => null);
      }

      // Update local acknowledgements
      try {
        const saved = JSON.parse(localStorage.getItem("portal_documents_catalog") || "[]");
        const ackItem = {
          id: `ack-${Date.now()}`,
          user_name: userName,
          acknowledged_at: new Date().toISOString(),
          version: documentRecord?.version || "v1.0",
        };
        const updated = saved.map((d: any) => {
          if (d.id === id) {
            return { ...d, acknowledgements: [ackItem, ...(d.acknowledgements || [])] };
          }
          return d;
        });
        if (!saved.some((d: any) => d.id === id) && documentRecord) {
          updated.unshift({
            ...documentRecord,
            acknowledgements: [ackItem, ...(documentRecord.acknowledgements || [])],
          });
        }
        localStorage.setItem("portal_documents_catalog", JSON.stringify(updated));
        setLocalRefresh((c) => c + 1);
      } catch {}

      showToast({
        tone: "success",
        title: "Signed Off",
        message: "You have formally acknowledged this document.",
      });
      void refetch();
    } catch (err: any) {
      showToast({
        tone: "danger",
        title: "Signature Failed",
        message: err?.message || "Failed to submit signature",
      });
    } finally {
      setSubmittingSign(false);
    }
  }

  if (loading && !documentRecord) {
    return (
      <PortalLayout activeNav="Documents">
        <div className="flex flex-col items-center justify-center h-64 gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-[#ff6900] border-t-transparent animate-spin" />
          <p className="text-xs font-semibold text-slate-500">Loading document details...</p>
        </div>
      </PortalLayout>
    );
  }

  if (!documentRecord) {
    return (
      <PortalLayout activeNav="Documents">
        <div className="p-12 text-center max-w-md mx-auto bg-white rounded-3xl border border-slate-200/80 shadow-sm mt-8">
          <FileText className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <h2 className="text-base font-bold text-slate-900 font-headline">Document Not Found</h2>
          <p className="text-xs text-slate-500 mt-1 mb-5">
            The requested document record does not exist or you do not have permission to view it.
          </p>
          <Link
            to="/documents"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Documents</span>
          </Link>
        </div>
      </PortalLayout>
    );
  }

  const ack = Array.isArray(documentRecord.acknowledgements)
    ? documentRecord.acknowledgements[0]
    : null;
  const isSigned = !!ack;
  const sharesList = documentRecord.shares || [];

  return (
    <PortalLayout activeNav="Documents">
      <div className="space-y-6 max-w-[1400px] mx-auto pb-12">
        {/* Modern Unified Grounded Header (No Breadcrumbs) */}
        <PageHeader
          title={documentRecord.title}
          description={`Category: ${documentRecord.category?.toUpperCase()} • Revision ${documentRecord.version || "v1.0"} • Effective: ${documentRecord.effective_date || "Active Immediately"}`}
          icon={FileText}
          iconColor="bg-orange-50 text-[#ff6900]"
          actions={
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setShareModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#ff6900] hover:bg-[#ea580c] active:scale-95 text-white text-xs font-bold shadow-md shadow-orange-500/20 transition"
              >
                <Share2 className="h-4 w-4" />
                <span>Share Document</span>
              </button>

              {isHrOrAdmin && (
                <button
                  type="button"
                  onClick={() => setEditingDoc(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-bold transition shadow-xs"
                >
                  <Edit3 className="h-4 w-4 text-slate-500" />
                  <span>Edit</span>
                </button>
              )}

              <Link
                to="/documents"
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-bold transition shadow-xs"
              >
                <ArrowLeft className="h-4 w-4 text-slate-500" />
                <span>Back</span>
              </Link>
            </div>
          }
        />

        {/* 4 Summary Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-50 text-[#ff6900] flex items-center justify-center shrink-0">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <div className="text-[11px] font-semibold text-slate-500">Document Type</div>
              <div className="text-base font-black text-slate-900 capitalize mt-0.5">
                {documentRecord.category || "General"}
              </div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <div className="text-[11px] font-semibold text-slate-500">Revision</div>
              <div className="text-base font-black text-slate-900 mt-0.5 font-mono">
                {documentRecord.version || "v1.0"}
              </div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                isSigned
                  ? "bg-emerald-50 text-emerald-600"
                  : documentRecord.require_acknowledgement
                  ? "bg-amber-50 text-amber-600"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              {isSigned ? (
                <CheckCircle2 className="h-5 w-5" />
              ) : (
                <ShieldCheck className="h-5 w-5" />
              )}
            </div>
            <div>
              <div className="text-[11px] font-semibold text-slate-500">Your Status</div>
              <div
                className={`text-base font-black capitalize mt-0.5 ${
                  isSigned
                    ? "text-emerald-600"
                    : documentRecord.require_acknowledgement
                    ? "text-amber-600"
                    : "text-slate-700"
                }`}
              >
                {isSigned
                  ? "Acknowledged"
                  : documentRecord.require_acknowledgement
                  ? "Sign-off Needed"
                  : "Active"}
              </div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <div className="text-[11px] font-semibold text-slate-500">Sharing Activity</div>
              <div className="text-base font-black text-slate-900 mt-0.5">
                {sharesList.length} Colleague{sharesList.length === 1 ? "" : "s"}
              </div>
            </div>
          </div>
        </div>

        {/* Attached File Banner (if document has an uploaded file) */}
        {documentRecord.file && (
          <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-orange-50 text-[#ff6900] flex items-center justify-center shrink-0 shadow-xs">
                <Paperclip className="h-6 w-6" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Attached File Asset
                </span>
                <h4 className="text-sm font-bold text-slate-900">
                  {documentRecord.file.file_name}
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  {documentRecord.file.mime_type || "application/pdf"}
                  {documentRecord.file.file_size
                    ? ` • ${(documentRecord.file.file_size / 1024 / 1024).toFixed(2)} MB`
                    : ""}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {documentRecord.file.public_url && (
                <a
                  href={documentRecord.file.public_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition shadow-xs"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span>Preview / Download</span>
                </a>
              )}
              <button
                type="button"
                onClick={() => setShareModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition shadow-xs"
              >
                <Share2 className="h-3.5 w-3.5 text-[#ff6900]" />
                <span>Share File</span>
              </button>
            </div>
          </div>
        )}

        {/* Document Content View */}
        <div className="p-8 rounded-3xl bg-white border border-slate-200/80 shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider font-headline">
                Document Body & Directives
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Authored by {documentRecord.author_name || "Enterprise Operations"}
              </p>
            </div>
          </div>

          <div className="prose prose-sm max-w-none text-slate-800 leading-relaxed font-sans">
            {documentRecord.content_html ? (
              <div
                dangerouslySetInnerHTML={{ __html: documentRecord.content_html }}
                className="space-y-4"
              />
            ) : (
              <p className="text-slate-400 italic">No textual content provided for this document.</p>
            )}
          </div>
        </div>

        {/* Sharing History & Notifications Card */}
        <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <Share2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 font-headline">
                  Shared With & Delivery Log
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Record of colleagues who received this document via email and in-app chat
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShareModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-orange-50 hover:bg-[#ff6900] text-[#ff6900] hover:text-white border border-orange-200/80 hover:border-[#ff6900] text-xs font-bold transition shadow-xs"
            >
              <Share2 className="h-3.5 w-3.5" />
              <span>Share with Colleague</span>
            </button>
          </div>

          {sharesList.length === 0 ? (
            <div className="p-6 text-center rounded-2xl bg-slate-50 border border-slate-100">
              <Users className="h-6 w-6 text-slate-300 mx-auto mb-1.5" />
              <p className="text-xs font-bold text-slate-600">Not shared with anyone yet</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Share this document to notify team members in real-time.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
              {sharesList.map((share) => (
                <div
                  key={share.id}
                  className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/80 flex items-start gap-3.5"
                >
                  <div className="w-9 h-9 rounded-full bg-[#ff6900] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                    {share.recipient_avatar || "U"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-bold text-slate-900 truncate">
                        {share.recipient_name}
                      </p>
                      <span className="text-[10px] text-slate-400 whitespace-nowrap">
                        {new Date(share.shared_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 truncate">
                      {share.recipient_email}
                      {share.recipient_role ? ` • ${share.recipient_role}` : ""}
                    </p>
                    {share.message && (
                      <p className="text-xs text-slate-700 italic bg-white p-2 rounded-xl border border-slate-100 mt-2">
                        "{share.message}"
                      </p>
                    )}
                    <div className="flex items-center gap-1.5 mt-2">
                      {share.channels.includes("chat") && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-orange-100 text-[#ff6900]">
                          <MessageSquare className="h-2.5 w-2.5" /> Chat Notification
                        </span>
                      )}
                      {share.channels.includes("email") && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-blue-100 text-blue-700">
                          <Mail className="h-2.5 w-2.5" /> Email Sent
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Acknowledgement Sign-off Box */}
        {documentRecord.require_acknowledgement && (
          <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 font-headline">
                  Formal Compliance Acknowledgement
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Your formal sign-off verifies that you have read and agreed to adhere to these provisions.
                </p>
              </div>
            </div>

            {isSigned ? (
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between text-xs text-emerald-800">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                  <div>
                    <p className="font-bold">Formally Signed and Verified</p>
                    <p className="text-[11px] text-emerald-700">
                      Acknowledged by {userName} on{" "}
                      {new Date(ack.acknowledged_at || Date.now()).toLocaleDateString()}.
                    </p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-lg bg-emerald-100 font-mono text-[10px] font-bold text-emerald-800">
                  SECURE COMPLIANT
                </span>
              </div>
            ) : (
              <div className="space-y-4 pt-2">
                <label className="flex items-start gap-2.5 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={agreed}
                    onChange={(e) => setAgreed(e.target.checked)}
                    className="mt-0.5 rounded border-slate-300 text-[#ff6900] focus:ring-[#ff6900]"
                  />
                  <span>
                    I confirm that I have thoroughly read, understood, and agree to abide by all the terms, obligations, and directives set forth in this document.
                  </span>
                </label>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 max-w-lg">
                  <input
                    type="text"
                    placeholder={`Type "${userName}" to sign`}
                    value={signature}
                    onChange={(e) => setSignature(e.target.value)}
                    className="flex-1 px-3.5 py-2 text-xs bg-slate-50 rounded-xl border border-slate-200 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#ff6900] focus:ring-1 focus:ring-[#ff6900]"
                  />
                  <button
                    type="button"
                    onClick={handleAcknowledge}
                    disabled={submittingSign || !agreed || !signature.trim()}
                    className="px-5 py-2.5 rounded-xl bg-[#ff6900] hover:bg-[#ea580c] disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-orange-500/20 transition whitespace-nowrap active:scale-95"
                  >
                    {submittingSign ? "Submitting..." : "Sign Document"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {editingDoc && (
        <DocumentSlideOver
          documentRecord={documentRecord}
          onClose={() => setEditingDoc(false)}
          onSaved={() => {
            setEditingDoc(false);
            setLocalRefresh((c) => c + 1);
            void refetch();
          }}
        />
      )}

      {/* Share Document Modal */}
      <DocumentShareModal
        document={documentRecord}
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        onShared={handleDocumentShared}
      />
    </PortalLayout>
  );
}
