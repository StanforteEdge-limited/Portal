import { useState } from "react";
import { Link, useParams, useNavigate } from "@/shared/router-adapter";
import { PortalLayout } from "@/components/layout/PortalLayout";
import { useAuth } from "@/shared/context/AuthProvider";
import { useToast } from "@/shared";
import { useCachedQuery, documentApi } from "@/shared/lib/core";
import { getWorkspaceProfile } from "@/shared/api/workspace-api";
import DocumentSlideOver from "./DocumentSlideOver";
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
  ExternalLink,
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

  const { data: documentRecord, loading, refetch } = useCachedQuery(
    `documents:detail:${id}`,
    () => (id ? documentApi.get(id) : Promise.resolve(null))
  );

  const userName =
    `${user?.first_name || ""} ${user?.last_name || ""}`.trim() ||
    user?.email ||
    "Staff Member";

  const userPerms = user?.permissions ?? [];
  const isHrOrAdmin =
    userPerms.includes("*") ||
    userPerms.includes("hr.manage") ||
    userPerms.includes("settings.manage");

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
    if (signature.trim().toLowerCase() !== expectedName) {
      showToast({
        tone: "warning",
        title: "Signature Mismatch",
        message: `Your signature must exactly match your full name: "${user?.first_name || ""} ${user?.last_name || ""}".`,
      });
      return;
    }

    try {
      setSubmittingSign(true);
      await documentApi.acknowledge(id!, {
        ip_address: "127.0.0.1",
        user_agent: navigator.userAgent,
      });
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

  if (loading) {
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
        <div className="p-12 text-center max-w-md mx-auto bg-white rounded-2xl border border-slate-200/80 shadow-sm mt-8">
          <FileText className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <h2 className="text-base font-bold text-slate-900">Document Not Found</h2>
          <p className="text-xs text-slate-500 mt-1 mb-5">
            The requested document record does not exist or you do not have permission to view it.
          </p>
          <Link
            to="/documents"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0a1128] text-white text-xs font-bold hover:bg-slate-800 transition"
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

  return (
    <PortalLayout activeNav="Documents">
      <div className="space-y-6">
        {/* Breadcrumb & Navigation */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-1">
              <Link to="/documents" className="hover:text-slate-800 transition">
                Documents
              </Link>
              <ChevronRight className="h-3 w-3 text-slate-400" />
              <span className="text-[#ff6900] truncate max-w-xs">{documentRecord.title}</span>
            </div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-black text-slate-900 tracking-tight font-headline">
                {documentRecord.title}
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700">
                {documentRecord.category || "General"}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-blue-50 text-blue-700">
                v{documentRecord.version || "1.0"}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Effective Date:{" "}
              {documentRecord.effective_date
                ? new Date(documentRecord.effective_date).toLocaleDateString()
                : "Active Immediately"}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {isHrOrAdmin && (
              <button
                type="button"
                onClick={() => setEditingDoc(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition shadow-sm"
              >
                <Edit3 className="h-3.5 w-3.5" />
                <span>Edit Document</span>
              </button>
            )}

            <Link
              to="/documents"
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 transition shadow-sm"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Directory</span>
            </Link>
          </div>
        </div>

        {/* 4 Summary Cards */}
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
                Version {documentRecord.version || "1.0"}
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
                  : "View Only"}
              </div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <div className="text-[11px] font-semibold text-slate-500">Effective Date</div>
              <div className="text-base font-black text-slate-900 mt-0.5">
                {documentRecord.effective_date
                  ? new Date(documentRecord.effective_date).toLocaleDateString()
                  : "Immediate"}
              </div>
            </div>
          </div>
        </div>

        {/* Document Content Paper View */}
        <div className="p-8 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-6">
          {documentRecord.description && (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-600">
              <p className="font-bold text-slate-900 mb-1">Scope & Purpose</p>
              <p>{documentRecord.description}</p>
            </div>
          )}

          <div className="prose prose-sm max-w-none text-slate-800 leading-relaxed font-sans">
            {documentRecord.content ? (
              <div
                dangerouslySetInnerHTML={{ __html: documentRecord.content }}
                className="space-y-4"
              />
            ) : (
              <p className="text-slate-400 italic">No textual content provided for this document.</p>
            )}
          </div>
        </div>

        {/* Acknowledgement Sign-off Box */}
        {documentRecord.require_acknowledgement && (
          <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Formal Compliance Acknowledgement
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Your formal sign-off verifies that you have read and agreed to adhere to these provisions.
                </p>
              </div>
            </div>

            {isSigned ? (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between text-xs text-emerald-800">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                  <div>
                    <p className="font-bold">Formally Signed and Verified</p>
                    <p className="text-[11px] text-emerald-700">
                      Acknowledged by {userName} on{" "}
                      {new Date(ack.created_at || Date.now()).toLocaleDateString()}.
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
                    className="flex-1 px-3 py-2 text-xs bg-slate-50 rounded-xl border border-slate-200 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#ff6900] focus:ring-1 focus:ring-[#ff6900]"
                  />
                  <button
                    type="button"
                    onClick={handleAcknowledge}
                    disabled={submittingSign || !agreed || !signature.trim()}
                    className="px-5 py-2 rounded-xl bg-[#ff6900] hover:bg-[#ea580c] disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-orange-500/20 transition whitespace-nowrap"
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
            void refetch();
          }}
        />
      )}
    </PortalLayout>
  );
}
