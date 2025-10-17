/**
 * User Service
 * 
 * Handles all user-related API interactions including authentication,
 * profile management, verification, and privacy controls.
 */

import { 
  User, 
  UserProfile, 
  AuthUser, 
  LoginRequest, 
  RegisterRequest,
  UserSettings,
  PrivacySettings,
  UserError,
  UserErrorCode,
  UserVerificationStatus,
  VerificationDocument,
  DocumentType,
  VerificationStatus
} from './user.types';

// ============================================================================
// API CONFIGURATION
// ============================================================================

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    LOGOUT: '/auth/logout',
    REFRESH: '/auth/refresh',
    RESET_PASSWORD: '/auth/reset-password',
    CONFIRM_RESET: '/auth/confirm-reset'
  },
  USER: {
    PROFILE: '/user/profile',
    SETTINGS: '/user/settings',
    PRIVACY: '/user/privacy',
    DISPLAY_NAME: '/user/display-name',
    VERIFICATION: '/user/verification',
    AVATAR: '/user/avatar'
  },
  PUBLIC: {
    PROFILE: '/public/profile',
    SEARCH: '/public/search'
  }
};

// ============================================================================
// HTTP CLIENT
// ============================================================================

class HttpClient {
  private baseURL: string;
  private token: string | null = null;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
    this.loadToken();
  }

  private loadToken(): void {
    this.token = localStorage.getItem('auth_token');
  }

  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json'
    };

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    return headers;
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    return response.json();
  }

  async get<T>(endpoint: string): Promise<T> {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: 'GET',
      headers: this.getHeaders()
    });

    return this.handleResponse<T>(response);
  }

  async post<T>(endpoint: string, data?: any): Promise<T> {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: data ? JSON.stringify(data) : undefined
    });

    return this.handleResponse<T>(response);
  }

  async put<T>(endpoint: string, data?: any): Promise<T> {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: data ? JSON.stringify(data) : undefined
    });

    return this.handleResponse<T>(response);
  }

  async delete<T>(endpoint: string): Promise<T> {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: 'DELETE',
      headers: this.getHeaders()
    });

    return this.handleResponse<T>(response);
  }

  setToken(token: string): void {
    this.token = token;
    localStorage.setItem('auth_token', token);
  }

  clearToken(): void {
    this.token = null;
    localStorage.removeItem('auth_token');
  }
}

// ============================================================================
// USER SERVICE CLASS
// ============================================================================

class UserService {
  private http: HttpClient;

  constructor() {
    this.http = new HttpClient(API_BASE_URL);
  }

  // ============================================================================
  // AUTHENTICATION METHODS
  // ============================================================================

  async login(credentials: LoginRequest): Promise<{ user: AuthUser; token: string }> {
    try {
      const response = await this.http.post<{ user: AuthUser; token: string }>(
        API_ENDPOINTS.AUTH.LOGIN,
        credentials
      );

      this.http.setToken(response.token);
      return response;
    } catch (error) {
      throw new Error(`Login failed: ${error.message}`);
    }
  }

  async register(userData: RegisterRequest): Promise<{ user: AuthUser; token: string }> {
    try {
      const response = await this.http.post<{ user: AuthUser; token: string }>(
        API_ENDPOINTS.AUTH.REGISTER,
        userData
      );

      this.http.setToken(response.token);
      return response;
    } catch (error) {
      throw new Error(`Registration failed: ${error.message}`);
    }
  }

  async logout(): Promise<void> {
    try {
      await this.http.post(API_ENDPOINTS.AUTH.LOGOUT);
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      this.http.clearToken();
    }
  }

  async refreshToken(): Promise<{ token: string }> {
    try {
      const response = await this.http.post<{ token: string }>(API_ENDPOINTS.AUTH.REFRESH);
      this.http.setToken(response.token);
      return response;
    } catch (error) {
      this.http.clearToken();
      throw new Error(`Token refresh failed: ${error.message}`);
    }
  }

  async resetPassword(email: string): Promise<void> {
    try {
      await this.http.post(API_ENDPOINTS.AUTH.RESET_PASSWORD, { email });
    } catch (error) {
      throw new Error(`Password reset failed: ${error.message}`);
    }
  }

  async confirmPasswordReset(token: string, newPassword: string): Promise<void> {
    try {
      await this.http.post(API_ENDPOINTS.AUTH.CONFIRM_RESET, { token, newPassword });
    } catch (error) {
      throw new Error(`Password reset confirmation failed: ${error.message}`);
    }
  }

  // ============================================================================
  // USER PROFILE METHODS
  // ============================================================================

  async getCurrentUser(): Promise<User> {
    try {
      return await this.http.get<User>(API_ENDPOINTS.USER.PROFILE);
    } catch (error) {
      throw new Error(`Failed to get current user: ${error.message}`);
    }
  }

  async updateProfile(updates: Partial<User>): Promise<User> {
    try {
      return await this.http.put<User>(API_ENDPOINTS.USER.PROFILE, updates);
    } catch (error) {
      throw new Error(`Failed to update profile: ${error.message}`);
    }
  }

