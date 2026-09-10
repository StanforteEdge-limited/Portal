import { Button, Icon } from '@/shared';

type Props = { onSync: () => void; syncing: boolean; lastSyncedAt: Date | null };

export function SyncButton({ onSync, syncing, lastSyncedAt }: Props) {
  return (
    <Button
      variant="secondary"
      size="sm"
      onClick={onSync}
      disabled={syncing}
      title={lastSyncedAt ? `Last synced: ${lastSyncedAt.toLocaleTimeString()}` : 'Click to sync'}
    >
      <Icon
        name="sync"
        className={`mr-1.5 ${syncing ? 'animate-spin' : ''}`}
      />
      {syncing ? 'Syncing…' : 'Refresh'}
    </Button>
  );
}
