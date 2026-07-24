import AsyncStorage from '@react-native-async-storage/async-storage';
import '../config/amplify'; 


import { Amplify } from 'aws-amplify';
import { confirmSignIn, fetchAuthSession, getCurrentUser, signIn, signOut } from 'aws-amplify/auth';


const Auth = {
  signIn: async (username: string, password: string) => {
    try {
      
      
      
      
      const result = await signIn({
        username,
        password,
        options: { authFlowType: 'USER_PASSWORD_AUTH' },
      });
      
      
      const challengeName = result.nextStep?.signInStep === 'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED' 
        ? 'NEW_PASSWORD_REQUIRED' 
        : undefined;
      
      
      if (result.isSignedIn) {
        const user = await getCurrentUser();
        return { ...user, challengeName, isSignedIn: true };
      } else {
        
        return { username, challengeName, isSignedIn: false };
      }
    } catch (error: any) {
      
      let errorMessage = 'Sign in failed';
      
      if (error) {
        
        if (error.message) {
          errorMessage = error.message;
        } else if (error.name && error.name !== 'Error') {
          errorMessage = `${error.name}: ${error.message || 'Authentication failed'}`;
        } else if (error.cause?.message) {
          errorMessage = error.cause.message;
        } else if (error.cause?.toString && error.cause.toString() !== '[object Object]') {
          errorMessage = error.cause.toString();
        } else if (typeof error === 'string') {
          errorMessage = error;
        } else if (error.toString && error.toString() !== '[object Object]' && !error.toString().includes('[object')) {
          errorMessage = error.toString();
        } else {
          try {
            const errorStr = JSON.stringify(error, Object.getOwnPropertyNames(error));
            if (errorStr && errorStr !== '{}' && errorStr !== 'null') {
              errorMessage = `Error: ${errorStr}`;
            }
          } catch {
            errorMessage = error.name || error.constructor?.name || 'Unknown authentication error';
          }
        }
      }
      
      throw new Error(errorMessage);
    }
  },
  currentAuthenticatedUser: async () => {
    return await getCurrentUser();
  },
  currentSession: async () => {
    const session = await fetchAuthSession();
    const refreshToken = (session.tokens as any)?.refreshToken?.toString() || '';
    return {
      getAccessToken: () => ({
        getJwtToken: () => session.tokens?.accessToken?.toString() || '',
      }),
      getIdToken: () => ({
        getJwtToken: () => session.tokens?.idToken?.toString() || '',
      }),
      getRefreshToken: () => ({
        getToken: () => refreshToken,
      }),
    };
  },
  signOut: async () => {
    await signOut();
  },
  completeNewPassword: async (user: any, newPassword: string) => {
    await confirmSignIn({ challengeResponse: newPassword });
    return await getCurrentUser();
  },
};

interface AuthResult {
  isAuthenticated?: boolean;
  user?: any;
  userData?: any;
  tokens?: Tokens;
  isLoading?: boolean;
  challenge?: string;
  error?: any;
}

interface Tokens {
  accessToken?: string;
  refreshToken?: string;
  idToken?: string;
  [key: string]: any;
}

