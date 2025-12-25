import { router } from 'expo-router';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import AuthService from '../services/AuthService';
import { customAxios, setAuthToken, setRefreshTokenCallback } from '../services/api';

interface User {
  username?: string;
  [key: string]: any;
}

interface UserData {
  [key: string]: any;
}

interface Tokens {
  accessToken?: string;
  refreshToken?: string;
  idToken?: string;
  [key: string]: any;
}

interface AuthState {
  isAuthenticated?: boolean;
  user?: User;
  userData?: UserData | null;
  tokens?: Tokens;
  isLoading?: boolean;
  challenge?: string;
  error?: any;
}

interface AuthContextType {
  authState: AuthState | null;
  isAuthenticated: boolean;
  tokens: Tokens | null;
  accessToken: string | null;
  isLoading: boolean;
  error: any;
  login: (username: string, password: string) => Promise<any>;
  logout: () => Promise<void>;
  completeNewPassword: (user: User, newPassword: string) => Promise<any>;
  refreshTokens: () => Promise<Tokens>;
  updateUser: (updates: Partial<User>) => void;
  updateUserData: (updates: Partial<UserData>) => void;
  getUserProperty: (property: string) => any;
  getUserDataProperty: (property: string) => any;
  refreshUserData: () => Promise<void>;
}

const getUserFromDb = async (user: User): Promise<any> => {
  try {
    const res = await customAxios({
      method: 'GET',
      url: `/auth/me`,
    });
    return res?.data;
  } catch (err: any) {
    console.log('ERROR: ', err);
    throw err;
  }
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState | null>(null);
  const [tokens, setTokens] = useState<Tokens | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<any>(null);

  // Set up refresh token callback for API interceptor
  useEffect(() => {
    setRefreshTokenCallback(async (): Promise<any> => {
      return await AuthService.refreshTokens();
    });
  }, []);

  // Initialize auth state on mount
  useEffect(() => {
    const initializeAuth = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await AuthService.initialize();
        setAuthToken(result.tokens?.accessToken || null);
        if (result?.isAuthenticated && result?.user) {
          try {
            const userDataRes = await getUserFromDb(result.user);
            setAuthState({
              ...result,
              user: { ...result.user, ...userDataRes?.data },
              userData: userDataRes?.data,
            });
            setTokens(result.tokens || null);
          } catch {
            setAuthState({
              ...result,
              userData: null,
            });
            setTokens(result.tokens || null);
          }
        } else {
          setAuthState(null);
          setTokens(null);
        }
      } catch (err) {
        setError(err);
        setAuthState(null);
        setTokens(null);
      } finally {
        setIsLoading(false);
      }
    };
    initializeAuth();
  }, []);

  const login = useCallback(
    async (username: string, password: string) => {
      setError(null);
      setAuthState(null);
      setTokens(null);
      try {
        const result = await AuthService.login(username, password);
        if (result.error) throw new Error(result.error);
        if (result.challenge === 'NEW_PASSWORD_REQUIRED') {
          setAuthState(result);
          setTokens(result.tokens || null);
          router.push('/auth/new-password');
          return result;
        }
        if (result.user) {
          setAuthToken(result.tokens?.accessToken || null);
          try {
            const userDataRes = await getUserFromDb(result.user);
            setAuthState({
              isAuthenticated: true,
              user: { ...result.user, ...userDataRes?.data },
              tokens: result.tokens,
              userData: userDataRes?.data || null,
              isLoading: false,
            });
            setTokens(result.tokens || null);
          } catch {
            setAuthState({
              isAuthenticated: true,
              user: result.user,
              tokens: result.tokens,
              userData: null,
              isLoading: false,
            });
            setTokens(result.tokens || null);
          }
        } else {
          setAuthState(result);
          setTokens(result.tokens || null);
        }
        return result;
      } catch (err) {
        setError(err);
        throw err;
      }
    },
    []
  );

  const logout = useCallback(async () => {
    setError(null);
    try {
      await AuthService.logout();
      setAuthState(null);
      setTokens(null);
      setAuthToken(null);
      router.replace('/auth/login');
    } catch (err) {
      setError(err);
      throw err;
    }
  }, []);

  const completeNewPassword = useCallback(
    async (user: User, newPassword: string) => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await AuthService.completeNewPassword(user, newPassword);
        if (result.error) throw new Error(result.error);
        if (result.user) {
          setAuthToken(result.tokens?.accessToken || null);
          try {
            const userDataRes = await getUserFromDb(result.user);
            setAuthState({
              isAuthenticated: true,
              user: { ...result.user, ...userDataRes?.data },
              tokens: result.tokens,
              userData: userDataRes?.data || null,
              isLoading: false,
            });
            setTokens(result.tokens || null);
          } catch {
            setAuthState({
              isAuthenticated: true,
              user: result.user,
              tokens: result.tokens,
              userData: null,
              isLoading: false,
            });
            setTokens(result.tokens || null);
          }
        } else {
          setAuthState(result);
          setTokens(result.tokens || null);
        }
        return result;
      } catch (err) {
        setError(err);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const refreshTokens = useCallback(async (): Promise<Tokens> => {
    setIsLoading(true);
    setError(null);
    try {
      const tokens = await AuthService.refreshTokens();
      setTokens(tokens);
      setAuthState((old) => (old ? { ...old, tokens } : old));
      setAuthToken(tokens.accessToken || null);
      return tokens;
    } catch (err) {
      setError(err);
      await logout();
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [logout]);

  const updateUser = (updates: Partial<User>) => {
    setAuthState((old) =>
      old && old.user ? { ...old, user: { ...old.user, ...updates } } : old
    );
  };

  const updateUserData = (updates: Partial<UserData>) => {
    setAuthState((old) =>
      old && old.userData
        ? { ...old, userData: { ...old.userData, ...updates } }
        : old
    );
  };

  const getUserProperty = (property: string): any => {
    if (!authState?.user) return null;
    if (property.includes('.')) {
      const parts = property.split('.');
      let value: any = authState.user;
      for (const part of parts) {
        value = value?.[part];
        if (value === undefined) return null;
      }
      return value;
    }
    return authState.user[property] || null;
  };

  const getUserDataProperty = (property: string): any => {
    if (!authState?.userData) return null;
    if (property.includes('.')) {
      const parts = property.split('.');
      let value: any = authState.userData;
      for (const part of parts) {
        value = value?.[part];
        if (value === undefined) return null;
      }
      return value;
    }
    return authState.userData[property] || null;
  };

  const refreshUserData = useCallback(async () => {
    // Implement if needed
  }, []);

  const isAuthenticated = useMemo(() => {
    return !!(authState?.isAuthenticated && authState?.user);
  }, [authState]);

  const accessToken = useMemo(() => {
    return authState?.tokens?.accessToken || tokens?.accessToken || null;
  }, [authState, tokens]);

  const value: AuthContextType = {
    authState,
    isAuthenticated,
    tokens: authState?.tokens || tokens || null,
    accessToken,
    isLoading,
    error,
    login,
    logout,
    completeNewPassword,
    refreshTokens,
    updateUser,
    updateUserData,
    getUserProperty,
    getUserDataProperty,
    refreshUserData,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

