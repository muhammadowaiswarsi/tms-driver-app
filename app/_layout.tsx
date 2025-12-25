// Import polyfills FIRST - must be before any other imports
import 'react-native-get-random-values';
// NOTE:
// `@aws-amplify/react-native` requires native linking and will fail in Expo Go.
// If you use Expo Go, keep this commented out (or remove the dependency).
// If you use a custom Dev Client / prebuild, you can re-enable it.
// import '@aws-amplify/react-native';
import 'react-native-url-polyfill/auto';

import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useColorScheme } from '@/hooks/use-color-scheme';
import ProtectedRoute from '../src/components/ProtectedRoute';
import '../src/config/amplify'; // Initialize AWS Amplify
import { AuthProvider } from '../src/hooks/useAuth';
import { queryClient } from '../src/lib/react-query';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
            <ProtectedRoute>
              <Stack>
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen name="auth/login" options={{ headerShown: false }} />
                <Stack.Screen name="load-details" options={{ headerShown: false }} />
                <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
              </Stack>
              <StatusBar style="auto" />
            </ProtectedRoute>
          </ThemeProvider>
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