const AuthService = {
  initialize: async (): Promise<AuthResult> => {
    try {
      const currentUser = await Auth.currentAuthenticatedUser();
      const session = await Auth.currentSession();
      const tokens = {
        accessToken: session.getAccessToken().getJwtToken(),
        idToken: session.getIdToken().getJwtToken(),
        refreshToken: session.getRefreshToken().getToken(),
      };

      await AsyncStorage.setItem('access_token', tokens.accessToken);
      await AsyncStorage.setItem('id_token', tokens.idToken);
      await AsyncStorage.setItem('refresh_token', tokens.refreshToken || '');

      return {
        isAuthenticated: true,
        user: currentUser,
        tokens,
        isLoading: false,
      };
    } catch {
      return {
        isAuthenticated: false,
        user: null,
        tokens: undefined,
        isLoading: false,
      };
    }
  },

  login: async (username: string, password: string): Promise<AuthResult> => {
    try {
      const user = await Auth.signIn(username, password);

      if (user.challengeName === 'NEW_PASSWORD_REQUIRED' || (user as any).challengeName === 'NEW_PASSWORD_REQUIRED') {
        return { challenge: 'NEW_PASSWORD_REQUIRED', user };
      }

      if (!user.isSignedIn) {
        return { error: 'Sign in incomplete. Please try again.' };
      }

      const session = await Auth.currentSession();
      const tokens = {
        accessToken: session.getAccessToken().getJwtToken(),
        idToken: session.getIdToken().getJwtToken(),
        refreshToken: session.getRefreshToken().getToken(),
      };

      await AsyncStorage.setItem('access_token', tokens.accessToken);
      await AsyncStorage.setItem('id_token', tokens.idToken);
      await AsyncStorage.setItem('refresh_token', tokens.refreshToken || '');

      return { user, tokens };
    } catch (err: any) {
      let errorMessage = 'An unknown error has occurred';
      
      if (err?.message) {
        errorMessage = err.message;
      } else if (err?.name) {
        errorMessage = `${err.name}: ${err.message || 'Authentication failed'}`;
      } else if (typeof err === 'string') {
        errorMessage = err;
      } else if (err?.toString && err.toString() !== '[object Object]') {
        errorMessage = err.toString();
      }
      
      return { error: errorMessage };
    }
  },

  completeNewPassword: async (user: any, newPassword: string): Promise<AuthResult> => {
    try {
      const updatedUser = await Auth.completeNewPassword(user, newPassword);

      const session = await Auth.currentSession();
      const tokens = {
        accessToken: session.getAccessToken().getJwtToken(),
        idToken: session.getIdToken().getJwtToken(),
        refreshToken: session.getRefreshToken().getToken(),
      };

      await AsyncStorage.setItem('access_token', tokens.accessToken);
      await AsyncStorage.setItem('id_token', tokens.idToken);
      await AsyncStorage.setItem('refresh_token', tokens.refreshToken || '');

      return { user: updatedUser, tokens };
    } catch (err: any) {
      return { error: err.message || 'Password update failed' };
    }
  },

  logout: async (): Promise<{ success: boolean; error?: string }> => {
    try {
      await Auth.signOut();

      await AsyncStorage.removeItem('access_token');
      await AsyncStorage.removeItem('id_token');
      await AsyncStorage.removeItem('refresh_token');

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  getCurrentSession: async () => {
    try {
      const session = await Auth.currentSession();
      return session;
    } catch {
      return null;
    }
  },

  getCurrentTokens: async (): Promise<Tokens | null> => {
    try {
      const session = await Auth.currentSession();
      return {
        accessToken: session.getAccessToken().getJwtToken(),
        idToken: session.getIdToken().getJwtToken(),
        refreshToken: session.getRefreshToken().getToken(),
      };
    } catch {
      return null;
    }
  },

  refreshTokens: async (): Promise<Tokens> => {
    try {
      await Auth.currentAuthenticatedUser();
      const refreshedSession = await fetchAuthSession({ forceRefresh: true });
      const refreshToken = (refreshedSession.tokens as any)?.refreshToken?.toString() || '';
      const tokens = {
        accessToken: refreshedSession.tokens?.accessToken?.toString() || '',
        idToken: refreshedSession.tokens?.idToken?.toString() || '',
        refreshToken,
      };

      await AsyncStorage.setItem('access_token', tokens.accessToken);
      await AsyncStorage.setItem('id_token', tokens.idToken);
      await AsyncStorage.setItem('refresh_token', tokens.refreshToken || '');

      return tokens;
    } catch (error) {
      await AuthService.logout();
      throw error;
    }
  },
};

export default AuthService;

