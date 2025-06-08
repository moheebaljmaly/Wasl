
export interface User {
  id: string;
  email: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  is_online?: boolean;
  last_seen?: string;
  is_blocked?: boolean;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  email: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  is_online?: boolean;
  last_seen?: string;
  is_blocked?: boolean;
  created_at: string;
  updated_at: string;
}

export interface Conversation {
  id: string;
  participant_1: string;
  participant_2: string;
  created_at: string;
  updated_at: string;
  last_message?: Message;
  other_participant?: Profile;
  unread_count?: number;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  status: 'sending' | 'sent' | 'failed' | 'delivered';
  is_offline: boolean;
  is_read?: boolean;
  reply_to_id?: string;
  is_deleted?: boolean;
  created_at: string;
  sender?: Profile;
}

export interface AuthCredentials {
  userId: string;
  token: string;
  lastLogin: string;
  rememberMe: boolean;
}

export interface AuthResponse {
  user: User;
  token: string;
  session: {
    access_token: string;
    user: User;
  };
}

export interface Session {
  access_token: string;
  user: User;
}
