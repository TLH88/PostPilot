/**
 * Shared types for admin-managed email settings. Used by both the API
 * routes and the admin UI.
 */

export type SenderKey = "noreply" | "hello" | "news" | "support";
export type FooterKind = "unsubscribe" | "gdpr" | "governance" | "custom" | "noreply_notice";

export interface EmailGreeting {
  id: string;
  name: string;
  content: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface EmailSignature {
  id: string;
  name: string;
  content: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface EmailFooter {
  id: string;
  name: string;
  content: string;
  kind: FooterKind;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface EmailTemplate {
  id: string;
  key: string;
  name: string;
  description: string | null;
  subject: string;
  body_html: string;
  sender_key: SenderKey;
  show_logo: boolean;
  greeting_id: string | null;
  signature_id: string | null;
  footer_ids: string[];
  is_system: boolean;
  created_at: string;
  updated_at: string;
}
