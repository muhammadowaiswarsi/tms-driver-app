import { MaterialIcons } from '@expo/vector-icons';
import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { driverTheme } from '../../theme/driverTheme';
import BrandLogo from '../common/BrandLogo';

interface AuthScreenLayoutProps {
  children: React.ReactNode;
  onBack?: () => void;
}

const AuthScreenLayout: React.FC<AuthScreenLayoutProps> = ({ children, onBack }) => {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, 16) }]}>
      {onBack ? (
        <TouchableOpacity
          onPress={onBack}
          style={[styles.backButton, { top: insets.top + 8 }]}
          hitSlop={12}
          accessibilityLabel="Go back">
          <MaterialIcons name="arrow-back" size={24} color="#0d1e6e" />
        </TouchableOpacity>
      ) : null}

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
        keyboardVerticalOffset={0}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}>
          <View style={styles.logoWrap}>
            <BrandLogo size="large" />
          </View>

          <View style={styles.card}>{children}</View>

          <View style={styles.secureRow}>
            <MaterialIcons name="verified-user" size={16} color={driverTheme.colors.success.main} />
            <Text style={styles.secureText}>Secured with 256-bit encryption</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: driverTheme.colors.background.default,
  },
  backButton: {
    position: 'absolute',
    left: 16,
    zIndex: 2,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  logoWrap: {
    alignItems: 'center',
    marginBottom: 24,
  },
  card: {
    backgroundColor: driverTheme.colors.background.paper,
    borderRadius: 20,
    paddingHorizontal: 22,
    paddingVertical: 28,
    shadowColor: '#0d1e6e',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#e8eef5',
  },
  secureRow: {
    marginTop: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secureText: {
    marginLeft: 8,
    fontSize: 13,
    color: driverTheme.colors.text.secondary,
  },
});

export const authFormStyles = StyleSheet.create({
  iconBadge: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: driverTheme.colors.primary.main,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 16,
    shadowColor: driverTheme.colors.primary.main,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: driverTheme.colors.text.primary,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: driverTheme.colors.text.secondary,
    textAlign: 'center',
    marginBottom: 28,
    lineHeight: 22,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: driverTheme.colors.text.primary,
    marginBottom: 8,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  link: {
    fontSize: 14,
    fontWeight: '600',
    color: driverTheme.colors.primary.main,
  },
  inputWrapper: {
    paddingHorizontal: 0,
    marginBottom: 4,
  },
  inputContainer: {
    borderWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#d7dee8',
    borderRadius: 12,
    paddingHorizontal: 12,
    backgroundColor: '#f8fafc',
    minHeight: 52,
  },
  input: {
    marginLeft: 8,
    color: driverTheme.colors.text.primary,
    fontSize: 16,
  },
  error: {
    color: driverTheme.colors.error.main,
    fontSize: 13,
    marginTop: -4,
    marginBottom: 12,
  },
  primaryButton: {
    backgroundColor: driverTheme.colors.primary.main,
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 8,
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: driverTheme.colors.primary.main,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 3,
  },
  primaryButtonDisabled: {
    backgroundColor: driverTheme.colors.grey[300],
    shadowOpacity: 0,
    elevation: 0,
  },
  primaryButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#ffffff',
  },
  primaryButtonTextDisabled: {
    color: driverTheme.colors.text.disabled,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: driverTheme.colors.divider,
  },
  dividerText: {
    marginHorizontal: 12,
    fontSize: 13,
    color: driverTheme.colors.grey[500],
  },
  footerText: {
    textAlign: 'center',
    fontSize: 14,
    color: driverTheme.colors.text.secondary,
  },
  codeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  codeInput: {
    flex: 1,
    height: 52,
    marginHorizontal: 3,
    borderWidth: 1,
    borderColor: '#d7dee8',
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '700',
    color: driverTheme.colors.text.primary,
  },
});

export default AuthScreenLayout;
