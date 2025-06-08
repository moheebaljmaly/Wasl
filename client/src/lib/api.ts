import { AuthResponse, User, Conversation, Message } from '@/types';

const API_BASE = '/api';

class ApiClient {
  private token: string | null = null;

  constructor() {
    this.token = localStorage.getItem('authToken');
  }

  setToken(token: string) {
    this.token = token;
    localStorage.setItem('authToken', token);
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('authToken');
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE}${endpoint}`;
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    };

    if (this.token) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Network error' }));
      throw new Error(error.error || 'Request failed');
    }

    return response.json();
  }

  // Auth methods
  async signUp(email: string, username: string, password: string, fullName: string): Promise<AuthResponse> {
    return this.request<AuthResponse>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, username, password, full_name: fullName }),
    });
  }

  async signIn(email: string, password: string): Promise<AuthResponse> {
    return this.request<AuthResponse>('/auth/signin', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async signOut(): Promise<void> {
    await this.request('/auth/signout', {
      method: 'POST',
    });
  }

  async getCurrentUser(): Promise<{ user: User }> {
    return this.request<{ user: User }>('/auth/user');
  }

  // Conversations methods
  async getConversations(): Promise<Conversation[]> {
    return this.request<Conversation[]>('/conversations');
  }

  async createConversation(participantUsername: string): Promise<Conversation> {
    return this.request<Conversation>('/conversations', {
      method: 'POST',
      body: JSON.stringify({ participant_username: participantUsername }),
    });
  }

  // Messages methods
  async getMessages(conversationId: string): Promise<Message[]> {
    return this.request<Message[]>(`/conversations/${conversationId}/messages`);
  }

  async sendMessage(conversationId: string, content: string, options: { status?: string; is_offline?: boolean } = {}): Promise<Message> {
    return this.request<Message>(`/conversations/${conversationId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content, ...options }),
    });
  }

  // Profile methods
  async searchProfile(username: string): Promise<User> {
    return this.request<User>(`/profiles/search?username=${encodeURIComponent(username)}`);
  }

  async updateProfile(updates: { full_name?: string; avatar_url?: string }): Promise<User> {
    return this.request<User>('/profiles/me', {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }

  async deleteMessage(messageId: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/messages/${messageId}`, {
      method: 'DELETE',
    });
  }

  async blockUser(userId: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/profiles/${userId}/block`, {
      method: 'POST',
    });
  }

  async deleteConversation(conversationId: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/conversations/${conversationId}`, {
      method: 'DELETE',
    });
  }

  async updateOnlineStatus(isOnline: boolean): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>('/profiles/me/online', {
      method: 'POST',
      body: JSON.stringify({ is_online: isOnline }),
    });
  }
}

export const apiClient = new ApiClient();