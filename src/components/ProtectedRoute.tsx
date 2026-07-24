import React, { useEffect, useRef, useMemo } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter, useSegments, usePathname } from 'expo-router';
import { useAuth } from '../hooks/useAuth';
import { driverTheme } from '../theme/driverTheme';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const segments = useSegments();
  const pathname = usePathname();
  const hasRedirectedRef = useRef<string>('');

  
  const segmentsString = segments.join('/');
  const routeInfo = useMemo(() => {
    const inAuthGroup = segments[0] === 'auth';
    const currentPath = pathname || segmentsString || '';
    return { inAuthGroup, currentPath };
  }, [pathname, segmentsString, segments]);

  useEffect(() => {
    if (isLoading) {
      return;
    }

    const { inAuthGroup, currentPath } = routeInfo;
    const redirectKey = `${isAuthenticated}-${currentPath}`;

    if (hasRedirectedRef.current === redirectKey) {
      return;
    }

    const shouldRedirect = 
      (!isAuthenticated && !inAuthGroup && !currentPath.includes('/auth/login')) ||
      (isAuthenticated && inAuthGroup && !currentPath.includes('/(tabs)/loads'));

    if (shouldRedirect) {
      hasRedirectedRef.current = redirectKey;
      if (!isAuthenticated) {
        router.replace('/auth/login');
      } else {
        router.replace('/(tabs)/loads');
      }
    } else {
      hasRedirectedRef.current = redirectKey;
    }
  }, [isAuthenticated, isLoading]); // Only redirect when auth state changes

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={driverTheme.colors.primary.main} />
      </View>
    );
  }

  if (!isAuthenticated && !routeInfo.inAuthGroup) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={driverTheme.colors.primary.main} />
      </View>
    );
  }

  return <>{children}</>;
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: driverTheme.colors.background.default,
  },
});

export default ProtectedRoute;

