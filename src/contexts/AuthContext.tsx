/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from 'react'
import {
  authService,
  type User,
  type LoginCredentials,
  type RegisterData,
  type AuthError,
} from '@/services/auth.service'

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  error: AuthError | null
  login: (credentials: LoginCredentials) => Promise<void>
  register: (data: RegisterData) => Promise<void>
  logout: () => void
  clearError: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<AuthError | null>(null)

  // Check for existing token and validate on mount
  useEffect(() => {
    const controller = new AbortController()

    async function initializeAuth() {
      if (!authService.hasToken()) {
        setIsLoading(false)
        return
      }

      try {
        const currentUser = await authService.getCurrentUser()
        if (!controller.signal.aborted) {
          setUser(currentUser)
          // Fetch CSRF token for authenticated users
          await authService.fetchCsrfToken()
        }
      } catch {
        // Token is invalid or expired
        if (!controller.signal.aborted) {
          authService.removeToken()
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false)
        }
      }
    }

    initializeAuth()

    return () => {
      controller.abort()
    }
  }, [])

  const login = useCallback(async (credentials: LoginCredentials) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await authService.login(credentials)
      authService.setToken(response.token)
      setUser(response.user)
    } catch (err) {
      const authError = err as AuthError
      setError(authError)
      throw authError
    } finally {
      setIsLoading(false)
    }
  }, [])

  const register = useCallback(async (data: RegisterData) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await authService.register(data)
      authService.setToken(response.token)
      setUser(response.user)
    } catch (err) {
      const authError = err as AuthError
      setError(authError)
      throw authError
    } finally {
      setIsLoading(false)
    }
  }, [])

  const logout = useCallback(() => {
    authService.removeToken()
    setUser(null)
    setError(null)
  }, [])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const isAuthenticated = user !== null

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoading,
        error,
        login,
        register,
        logout,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
