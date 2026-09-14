import type { HttpRequest } from "../auth/http-client";

export type MailAccount = {
  id: string;
  provider: 'GOOGLE' | 'MICROSOFT';
  emailAddress: string;
  displayName: string | null;
  isShared: boolean;
  label: string | null;
  lastSyncedAt: string | null;
  createdAt: string;
};

export type MailHeader = {
  id: string;
  accountId: string;
  uid: string;
  folder: string;
  subject: string | null;
  fromName: string | null;
  fromEmail: string | null;
  date: string | null;
  isRead: boolean;
  hasAttachment: boolean;
  snippet: string | null;
};

export type FolderItem = {
  name: string;
  path: string;
  delimiter: string;
};

export type SyncResult = {
  accountId: string;
  folder: string;
  newCount: number;
  error?: string;
};

export type SendMessageDto = {
  to: string;
  cc?: string[];
  subject: string;
  body: string;
  inReplyToUid?: string;
  folder?: string;
};

export function createMailApi(httpRequest: HttpRequest) {
  const base = '/mail';

  return {
    getGoogleAuthUrl: () =>
      httpRequest<{ data?: { url: string }; url?: string }>(`${base}/auth/google/url`).then(r => (r as any).data ?? r),

    getMicrosoftAuthUrl: () =>
      httpRequest<{ data?: { url: string }; url?: string }>(`${base}/auth/microsoft/url`).then(r => (r as any).data ?? r),

    listAccounts: () =>
      httpRequest<MailAccount[]>(`${base}/accounts`),

    deleteAccount: (id: string) =>
      httpRequest<void>(`${base}/accounts/${id}`, { method: 'DELETE' }),

    syncAll: () =>
      httpRequest<{ job_id: string }>(`${base}/sync`, { method: 'POST' }),

    syncAccount: (accountId: string, folder?: string) => {
      const q = folder ? `?folder=${encodeURIComponent(folder)}` : '';
      return httpRequest<{ job_id: string }>(`${base}/${accountId}/sync${q}`, { method: 'POST' });
    },

    listFolders: (accountId: string) =>
      httpRequest<FolderItem[]>(`${base}/${accountId}/folders`),

    listHeaders: (accountId: string, folder = 'INBOX', page = 1, limit = 50) =>
      httpRequest<{ data: MailHeader[] }>(
        `${base}/${accountId}/headers?folder=${encodeURIComponent(folder)}&page=${page}&limit=${limit}`,
      ),

    getMessage: (accountId: string, uid: string, folder = 'INBOX') =>
      httpRequest<{ html: string; text: string }>(
        `${base}/${accountId}/message/${uid}?folder=${encodeURIComponent(folder)}`,
      ),

    markRead: (accountId: string, uid: string, folder: string, isRead: boolean) =>
      httpRequest<{ ok: boolean }>(
        `${base}/${accountId}/message/${uid}/read?folder=${encodeURIComponent(folder)}&isRead=${isRead}`,
        { method: 'PATCH' },
      ),

    trashMessage: (accountId: string, uid: string, folder: string) =>
      httpRequest<{ ok: boolean }>(
        `${base}/${accountId}/message/${uid}?folder=${encodeURIComponent(folder)}`,
        { method: 'DELETE' },
      ),

    sendMessage: (accountId: string, dto: SendMessageDto) =>
      httpRequest<{ ok: boolean }>(`${base}/${accountId}/send`, {
        method: 'POST',
        body: dto as unknown as Record<string, unknown>,
      }),

    replyMessage: (accountId: string, dto: SendMessageDto) =>
      httpRequest<{ ok: boolean }>(`${base}/${accountId}/reply`, {
        method: 'POST',
        body: dto as unknown as Record<string, unknown>,
      }),

    forwardMessage: (accountId: string, dto: SendMessageDto) =>
      httpRequest<{ ok: boolean }>(`${base}/${accountId}/forward`, {
        method: 'POST',
        body: dto as unknown as Record<string, unknown>,
      }),

    saveSignature: (accountId: string, signature: string | null) =>
      httpRequest<{ ok: boolean }>(`${base}/accounts/${accountId}/signature`, {
        method: 'PATCH',
        body: { signature } as any,
      }),

    getProcessedSignature: (accountId: string) =>
      httpRequest<{ html: string }>(`${base}/accounts/${accountId}/processed-signature`),
  };
}

export type MailApi = ReturnType<typeof createMailApi>;
