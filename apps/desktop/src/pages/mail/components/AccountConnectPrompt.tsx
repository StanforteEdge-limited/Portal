type Props = { onConnectGoogle: () => void; onConnectMicrosoft: () => void };

export function AccountConnectPrompt({ onConnectGoogle, onConnectMicrosoft }: Props) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '48px 24px', gap: 16 }}>
      <div style={{ fontSize: 48 }}>✉</div>
      <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>Connect your work email</h2>
      <p style={{ color: '#6b7280', textAlign: 'center', maxWidth: 360, margin: 0 }}>
        Connect your Google Workspace or Microsoft 365 account to access your inbox directly from the portal.
      </p>
      <button
        onClick={onConnectGoogle}
        style={{ padding: '10px 24px', background: '#4285F4', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 14, width: 260 }}
      >
        Connect Google Workspace
      </button>
      <button
        onClick={onConnectMicrosoft}
        style={{ padding: '10px 24px', background: '#00a4ef', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 14, width: 260 }}
      >
        Connect Microsoft 365
      </button>
    </div>
  );
}
