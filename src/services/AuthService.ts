import AsyncStorage from '@react-native-async-storage/async-storage';
import '../config/amplify'; // Initialize Amplify

// Import AWS Amplify v6 auth functions
import { Amplify } from 'aws-amplify';
import { confirmSignIn, fetchAuthSession, getCurrentUser, signIn, signOut } from 'aws-amplify/auth';

// Create a compatibility wrapper for the old Auth API
const Auth = {
  signIn: async (username: string, password: string) => {
    try {
      // Log configuration check
      console.log('Attempting signIn with username:', username);
      console.log('Amplify config:', Amplify.getConfig());
      
      // Expo Go note:
      // Default `signIn` uses SRP which hits native `computeModPow` on React Native.
      // Use USER_PASSWORD_AUTH to keep the flow JS-only (works in Expo Go) as long as
      // your Cognito App Client has ALLOW_USER_PASSWORD_AUTH enabled and NO client secret.
      const result = await signIn({
        username,
        password,
        options: { authFlowType: 'USER_PASSWORD_AUTH' },
      });
      
      // Map v6 challenge step to v5 challenge name
      const challengeName = result.nextStep?.signInStep === 'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED' 
        ? 'NEW_PASSWORD_REQUIRED' 
        : undefined;
      
      // If signed in, get the user, otherwise return challenge info
      if (result.isSignedIn) {
        const user = await getCurrentUser();
        return { ...user, challengeName, isSignedIn: true };
      } else {
        // Return user object with challenge for compatibility
        return { username, challengeName, isSignedIn: false };
      }
    } catch (error: any) {
      // Log full error for debugging
      console.error('AWS Amplify signIn error - Full error object:', error);
      console.error('Error type:', typeof error);
      console.error('Error constructor:', error?.constructor?.name);
      console.error('Error keys:', error ? Object.keys(error) : 'no error object');
      
      // Extract error message from AWS Amplify v6 error structure
      let errorMessage = 'Sign in failed';
      
      if (error) {
        // AWS Amplify v6 error structure - check multiple possible locations
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
          // Try to stringify the error
          try {
            const errorStr = JSON.stringify(error, Object.getOwnPropertyNames(error));
            if (errorStr && errorStr !== '{}' && errorStr !== 'null') {
              errorMessage = `Error: ${errorStr}`;
            }
          } catch {
            // If stringify fails, use a generic message with error name
            errorMessage = error.name || error.constructor?.name || 'Unknown authentication error';
          }
        }
      }
      
      console.error('Extracted error message:', errorMessage);
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
  // Initialize auth state
  initialize: async (): Promise<AuthResult> => {
    try {
      const currentUser = await Auth.currentAuthenticatedUser();
      const session = await Auth.currentSession();
      const tokens = {
        accessToken: session.getAccessToken().getJwtToken(),
        idToken: session.getIdToken().getJwtToken(),
        refreshToken: session.getRefreshToken().getToken(),
      };

      // Store tokens in AsyncStorage
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
      // User is not authenticated
      return {
        isAuthenticated: false,
        user: null,
        tokens: undefined,
        isLoading: false,
      };
    }
  },

  // Login function
  login: async (username: string, password: string): Promise<AuthResult> => {
    try {
      const user = await Auth.signIn(username, password);

      if (user.challengeName === 'NEW_PASSWORD_REQUIRED' || (user as any).challengeName === 'NEW_PASSWORD_REQUIRED') {
        return { challenge: 'NEW_PASSWORD_REQUIRED', user };
      }

      // Check if user is signed in
      if (!user.isSignedIn) {
        return { error: 'Sign in incomplete. Please try again.' };
      }

      // Get session and tokens
      const session = await Auth.currentSession();
      const tokens = {
        accessToken: session.getAccessToken().getJwtToken(),
        idToken: session.getIdToken().getJwtToken(),
        refreshToken: session.getRefreshToken().getToken(),
      };

      // Store tokens in AsyncStorage
      await AsyncStorage.setItem('access_token', tokens.accessToken);
      await AsyncStorage.setItem('id_token', tokens.idToken);
      await AsyncStorage.setItem('refresh_token', tokens.refreshToken || '');

      return { user, tokens };
    } catch (err: any) {
      console.error('Login error details:', {
        message: err?.message,
        name: err?.name,
        code: err?.code,
        toString: err?.toString(),
        fullError: err,
      });
      
      // Extract detailed error message
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

  // Complete new password challenge
  completeNewPassword: async (user: any, newPassword: string): Promise<AuthResult> => {
    try {
      const updatedUser = await Auth.completeNewPassword(user, newPassword);

      // Get session and tokens
      const session = await Auth.currentSession();
      const tokens = {
        accessToken: session.getAccessToken().getJwtToken(),
        idToken: session.getIdToken().getJwtToken(),
        refreshToken: session.getRefreshToken().getToken(),
      };

      // Store tokens in AsyncStorage
      await AsyncStorage.setItem('access_token', tokens.accessToken);
      await AsyncStorage.setItem('id_token', tokens.idToken);
      await AsyncStorage.setItem('refresh_token', tokens.refreshToken || '');

      return { user: updatedUser, tokens };
    } catch (err: any) {
      return { error: err.message || 'Password update failed' };
    }
  },

  // Logout function
  logout: async (): Promise<{ success: boolean; error?: string }> => {
    try {
      await Auth.signOut();

      // Clear tokens from AsyncStorage
      await AsyncStorage.removeItem('access_token');
      await AsyncStorage.removeItem('id_token');
      await AsyncStorage.removeItem('refresh_token');

      return { success: true };
    } catch (error: any) {
      console.error('Logout error:', error);
      return { success: false, error: error.message };
    }
  },

  // Get current session
  getCurrentSession: async () => {
    try {
      const session = await Auth.currentSession();
      return session;
    } catch {
      return null;
    }
  },

  // Get current tokens
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

  // Refresh tokens
  refreshTokens: async (): Promise<Tokens> => {
    try {
      await Auth.currentAuthenticatedUser();
      // Force refresh the session
      const refreshedSession = await fetchAuthSession({ forceRefresh: true });
      const refreshToken = (refreshedSession.tokens as any)?.refreshToken?.toString() || '';
      const tokens = {
        accessToken: refreshedSession.tokens?.accessToken?.toString() || '',
        idToken: refreshedSession.tokens?.idToken?.toString() || '',
        refreshToken,
      };

      // Update stored tokens
      await AsyncStorage.setItem('access_token', tokens.accessToken);
      await AsyncStorage.setItem('id_token', tokens.idToken);
      await AsyncStorage.setItem('refresh_token', tokens.refreshToken || '');

      return tokens;
    } catch (error) {
      console.error('Token refresh error:', error);
      // If refresh fails, logout the user
      await AuthService.logout();
      throw error;
    }
  },
};

export default AuthService;

