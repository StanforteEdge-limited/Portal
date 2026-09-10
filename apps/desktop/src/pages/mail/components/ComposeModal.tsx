import { useState, useEffect } from 'react';
import { mailApi } from '@/shared/lib/core';
import type { MailHeader, SendMessageDto } from '@stanforte/shared';

type Mode = 'compose' | 'reply' | 'forward';

type Props = {
  accountId: string;
  mode: Mode;
  originalHeader?: MailHeader;
  onClose: () => void;
  onSent: () => void;
};

export function ComposeModal({ accountId, mode, originalHeader, onClose, onSent }: Props) {
  const [to, setTo] = useState(mode === 'reply' ? (originalHeader?.fromEmail ?? '') : '');
  const [subject, setSubject] = useState(() => {
    if (!originalHeader) return '';
    if (mode === 'reply') return originalHeader.subject?.startsWith('Re:') ? originalHeader.subject : `Re: ${originalHeader.subject ?? ''}`;
    if (mode === 'forward') return `Fwd: ${originalHeader.subject ?? ''}`;
    return '';
  });
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadSignature = async () => {
      try {
        const res = await mailApi.getProcessedSignature(accountId);
        if (res?.html) {
          // If plain text signature, just convert basic html newlines or keep HTML formatting
          const cleanSig = res.html.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]*>/g, '');
          setBody(prev => prev ? prev + '\n\n' + cleanSig : '\n\n' + cleanSig);
        }
      } catch (err) {
        console.error('Failed to load signature', err);
      }
    };
    void loadSignature();
  }, [accountId]);

  async function handleSend() {
    if (!to.trim() || !subject.trim()) return;
    setSending(true);
    setError(null);
    const dto: SendMessageDto = { to: to.trim(), subject: subject.trim(), body };
    try {
      if (mode === 'reply') await mailApi.replyMessage(accountId, dto);
      else if (mode === 'forward') await mailApi.forwardMessage(accountId, dto);
      else await mailApi.sendMessage(accountId, dto);
      onSent();
      onClose();
    } catch (e: any) {
      setError(e?.message ?? 'Failed to send message');
    } finally {
      setSending(false);
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.25)', display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end', zIndex: 1000, padding: 24 }}>
      <div style={{ background: '#fff', borderRadius: 12, width: 540, boxShadow: '0 8px 32px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column', maxHeight: '80vh' }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 700, fontSize: 14 }}>
            {mode === 'compose' ? 'New Message' : mode === 'reply' ? 'Reply' : 'Forward'}
          </span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: '#9ca3af' }}>✕</button>
        </div>

        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10, flex: 1, overflowY: 'auto' }}>
          <input
            value={to}
            onChange={e => setTo(e.target.value)}
            placeholder="To"
            style={{ border: '1px solid #e5e7eb', borderRadius: 6, padding: '7px 10px', fontSize: 13, outline: 'none' }}
          />
          <input
            value={subject}
            onChange={e => setSubject(e.target.value)}
            placeholder="Subject"
            style={{ border: '1px solid #e5e7eb', borderRadius: 6, padding: '7px 10px', fontSize: 13, outline: 'none' }}
          />
          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            placeholder="Write your message…"
            rows={10}
            style={{ border: '1px solid #e5e7eb', borderRadius: 6, padding: '7px 10px', fontSize: 13, resize: 'vertical', outline: 'none', fontFamily: 'inherit' }}
          />
          {error && <div style={{ color: '#dc2626', fontSize: 12 }}>{error}</div>}
        </div>

        <div style={{ padding: '8px 16px 16px', display: 'flex', justifyContent: 'flex-end', gap: 8, borderTop: '1px solid #f3f4f6' }}>
          <button
            onClick={onClose}
            style={{ padding: '7px 18px', border: '1px solid #e5e7eb', borderRadius: 6, cursor: 'pointer', background: '#fff', fontSize: 13 }}
          >
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={sending || !to.trim() || !subject.trim()}
            style={{
              padding: '7px 20px', background: '#034785', color: '#fff', border: 'none',
              borderRadius: 6, cursor: sending ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: 13,
              opacity: sending || !to.trim() || !subject.trim() ? 0.6 : 1,
            }}
          >
            {sending ? 'Sending…' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  );
}
