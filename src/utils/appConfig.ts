import Constants from 'expo-constants';

export const appConfig = {
  apiUrl: Constants.expoConfig?.extra?.apiUrl || process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8080/api',
  // Add other config values as needed
};

