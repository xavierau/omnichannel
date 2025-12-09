/**
 * Shared API Client
 *
 * Provides common utilities for all API services including:
 * - Authentication headers
 * - CSRF token handling
 * - Error handling
 * - Response parsing
 */

export interface ApiError extends Error {
  statusCode: number
  code?: string
  errors?: Record<string, string[]>
}

/**
 * Gets the CSRF token from the cookie.
 * The backend sets this as a non-HttpOnly cookie named 'csrf_token'.
 */
function getCsrfToken(): string | null {
  const cookies = document.cookie.split(';')
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=')
    if (name === 'csrf_token') {
      return value
    }
  }
  return null
}

export interface PaginatedResponse<T> {
  data: T[]
  meta: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

export interface ApiResponse<T> {
  data: T
}

function createApiError(
  message: string,
  statusCode: number,
  errors?: Record<string, string[]>,
  code?: string
): ApiError {
  const error = new Error(message) as ApiError
  error.statusCode = statusCode
  error.errors = errors
  error.code = code
  return error
}

export async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let errorMessage = 'An error occurred'
    let errors: Record<string, string[]> | undefined
    let code: string | undefined

    try {
      const errorData = await response.json()
      errorMessage = errorData.message || errorMessage
      errors = errorData.errors
      code = errorData.code
    } catch {
      // Response body is not JSON
    }

    throw createApiError(errorMessage, response.status, errors, code)
  }

  return response.json()
}

export function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('auth_token')
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  // Include CSRF token for state-changing requests
  const csrfToken = getCsrfToken()
  if (csrfToken) {
    headers['X-CSRF-Token'] = csrfToken
  }
  return headers
}

export function getAuthHeadersWithoutContentType(): HeadersInit {
  const token = localStorage.getItem('auth_token')
  const headers: HeadersInit = {}
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  // Include CSRF token for state-changing requests
  const csrfToken = getCsrfToken()
  if (csrfToken) {
    headers['X-CSRF-Token'] = csrfToken
  }
  return headers
}

// Generic API methods
export async function apiGet<T>(endpoint: string): Promise<T> {
  const response = await fetch(endpoint, {
    method: 'GET',
    headers: getAuthHeaders(),
    credentials: 'include', // Include cookies for CSRF
  })
  return handleResponse<T>(response)
}

export async function apiPost<T, D = unknown>(endpoint: string, data?: D): Promise<T> {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: data ? JSON.stringify(data) : undefined,
    credentials: 'include', // Include cookies for CSRF
  })
  return handleResponse<T>(response)
}

export async function apiPut<T, D = unknown>(endpoint: string, data: D): Promise<T> {
  const response = await fetch(endpoint, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
    credentials: 'include', // Include cookies for CSRF
  })
  return handleResponse<T>(response)
}

export async function apiPatch<T, D = unknown>(endpoint: string, data: D): Promise<T> {
  const response = await fetch(endpoint, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
    credentials: 'include', // Include cookies for CSRF
  })
  return handleResponse<T>(response)
}

export async function apiDelete<T = void>(endpoint: string): Promise<T> {
  const response = await fetch(endpoint, {
    method: 'DELETE',
    headers: getAuthHeaders(),
    credentials: 'include', // Include cookies for CSRF
  })

  // Handle 204 No Content responses
  if (response.status === 204) {
    return undefined as T
  }

  return handleResponse<T>(response)
}

// Helper to build query strings
export function buildQueryString(params: Record<string, string | number | boolean | undefined | null>): string {
  const searchParams = new URLSearchParams()

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.append(key, String(value))
    }
  })

  const queryString = searchParams.toString()
  return queryString ? `?${queryString}` : ''
}

// Export error creator for service-specific errors
export { createApiError }
