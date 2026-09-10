import type { MailAccount } from '@stanforte/shared';

const GOOGLE_FOLDERS = ['INBOX', '[Gmail]/Sent Mail', '[Gmail]/Drafts', '[Gmail]/Spam', '[Gmail]/Trash'];
const MICROSOFT_FOLDERS = ['INBOX', 'Sent Items', 'Drafts', 'Junk Email', 'Deleted Items'];
const FOLDER_LABELS: Record<string, string> = {
  'INBOX': 'Inbox',
  '[Gmail]/Sent Mail': 'Sent',
  '[Gmail]/Drafts': 'Drafts',
  '[Gmail]/Spam': 'Spam',
  '[Gmail]/Trash': 'Trash',
  'Sent Items': 'Sent',
  'Junk Email': 'Junk',
  'Deleted Items': 'Trash',
  'Drafts': 'Drafts',
};

type Props = {
  accounts: MailAccount[];
  selectedAccountId: string | 'all';
  selectedFolder: string;
  onSelectAccount: (id: string | 'all') => void;
  onSelectFolder: (folder: string) => void;
  onDisconnect: (id: string) => void;
};

export function AccountSidebar({
  accounts, selectedAccountId, selectedFolder,
  onSelectAccount, onSelectFolder, onDisconnect,
}: Props) {
  const selectedAccount = accounts.find(a => a.id === selectedAccountId);
  const folders = selectedAccountId === 'all' || !selectedAccount
    ? ['INBOX']
    : selectedAccount.provider === 'GOOGLE' ? GOOGLE_FOLDERS : MICROSOFT_FOLDERS;

  return (
    <aside style={{ width: 220, borderRight: '1px solid #e5e7eb', height: '100%', overflowY: 'auto', flexShrink: 0 }}>
      <div style={{ padding: '12px 12px 6px', fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        Accounts
      </div>

      <div
        onClick={() => onSelectAccount('all')}
        style={{
          padding: '8px 16px', cursor: 'pointer', fontSize: 13, fontWeight: 600,
          background: selectedAccountId === 'all' ? '#eff6ff' : 'transparent',
          color: selectedAccountId === 'all' ? '#1d4ed8' : '#111827',
        }}
      >
        All Accounts
      </div>

      {accounts.map(a => (
        <div
          key={a.id}
          onClick={() => onSelectAccount(a.id)}
          style={{
            padding: '8px 16px', cursor: 'pointer', fontSize: 13,
            background: selectedAccountId === a.id ? '#eff6ff' : 'transparent',
            color: selectedAccountId === a.id ? '#1d4ed8' : '#374151',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4,
          }}
        >
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {a.label ?? a.emailAddress}
          </span>
          <button
            onClick={e => { e.stopPropagation(); onDisconnect(a.id); }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#d1d5db', fontSize: 12, flexShrink: 0, padding: '0 2px' }}
            title="Disconnect account"
          >
            ✕
          </button>
        </div>
      ))}

      <div style={{ padding: '16px 12px 6px', fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', borderTop: '1px solid #f3f4f6', marginTop: 8 }}>
        Folders
      </div>

      {folders.map(f => (
        <div
          key={f}
          onClick={() => onSelectFolder(f)}
          style={{
            padding: '6px 16px', cursor: 'pointer', fontSize: 13,
            background: selectedFolder === f ? '#eff6ff' : 'transparent',
            color: selectedFolder === f ? '#1d4ed8' : '#374151',
          }}
        >
          {FOLDER_LABELS[f] ?? f}
        </div>
      ))}
    </aside>
  );
}
