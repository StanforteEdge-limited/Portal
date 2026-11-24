export type DocumentCategory = "policy" | "wiki" | "handbook" | "general";

export interface DocumentSharedRecord {
  id: string;
  recipient_name: string;
  recipient_email: string;
  recipient_avatar?: string;
  recipient_role?: string;
  shared_at: string;
  sender_name: string;
  message?: string;
  channels: ("email" | "chat")[];
}

export interface DocumentComment {
  id: string;
  author_name: string;
  author_avatar?: string;
  body: string;
  created_at: string;
  resolved?: boolean;
}

export interface DocumentVersion {
  id: string;
  saved_at: string;
  author_name: string;
  word_count: number;
  title: string;
  content_html: string;
}

export interface DocumentItem {
  id: string;
  title: string;
  slug?: string;
  category: DocumentCategory;
  status: "published" | "draft" | "archived";
  version: string;
  effective_date?: string;
  created_at: string;
  updated_at?: string;
  content_html?: string;
  link_url?: string;
  file_id?: string;
  require_acknowledgement: boolean;
  author_name?: string;
  author_email?: string;
  tags?: string[];
  comments?: DocumentComment[];
  versions?: DocumentVersion[];
  file?: {
    id: string;
    file_name: string;
    file_size: number;
    mime_type: string;
    public_url?: string;
    storage_path?: string;
  } | null;
  acknowledgements?: Array<{
    id: string;
    user_name: string;
    acknowledged_at: string;
    version: string;
  }>;
  shares?: DocumentSharedRecord[];
}
