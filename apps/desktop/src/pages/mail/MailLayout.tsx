import { useState, useCallback } from 'react';
import { AccountSidebar } from './components/AccountSidebar';
import { MessageList } from './components/MessageList';
import { MessageDetail } from './components/MessageDetail';
import { ComposeModal } from './components/ComposeModal';
import { AccountConnectPrompt } from './components/AccountConnectPrompt';
import { MailSettingsPanel } from './components/MailSettingsPanel';
import { SyncButton } from './components/SyncButton';
import { useMailAccounts } from './hooks/useMailAccounts';
import { useMailSync } from './hooks/useMailSync';
import { useMailHeaders } from './hooks/useMailHeaders';
import { SlideOver, SlideOverContent, SlideOverHeader, Button, Icon } from '@/shared';
import type { MailHeader } from '@stanforte/shared';

export function MailLayout() {
  const { accounts, loading, connectGoogle, connectMicrosoft, disconnect } = useMailAccounts();
  const [selectedAccountId, setSelectedAccountId] = useState<string | 'all'>('all');
  const [selectedFolder, setSelectedFolder] = useState('INBOX');
  const [selectedHeader, setSelectedHeader] = useState<MailHeader | null>(null);
  const [compose, setCompose] = useState<{ mode: 'compose' | 'reply' | 'forward'; header?: MailHeader } | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Which account IDs to show in the message list
  const listAccountIds = selectedAccountId === 'all'
    ? accounts.map(a => a.id)
    : accounts.map(a => a.id).filter(id => id === selectedAccountId);

  const { headers, loading: headersLoading, loadMore, hasMore, refresh: refreshHeaders } = useMailHeaders(listAccountIds, selectedFolder);

  const handleSyncComplete = useCallback(() => {
    refreshHeaders();
  }, [refreshHeaders]);

  const { sync, syncing, lastSyncedAt } = useMailSync(accounts, handleSyncComplete);

  // Trigger sync on first account load
  const [hasSynced, setHasSynced] = useState(false);
  if (!loading && accounts.length > 0 && !hasSynced) {
    setHasSynced(true);
    void sync();
  }

  // Which account to use for message detail — prefer the header's own accountId
  const activeAccountId: string | null =
    selectedHeader?.accountId
    ?? (selectedAccountId === 'all' ? (accounts[0]?.id ?? null) : selectedAccountId);

  if (loading) {
    return <div className="flex items-center justify-center h-full text-slate-400 text-sm">Loading…</div>;
  }

  if (accounts.length === 0) {
    return <AccountConnectPrompt onConnectGoogle={connectGoogle} onConnectMicrosoft={connectMicrosoft} />;
  }

  return (
    <div className="flex flex-1 h-full overflow-hidden rounded-xl border border-slate-200 bg-white font-sans shadow-sm">
      {/* Desktop Sidebar */}
      <div className="hidden md:block">
        <AccountSidebar
          accounts={accounts}
          selectedAccountId={selectedAccountId}
          selectedFolder={selectedFolder}
          onSelectAccount={id => { setSelectedAccountId(id); setSelectedHeader(null); }}
          onSelectFolder={f => { setSelectedFolder(f); setSelectedHeader(null); }}
          onDisconnect={disconnect}
        />
      </div>

      {/* Mobile Sidebar (SlideOver Drawer) */}
      {mobileSidebarOpen && (
        <SlideOver open={mobileSidebarOpen} onClose={() => setMobileSidebarOpen(false)}>
          <SlideOverHeader title="Accounts & Folders" onClose={() => setMobileSidebarOpen(false)} />
          <SlideOverContent>
            <AccountSidebar
              accounts={accounts}
              selectedAccountId={selectedAccountId}
              selectedFolder={selectedFolder}
              onSelectAccount={id => { setSelectedAccountId(id); setSelectedHeader(null); setMobileSidebarOpen(false); }}
              onSelectFolder={f => { setSelectedFolder(f); setSelectedHeader(null); setMobileSidebarOpen(false); }}
              onDisconnect={disconnect}
            />
          </SlideOverContent>
        </SlideOver>
      )}

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Toolbar */}
        <div className="px-4 py-2 border-b border-slate-200 flex justify-between items-center shrink-0 bg-slate-50">
          <div className="flex items-center gap-2">
            {/* Toggle folders button on mobile */}
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setMobileSidebarOpen(true)}
              className="md:hidden"
              title="Show folders"
            >
              <Icon name="folder" className="mr-1" /> Folders
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setCompose({ mode: 'compose' })}
            >
              <Icon name="add" className="mr-1" /> Compose
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <SyncButton onSync={sync} syncing={syncing} lastSyncedAt={lastSyncedAt} />
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowSettings(true)}
              title="Mail settings"
            >
              <Icon name="settings" />
            </Button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Message List Pane */}
          {listAccountIds.length === 0 ? (
            <div className="w-full md:w-80 border-r border-slate-200 flex items-center justify-center text-slate-400 text-sm">
              Select an account
            </div>
          ) : (
            <div className={`w-full md:w-80 border-r border-slate-200 flex flex-col ${selectedHeader ? 'hidden md:flex' : 'flex'}`}>
              <MessageList
                headers={headers}
                loading={headersLoading}
                hasMore={hasMore}
                loadMore={loadMore}
                selectedUid={selectedHeader?.uid ?? null}
                onSelect={h => setSelectedHeader(h)}
              />
            </div>
          )}

          {/* Message Detail Pane */}
          <div className={`flex-1 flex flex-col ${selectedHeader ? 'flex' : 'hidden md:flex'}`}>
            {selectedHeader && activeAccountId ? (
              <MessageDetail
                accountId={activeAccountId}
                header={selectedHeader}
                onReply={() => setCompose({ mode: 'reply', header: selectedHeader })}
                onForward={() => setCompose({ mode: 'forward', header: selectedHeader })}
                onDeleted={() => {
                  setSelectedHeader(null);
                  refreshHeaders();
                }}
                onToggleRead={(isRead: boolean) => {
                  setSelectedHeader(prev => prev ? { ...prev, isRead } : null);
                  refreshHeaders();
                }}
                onBack={() => setSelectedHeader(null)} // Mobile back button handler
              />
            ) : (
              <div className="flex-1 flex items-center justify-center text-slate-400 text-sm bg-slate-50">
                Select a message to read
              </div>
            )}
          </div>
        </div>
      </div>

      {compose && activeAccountId && (
        <ComposeModal
          accountId={activeAccountId}
          mode={compose.mode}
          originalHeader={compose.header}
          onClose={() => setCompose(null)}
          onSent={() => setCompose(null)}
        />
      )}

      {showSettings && (
        <MailSettingsPanel
          accounts={accounts}
          onClose={() => setShowSettings(false)}
          onAddGoogle={connectGoogle}
          onAddMicrosoft={connectMicrosoft}
          onDisconnect={disconnect}
        />
      )}
    </div>
  );
}
