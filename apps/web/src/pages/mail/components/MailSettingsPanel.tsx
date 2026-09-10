import { useState } from 'react';
import { mailApi } from '@/shared/lib/core';
import type { MailAccount } from '@stanforte/shared';

type Props = {
  accounts: MailAccount[];
  onClose: () => void;
  onAddGoogle: () => void;
  onAddMicrosoft: () => void;
  onDisconnect: (id: string) => void;
};

const PROVIDER_LABEL: Record<string, string> = {
  GOOGLE: 'Gmail',
  MICROSOFT: 'Outlook',
};

export function MailSettingsPanel({ accounts, onClose, onAddGoogle, onAddMicrosoft, onDisconnect }: Props) {
  const [editingSigId, setEditingSigId] = useState<string | null>(null);
  const [signatures, setSignatures] = useState<Record<string, string>>(() => {
    const s: Record<string, string> = {};
    for (const a of accounts) {
      s[a.id] = (a as any).signature ?? '';
    }
    return s;
  });
  const [savingId, setSavingId] = useState<string | null>(null);

  const handleSaveSignature = async (accountId: string) => {
    setSavingId(accountId);
    try {
      const sig = signatures[accountId] || '';
      await mailApi.saveSignature(accountId, sig);
      localStorage.setItem(`mail_sig_${accountId}`, sig);
      setEditingSigId(null);
    } catch (err) {
      alert('Failed to save signature');
    } finally {
      setSavingId(null);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.18)' }}
      />

      {/* Panel */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, zIndex: 101,
        width: 320, background: '#fff', boxShadow: '-4px 0 24px rgba(0,0,0,0.12)',
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{ padding: '18px 20px', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontWeight: 700, fontSize: 15, color: '#111827' }}>Mail Settings</span>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: '#9ca3af', lineHeight: 1 }}
          >
            ✕
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
          {/* Connected accounts */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
              Connected Accounts
            </div>

            {accounts.length === 0 ? (
              <p style={{ fontSize: 13, color: '#9ca3af' }}>No accounts connected yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {accounts.map(a => (
                  <div key={a.id} style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: 8, background: '#f9fafb' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {a.label ?? a.emailAddress}
                        </div>
                        <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>
                          {PROVIDER_LABEL[a.provider] ?? a.provider}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button
                          onClick={() => setEditingSigId(prev => prev === a.id ? null : a.id)}
                          style={{ padding: '4px 8px', fontSize: 12, fontWeight: 600, color: '#034785', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 6, cursor: 'pointer' }}
                        >
                          Signature
                        </button>
                        <button
                          onClick={() => onDisconnect(a.id)}
                          style={{ padding: '4px 8px', fontSize: 12, fontWeight: 600, color: '#ef4444', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, cursor: 'pointer' }}
                        >
                          Remove
                        </button>
                      </div>
                    </div>

                    {editingSigId === a.id && (
                      <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: 8, marginTop: 4, display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <textarea
                          placeholder="Write custom signature override (HTML/text)..."
                          value={signatures[a.id] ?? ''}
                          onChange={e => setSignatures(prev => ({ ...prev, [a.id]: e.target.value }))}
                          rows={4}
                          style={{ width: '100%', fontSize: 12, padding: '6px 8px', border: '1px solid #d1d5db', borderRadius: 6, outline: 'none', resize: 'vertical' }}
                        />
                        <button
                          onClick={() => handleSaveSignature(a.id)}
                          disabled={savingId === a.id}
                          style={{
                            padding: '4px 10px', fontSize: 12, fontWeight: 600, color: '#fff',
                            background: '#034785', border: 'none', borderRadius: 6, cursor: 'pointer',
                            opacity: savingId === a.id ? 0.6 : 1
                          }}
                        >
                          {savingId === a.id ? 'Saving...' : 'Save Signature'}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add account */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
              Add Account
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button
                onClick={() => { onClose(); onAddGoogle(); }}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', border: '1px solid #e5e7eb', borderRadius: 8, background: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#111827', textAlign: 'left' }}
              >
                <svg width="18" height="18" viewBox="0 0 48 48">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                </svg>
                Connect Google (Gmail)
              </button>
              <button
                onClick={() => { onClose(); onAddMicrosoft(); }}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', border: '1px solid #e5e7eb', borderRadius: 8, background: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#111827', textAlign: 'left' }}
              >
                <svg width="18" height="18" viewBox="0 0 23 23">
                  <path fill="#f3f3f3" d="M0 0h23v23H0z"/>
                  <path fill="#f35325" d="M1 1h10v10H1z"/>
                  <path fill="#81bc06" d="M12 1h10v10H12z"/>
                  <path fill="#05a6f0" d="M1 12h10v10H1z"/>
                  <path fill="#ffba08" d="M12 12h10v10H12z"/>
                </svg>
                Connect Microsoft (Outlook)
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
