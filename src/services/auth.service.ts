/**
 * Authentication Service
 *
 * Handles all authentication-related API calls including login, register,
 * password reset, and user profile fetching.
 */

const API_BASE_URL = '/api/auth'

export interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  createdAt: string
  updatedAt: string
}

// Backend API response format (wrapped in data)
interface ApiAuthResponse {
  data: {
    accessToken: string
    user: User
  }
}

// Internal auth response format (unwrapped)
export interface AuthResponse {
  token: string
  user: User
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterData {
  email: string
  password: string
  firstName: string
  lastName: string
  companyName: string
}

export interface AuthError extends Error {
  statusCode: number
  errors?: Record<string, string[]>
}

function createAuthError(
  message: string,
  statusCode: number,
  errors?: Record<string, string[]>
): AuthError {
  const error = new Error(message) as AuthError
  error.statusCode = statusCode
  error.errors = errors
  return error
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let errorMessage = 'An error occurred'
    let errors: Record<string, string[]> | undefined

    try {
      const errorData = await response.json()
      errorMessage = errorData.message || errorMessage
      errors = errorData.errors
    } catch {
      // Response body is not JSON
    }

    throw createAuthError(errorMessage, response.status, errors)
  }

  return response.json()
}

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('auth_token')
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  return headers
}

export const authService = {
  /**
   * Fetch and store CSRF token.
   * Should be called after login to enable CSRF protection for subsequent requests.
   */
  async fetchCsrfToken(): Promise<void> {
    // This request sets the csrf_token cookie
    await fetch(`${API_BASE_URL}/csrf-token`, {
      method: 'GET',
      credentials: 'include', // Include cookies
    })
  },

  /**
   * Authenticate user with email and password
   */
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await fetch(`${API_BASE_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
      credentials: 'include', // Include cookies for CSRF
    })

    const apiResponse = await handleResponse<ApiAuthResponse>(response)

    // Fetch CSRF token after successful login
    await this.fetchCsrfToken()

    return {
      token: apiResponse.data.accessToken,
      user: apiResponse.data.user,
    }
  },

  /**
   * Register a new user account
   */
  async register(data: RegisterData): Promise<AuthResponse> {
    const response = await fetch(`${API_BASE_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      credentials: 'include', // Include cookies for CSRF
    })

    const apiResponse = await handleResponse<ApiAuthResponse>(response)

    // Fetch CSRF token after successful registration
    await this.fetchCsrfToken()

    return {
      token: apiResponse.data.accessToken,
      user: apiResponse.data.user,
    }
  },

  /**
   * Request password reset email
   */
  async forgotPassword(email: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw createAuthError(
        errorData.message || 'Failed to send reset email',
        response.status
      )
    }
  },

  /**
   * Reset password using token from email
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, newPassword }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw createAuthError(
        errorData.message || 'Failed to reset password',
        response.status
      )
    }
  },

  /**
   * Get current authenticated user
   */
  async getCurrentUser(): Promise<User> {
    const response = await fetch(`${API_BASE_URL}/me`, {
      method: 'GET',
      headers: getAuthHeaders(),
    })

    const apiResponse = await handleResponse<{ data: User }>(response)
    return apiResponse.data
  },

  /**
   * Store authentication token
   */
  setToken(token: string): void {
    localStorage.setItem('auth_token', token)
  },

  /**
   * Remove authentication token
   */
  removeToken(): void {
    localStorage.removeItem('auth_token')
  },

  /**
   * Get stored authentication token
   */
  getToken(): string | null {
    return localStorage.getItem('auth_token')
  },

  /**
   * Check if user has a stored token
   */
  hasToken(): boolean {
    return !!this.getToken()
  },
}
