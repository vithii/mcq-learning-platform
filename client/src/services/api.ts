import { ClientStorageService } from './clientStorage';

const API_BASE = import.meta.env.VITE_API_URL
  ? (import.meta.env.VITE_API_URL.endsWith('/api') ? import.meta.env.VITE_API_URL : `${import.meta.env.VITE_API_URL.replace(/\/$/, '')}/api`)
  : '/api';

export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  details?: any;
}

export class ApiClient {
  private static isClientMode(): boolean {
    return localStorage.getItem('mcq_mode') === 'client' || (!import.meta.env.VITE_API_URL && localStorage.getItem('mcq_force_client') === 'true');
  }

  private static enableClientMode() {
    localStorage.setItem('mcq_mode', 'client');
  }

  public static getToken(): string | null {
    return localStorage.getItem('mcq_auth_token');
  }

  public static setToken(token: string | null) {
    if (token) {
      localStorage.setItem('mcq_auth_token', token);
    } else {
      localStorage.removeItem('mcq_auth_token');
    }
  }

  private static async request<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {})
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers
    });

    const isJson = res.headers.get('content-type')?.includes('application/json');
    if (!isJson) {
      throw new Error(`API endpoint returned non-JSON status ${res.status}`);
    }

    const data = await res.json();

    if (!res.ok) {
      const errorMsg = data?.error || res.statusText || 'An error occurred';
      throw new Error(errorMsg);
    }

    return data as T;
  }

  private static async executeWithFallback<T>(
    apiFn: () => Promise<T>,
    clientFn: () => Promise<T>
  ): Promise<T> {
    if (this.isClientMode()) {
      return await clientFn();
    }
    try {
      return await apiFn();
    } catch (err: any) {
      console.warn(`[ApiClient] Server unreachable (${err.message}). Seamlessly switching to browser client storage mode.`);
      this.enableClientMode();
      return await clientFn();
    }
  }

  // Auth endpoints
  static async register(name: string, email: string, password: string) {
    return this.executeWithFallback(
      () => this.request('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ name, email, password })
      }),
      () => ClientStorageService.register(name, email, password)
    );
  }

  static async login(email: string, password: string) {
    return this.executeWithFallback(
      () => this.request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      }),
      () => ClientStorageService.login(email, password)
    );
  }

  static async getMe() {
    return this.executeWithFallback(
      () => this.request('/auth/me'),
      () => ClientStorageService.getMe()
    );
  }

  static async updateProfile(name?: string, avatar_url?: string) {
    return this.executeWithFallback(
      () => this.request('/auth/profile', {
        method: 'PATCH',
        body: JSON.stringify({ name, avatar_url })
      }),
      () => ClientStorageService.updateProfile(name, avatar_url)
    );
  }

  static async changePassword(currentPassword: string, newPassword: string) {
    return this.executeWithFallback(
      () => this.request('/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword })
      }),
      () => ClientStorageService.changePassword(currentPassword, newPassword)
    );
  }

  static async forgotPassword(email: string) {
    return this.executeWithFallback(
      () => this.request('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email })
      }),
      () => ClientStorageService.forgotPassword(email)
    );
  }

  static async resetPassword(token: string, newPassword: string) {
    return this.executeWithFallback(
      () => this.request('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, newPassword })
      }),
      () => ClientStorageService.resetPassword(token, newPassword)
    );
  }

  static async deleteAccount(password: string) {
    return this.executeWithFallback(
      () => this.request('/auth/account', {
        method: 'DELETE',
        body: JSON.stringify({ password })
      }),
      () => ClientStorageService.deleteAccount(password)
    );
  }

  static async exportUserData() {
    return this.executeWithFallback(
      () => this.request('/auth/export-data'),
      () => ClientStorageService.exportUserData()
    );
  }

  // Topics
  static async getTopics() {
    return this.executeWithFallback(
      () => this.request('/topics'),
      async () => {
        const topics = await ClientStorageService.getTopics();
        return { topics: Array.isArray(topics) ? topics : (topics as any)?.topics || [] };
      }
    );
  }

  static async getTopic(id: string) {
    return this.executeWithFallback(
      () => this.request(`/topics/${id}`),
      () => ClientStorageService.getTopic(id)
    );
  }

  static async createTopic(data: any) {
    return this.executeWithFallback(
      () => this.request('/topics', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
      () => ClientStorageService.createTopic(data)
    );
  }

  static async updateTopic(id: string, data: any) {
    return this.executeWithFallback(
      () => this.request(`/topics/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data)
      }),
      () => ClientStorageService.updateTopic(id, data)
    );
  }

  static async deleteTopic(id: string) {
    return this.executeWithFallback(
      () => this.request(`/topics/${id}`, {
        method: 'DELETE'
      }),
      () => ClientStorageService.deleteTopic(id)
    );
  }

  static async createSubtopic(topicId: string, data: any) {
    return this.executeWithFallback(
      () => this.request(`/topics/${topicId}/subtopics`, {
        method: 'POST',
        body: JSON.stringify(data)
      }),
      () => ClientStorageService.createSubtopic(topicId, data)
    );
  }

  // Questions
  static async getQuestions(params: Record<string, any> = {}) {
    return this.executeWithFallback(
      () => {
        const searchParams = new URLSearchParams();
        for (const [k, v] of Object.entries(params)) {
          if (v !== undefined && v !== null && v !== '') {
            searchParams.append(k, String(v));
          }
        }
        const query = searchParams.toString();
        return this.request(`/questions${query ? '?' + query : ''}`);
      },
      () => ClientStorageService.getQuestions(params)
    );
  }

  static async getQuestion(id: string) {
    return this.executeWithFallback(
      () => this.request(`/questions/${id}`),
      () => ClientStorageService.getQuestion(id)
    );
  }

  static async createQuestion(data: any) {
    return this.executeWithFallback(
      () => this.request('/questions', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
      () => ClientStorageService.createQuestion(data)
    );
  }

  static async updateQuestion(id: string, data: any) {
    return this.executeWithFallback(
      () => this.request(`/questions/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data)
      }),
      () => ClientStorageService.updateQuestion(id, data)
    );
  }

  static async deleteQuestion(id: string) {
    return this.executeWithFallback(
      () => this.request(`/questions/${id}`, {
        method: 'DELETE'
      }),
      () => ClientStorageService.deleteQuestion(id)
    );
  }

  static async bulkDeleteQuestions(ids: string[]) {
    return this.executeWithFallback(
      () => this.request('/questions/bulk-delete', {
        method: 'POST',
        body: JSON.stringify({ ids })
      }),
      () => ClientStorageService.bulkDeleteQuestions(ids)
    );
  }

  static async deleteQuestionsByFilter(filter: { topicId?: string; subtopicId?: string; search?: string; difficulty?: string }) {
    return this.executeWithFallback(
      () => this.request('/questions/bulk-delete', {
        method: 'POST',
        body: JSON.stringify({ filter })
      }),
      () => ClientStorageService.deleteQuestionsByFilter(filter)
    );
  }

  // Quizzes
  static async getActiveSession() {
    return this.executeWithFallback(
      () => this.request('/quizzes/active'),
      () => ClientStorageService.getActiveSession()
    );
  }

  static async createQuizSession(params: {
    mode: string;
    topicId?: string;
    subtopicId?: string;
    difficulty?: string;
    questionCount?: number;
    timeLimitSec?: number;
  }) {
    return this.executeWithFallback(
      () => this.request('/quizzes', {
        method: 'POST',
        body: JSON.stringify(params)
      }),
      () => ClientStorageService.createQuizSession(params)
    );
  }

  static async getQuizSession(id: string) {
    return this.executeWithFallback(
      () => this.request(`/quizzes/${id}`),
      () => ClientStorageService.getQuizSession(id)
    );
  }

  static async submitQuizAnswer(sessionId: string, data: {
    questionId: string;
    selectedOption: string;
    responseTimeMs?: number;
  }) {
    return this.executeWithFallback(
      () => this.request(`/quizzes/${sessionId}/answer`, {
        method: 'POST',
        body: JSON.stringify(data)
      }),
      () => ClientStorageService.submitQuizAnswer(sessionId, data)
    );
  }

  static async completeQuizSession(sessionId: string) {
    return this.executeWithFallback(
      () => this.request(`/quizzes/${sessionId}/complete`, {
        method: 'POST'
      }),
      () => ClientStorageService.completeQuizSession(sessionId)
    );
  }

  static async discardQuizSession(sessionId: string) {
    return this.executeWithFallback(
      () => this.request(`/quizzes/${sessionId}/discard`, {
        method: 'POST'
      }),
      () => ClientStorageService.discardQuizSession(sessionId)
    );
  }

  static async getQuizResults(sessionId: string) {
    return this.executeWithFallback(
      () => this.request(`/quizzes/${sessionId}/results`),
      () => ClientStorageService.getQuizResults(sessionId)
    );
  }

  static async getQuizHistory(page = 1, limit = 20) {
    return this.executeWithFallback(
      () => this.request(`/quizzes/history?page=${page}&limit=${limit}`),
      () => ClientStorageService.getQuizHistory(page, limit)
    );
  }

  // Progress & Analytics
  static async getDashboard() {
    return this.executeWithFallback(
      () => this.request('/progress/dashboard'),
      () => ClientStorageService.getDashboard()
    );
  }

  static async getDetailedAnalytics() {
    return this.executeWithFallback(
      () => this.request('/progress/analytics'),
      () => ClientStorageService.getDetailedAnalytics()
    );
  }

  static async getMistakes() {
    return this.executeWithFallback(
      () => this.request('/progress/mistakes'),
      () => ClientStorageService.getMistakes()
    );
  }

  // Bookmarks
  static async getBookmarks() {
    return this.executeWithFallback(
      () => this.request('/bookmarks'),
      () => ClientStorageService.getBookmarks()
    );
  }

  static async toggleBookmark(questionId: string) {
    return this.executeWithFallback(
      () => this.request(`/bookmarks/${questionId}`, {
        method: 'POST'
      }),
      () => ClientStorageService.toggleBookmark(questionId)
    );
  }

  // Leaderboard
  static async getLeaderboard(timeframe: 'global' | 'weekly' | 'monthly') {
    return this.executeWithFallback(
      () => this.request(`/leaderboard/${timeframe}`),
      () => ClientStorageService.getLeaderboard(timeframe)
    );
  }

  // Admin
  static async validateImport(payload: any) {
    return this.executeWithFallback(
      () => this.request('/admin/import/validate', {
        method: 'POST',
        body: JSON.stringify({ payload })
      }),
      () => ClientStorageService.validateImport(payload)
    );
  }

  static async executeImport(filename: string, validatedRecords: any[], duplicateStrategy: string) {
    return this.executeWithFallback(
      () => this.request('/admin/import/execute', {
        method: 'POST',
        body: JSON.stringify({ filename, validatedRecords, duplicateStrategy })
      }),
      () => ClientStorageService.executeImport(filename, validatedRecords, duplicateStrategy)
    );
  }

  static async getImportHistory() {
    return this.executeWithFallback(
      () => this.request('/admin/import/history'),
      () => ClientStorageService.getImportHistory()
    );
  }

  static async getContentHealth() {
    return this.executeWithFallback(
      () => this.request('/admin/content-health'),
      () => ClientStorageService.getContentHealth()
    );
  }

  static async getAdminAnalytics() {
    return this.executeWithFallback(
      () => this.request('/admin/analytics'),
      () => ClientStorageService.getAdminAnalytics()
    );
  }

  static async getAdminUsers(params: Record<string, any> = {}) {
    return this.executeWithFallback(
      () => {
        const searchParams = new URLSearchParams();
        for (const [k, v] of Object.entries(params)) {
          if (v !== undefined && v !== null && v !== '') {
            searchParams.append(k, String(v));
          }
        }
        return this.request(`/admin/users?${searchParams.toString()}`);
      },
      () => ClientStorageService.getAdminUsers(params)
    );
  }

  static async updateAdminUser(id: string, updates: { role?: string; status?: string }) {
    return this.executeWithFallback(
      () => this.request(`/admin/users/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(updates)
      }),
      () => ClientStorageService.updateAdminUser(id, updates)
    );
  }

  // Quiz progress and question bank management
  static async resetQuizProgress() {
    return this.executeWithFallback(
      () => this.request('/admin/reset-progress', { method: 'POST' }),
      () => ClientStorageService.resetQuizProgress()
    );
  }

  static async emptyQuestionBank() {
    return this.executeWithFallback(
      () => this.request('/admin/empty-bank', { method: 'POST' }),
      () => ClientStorageService.emptyQuestionBank()
    );
  }

  static async restoreDefaultQuestionBank() {
    return this.executeWithFallback(
      () => this.request('/admin/restore-defaults', { method: 'POST' }),
      () => ClientStorageService.restoreDefaultQuestionBank()
    );
  }
}