  async updateSettings(settings: Partial<UserSettings>): Promise<UserSettings> {
    try {
      return await this.http.put<UserSettings>(API_ENDPOINTS.USER.SETTINGS, settings);
    } catch (error) {
      throw new Error(`Failed to update settings: ${error.message}`);
    }
  }

  async updatePrivacy(privacy: Partial<PrivacySettings>): Promise<PrivacySettings> {
    try {
      return await this.http.put<PrivacySettings>(API_ENDPOINTS.USER.PRIVACY, privacy);
    } catch (error) {
      throw new Error(`Failed to update privacy settings: ${error.message}`);
    }
  }

  // ============================================================================
  // DISPLAY NAME METHODS
  // ============================================================================

  async regenerateDisplayName(): Promise<{ displayName: string }> {
    try {
      return await this.http.post<{ displayName: string }>(API_ENDPOINTS.USER.DISPLAY_NAME);
    } catch (error) {
      throw new Error(`Failed to regenerate display name: ${error.message}`);
    }
  }

  async checkDisplayNameAvailability(displayName: string): Promise<{ available: boolean }> {
    try {
      return await this.http.get<{ available: boolean }>(
        `${API_ENDPOINTS.USER.DISPLAY_NAME}/check?name=${encodeURIComponent(displayName)}`
      );
    } catch (error) {
      throw new Error(`Failed to check display name availability: ${error.message}`);
    }
  }

  // ============================================================================
  // VERIFICATION METHODS
  // ============================================================================

  async submitVerification(documents: {
    documentType: DocumentType;
    documentNumber: string;
    documentImage: string;
  }): Promise<{ status: UserVerificationStatus }> {
    try {
      return await this.http.post<{ status: UserVerificationStatus }>(
        API_ENDPOINTS.USER.VERIFICATION,
        documents
      );
    } catch (error) {
      throw new Error(`Failed to submit verification: ${error.message}`);
    }
  }

  async checkVerificationStatus(): Promise<{ status: UserVerificationStatus }> {
    try {
      return await this.http.get<{ status: UserVerificationStatus }>(
        API_ENDPOINTS.USER.VERIFICATION
      );
    } catch (error) {
      throw new Error(`Failed to check verification status: ${error.message}`);
    }
  }

  async getVerificationDocuments(): Promise<VerificationDocument[]> {
    try {
      return await this.http.get<VerificationDocument[]>(
        `${API_ENDPOINTS.USER.VERIFICATION}/documents`
      );
    } catch (error) {
      throw new Error(`Failed to get verification documents: ${error.message}`);
    }
  }

  // ============================================================================
  // AVATAR METHODS
  // ============================================================================

  async updateAvatar(avatarData: {
    backgroundColor: string;
    textColor: string;
    icon: string;
  }): Promise<{ avatarUrl: string }> {
    try {
      return await this.http.put<{ avatarUrl: string }>(
        API_ENDPOINTS.USER.AVATAR,
        avatarData
      );
    } catch (error) {
      throw new Error(`Failed to update avatar: ${error.message}`);
    }
  }

  async getAvatar(userId: string): Promise<{ avatarUrl: string }> {
    try {
      return await this.http.get<{ avatarUrl: string }>(
        `${API_ENDPOINTS.USER.AVATAR}/${userId}`
      );
    } catch (error) {
      throw new Error(`Failed to get avatar: ${error.message}`);
    }
  }

  // ============================================================================
  // PUBLIC PROFILE METHODS
  // ============================================================================

  async getPublicProfile(userId: string): Promise<UserProfile> {
    try {
      return await this.http.get<UserProfile>(
        `${API_ENDPOINTS.PUBLIC.PROFILE}/${userId}`
      );
    } catch (error) {
      throw new Error(`Failed to get public profile: ${error.message}`);
    }
  }

  async searchUsers(query: string, filters?: {
    location?: string;
    ratingMin?: number;
    verificationRequired?: boolean;
    completedTradesMin?: number;
  }): Promise<{ users: UserProfile[]; total: number }> {
    try {
      const params = new URLSearchParams();
      params.append('q', query);
      
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined) {
            params.append(key, value.toString());
          }
        });
      }

      return await this.http.get<{ users: UserProfile[]; total: number }>(
        `${API_ENDPOINTS.PUBLIC.SEARCH}?${params.toString()}`
      );
    } catch (error) {
      throw new Error(`Failed to search users: ${error.message}`);
    }
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  async checkSession(): Promise<{ user: User; token: string } | null> {
    try {
      const response = await this.http.get<{ user: User; token: string }>(
        API_ENDPOINTS.AUTH.REFRESH
      );
      return response;
    } catch (error) {
      return null;
    }
  }

  isAuthenticated(): boolean {
    return localStorage.getItem('auth_token') !== null;
  }

  getToken(): string | null {
    return localStorage.getItem('auth_token');
  }

  clearSession(): void {
    this.http.clearToken();
    localStorage.removeItem('auth_token');
    localStorage.removeItem('refresh_token');
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export const userService = new UserService();
export default userService;
