import { useState } from 'react';
import DOMPurify from 'dompurify';
import { useMailBody } from '../hooks/useMailBody';
import { mailApi } from '@/shared/lib/core';
import { Button, Icon } from '@/shared';
import type { MailHeader } from '@stanforte/shared';

type Props = {
  accountId: string;
  header: MailHeader;
  onReply: () => void;
  onForward: () => void;
  onDeleted?: () => void;
  onToggleRead?: (isRead: boolean) => void;
  onBack?: () => void;
};

export function MessageDetail({ accountId, header, onReply, onForward, onDeleted, onToggleRead, onBack }: Props) {
  const { html, text, loading } = useMailBody(accountId, header.uid, header.folder);
  const [actionLoading, setActionLoading] = useState(false);

  const safeHtml = html
    ? DOMPurify.sanitize(html, { USE_PROFILES: { html: true } })
    : text
      ? `<pre style="white-space:pre-wrap;font-family:inherit;margin:0">${text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</pre>`
      : '';

  const handleToggleRead = async () => {
    setActionLoading(true);
    try {
      const nextRead = !header.isRead;
      await mailApi.markRead(accountId, header.uid, header.folder, nextRead);
      onToggleRead?.(nextRead);
    } catch (err) {
      console.error('Failed to toggle read state', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleTrash = async () => {
    if (!window.confirm('Are you sure you want to move this message to Trash?')) return;
    setActionLoading(true);
    try {
      await mailApi.trashMessage(accountId, header.uid, header.folder);
      onDeleted?.();
    } catch (err) {
      console.error('Failed to trash message', err);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#fff' }}>
      {/* Top Action Bar (MacBook Mail Style) */}
      <div className="px-4 py-2 border-b border-slate-200 flex gap-2 items-center bg-slate-50">
        {onBack && (
          <Button
            variant="secondary"
            size="sm"
            onClick={onBack}
            className="md:hidden"
          >
            <Icon name="arrow_back" className="mr-1" /> Back
          </Button>
        )}
        <Button
          variant="secondary"
          size="sm"
          onClick={onReply}
          disabled={actionLoading}
        >
          <Icon name="reply" className="mr-1.5" /> Reply
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={onForward}
          disabled={actionLoading}
        >
          <Icon name="forward" className="mr-1.5" /> Forward
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={handleToggleRead}
          disabled={actionLoading}
        >
          <Icon name={header.isRead ? "mark_as_unread" : "drafts"} className="mr-1.5" />
          {header.isRead ? 'Mark Unread' : 'Mark Read'}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleTrash}
          disabled={actionLoading}
          className="ml-auto text-danger hover:bg-danger/5"
        >
          <Icon name="delete" className="mr-1" /> Delete
        </Button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
        <div style={{ marginBottom: 16, borderBottom: '1px solid #f3f4f6', paddingBottom: 16 }}>
          <h2 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 700, color: '#111827' }}>
            {header.subject ?? '(no subject)'}
          </h2>
          <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 2 }}>
            From: {header.fromName ? `${header.fromName} <${header.fromEmail}>` : (header.fromEmail ?? 'Unknown')}
          </div>
          <div style={{ fontSize: 13, color: '#6b7280' }}>
            Date: {header.date ? new Date(header.date).toLocaleString() : '—'}
          </div>
        </div>

        {loading ? (
          <div style={{ color: '#9ca3af', fontSize: 13 }}>Loading message…</div>
        ) : (
          <div
            dangerouslySetInnerHTML={{ __html: safeHtml }}
            style={{ fontSize: 14, lineHeight: 1.7, color: '#111827' }}
          />
        )}
      </div>
    </div>
  );
}
