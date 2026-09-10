import { useState, useMemo } from 'react';
import { useMailHeaders } from '../hooks/useMailHeaders';
import type { MailHeader } from '@stanforte/shared';

type Props = {
  headers: MailHeader[];
  loading: boolean;
  hasMore: boolean;
  loadMore: () => void;
  selectedUid: string | null;
  onSelect: (header: MailHeader) => void;
};

export function MessageList({ headers, loading, hasMore, loadMore, selectedUid, onSelect }: Props) {
  const [search, setSearch] = useState('');

  const filteredHeaders = useMemo(() => {
    if (!search.trim()) return headers;
    const q = search.toLowerCase();
    return headers.filter(h => 
      (h.subject ?? '').toLowerCase().includes(q) ||
      (h.fromName ?? '').toLowerCase().includes(q) ||
      (h.fromEmail ?? '').toLowerCase().includes(q) ||
      (h.snippet ?? '').toLowerCase().includes(q)
    );
  }, [headers, search]);

  return (
    <div style={{ width: 320, borderRight: '1px solid #e5e7eb', overflowY: 'auto', flexShrink: 0, display: 'flex', flexDirection: 'column', background: '#fff' }}>
      {/* Search Bar */}
      <div style={{ padding: '8px 12px', borderBottom: '1px solid #e5e7eb', background: '#f9fafb' }}>
        <div style={{ position: 'relative' }}>
          <input
            type="text"
            placeholder="Search mail..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '6px 10px 6px 28px',
              fontSize: 13,
              borderRadius: 6,
              border: '1px solid #d1d5db',
              outline: 'none',
              background: '#fff',
            }}
          />
          <span style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', fontSize: 13 }}>
            🔍
          </span>
          {search && (
            <button
              onClick={() => setSearch('')}
              style={{
                position: 'absolute',
                right: 8,
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                color: '#9ca3af',
                cursor: 'pointer',
                fontSize: 12,
              }}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {loading && filteredHeaders.length === 0 && (
        <div style={{ padding: 24, color: '#9ca3af', fontSize: 13, textAlign: 'center' }}>Loading…</div>
      )}

      {!loading && filteredHeaders.length === 0 && (
        <div style={{ padding: 24, color: '#9ca3af', fontSize: 13, textAlign: 'center' }}>No messages found.</div>
      )}

      {filteredHeaders.map(h => (
        <div
          key={h.uid}
          onClick={() => onSelect(h)}
          style={{
            padding: '12px 14px',
            cursor: 'pointer',
            borderBottom: '1px solid #f3f4f6',
            background: selectedUid === h.uid ? '#eff6ff' : '#fff',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
          }}
        >
          {/* Blue Dot Unread Indicator */}
          {!h.isRead && (
            <div
              style={{
                position: 'absolute',
                left: 4,
                top: '16px',
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: '#3b82f6',
              }}
            />
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span
              style={{
                fontSize: 13,
                fontWeight: h.isRead ? 500 : 700,
                color: '#111827',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                maxWidth: '65%',
              }}
            >
              {h.fromName ?? h.fromEmail ?? '(unknown)'}
            </span>
            <span style={{ fontSize: 11, color: '#9ca3af', flexShrink: 0 }}>
              {h.date ? new Date(h.date).toLocaleDateString() : ''}
            </span>
          </div>

          <div
            style={{
              fontSize: 12,
              fontWeight: h.isRead ? 400 : 600,
              color: '#374151',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 4,
            }}
          >
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
              {h.subject ?? '(no subject)'}
            </span>
            {h.hasAttachment && (
              <span style={{ color: '#9ca3af', fontSize: 12, flexShrink: 0 }} title="Has attachment">
                📎
              </span>
            )}
          </div>

          {h.snippet && (
            <div style={{ fontSize: 11, color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', maxHeight: 32, lineHeight: '16px' }}>
              {h.snippet}
            </div>
          )}
        </div>
      ))}

      {hasMore && (
        <button
          onClick={loadMore}
          style={{ margin: 12, padding: '7px', border: '1px solid #e5e7eb', borderRadius: 6, cursor: 'pointer', background: '#fff', fontSize: 12, color: '#374151' }}
        >
          {loading ? 'Loading…' : 'Load more'}
        </button>
      )}
    </div>
  );
}
