import { MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Input } from 'react-native-elements';
import AuthScreenLayout, { authFormStyles } from '../../src/components/auth/AuthScreenLayout';
import { useAuth } from '../../src/hooks/useAuth';
import AuthService from '../../src/services/AuthService';
import { driverTheme } from '../../src/theme/driverTheme';

export default function ResetPassword() {
  const router = useRouter();
  const { login } = useAuth();
  const params = useLocalSearchParams<{ email?: string }>();
  const [email, setEmail] = useState(typeof params.email === 'string' ? params.email : '');
  const [code, setCode] = useState<string[]>(Array(6).fill(''));
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [errors, setErrors] = useState({ code: '', newPassword: '', confirmPassword: '' });
  const codeRefs = useRef<Array<TextInput | null>>([]);

  useEffect(() => {
    const loadEmail = async () => {
      if (email) return;
      const stored = await AuthService.getForgotPasswordEmail();
      if (stored) {
        setEmail(stored);
      } else {
        Alert.alert('Email not found', 'Please restart the forgot password process.', [
          { text: 'OK', onPress: () => router.replace('/auth/forgot-password') },
        ]);
      }
    };
    loadEmail();
  }, [email, router]);

  const handleCodeChange = (value: string, index: number) => {
    const digits = value.replace(/[^0-9]/g, '');

    if (digits.length > 1) {
      const next = Array(6).fill('');
      digits.slice(0, 6).split('').forEach((digit, i) => {
        next[i] = digit;
      });
      setCode(next);
      setErrors((prev) => ({ ...prev, code: '' }));
      codeRefs.current[Math.min(digits.length, 5)]?.focus();
      return;
    }

    const next = [...code];
    next[index] = digits.slice(-1);
    setCode(next);
    setErrors((prev) => ({ ...prev, code: '' }));

    if (digits && index < 5) {
      codeRefs.current[index + 1]?.focus();
    }
  };

  const handleCodeKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !code[index] && index > 0) {
      codeRefs.current[index - 1]?.focus();
    }
  };

  const handleResend = async () => {
    if (!email || resending) return;
    setResending(true);
    try {
      const result = await AuthService.forgotPassword(email);
      if (result.error) {
        Alert.alert('Resend Failed', result.error);
        return;
      }
      Alert.alert('Code Sent', 'A new reset code was sent to your email.');
    } catch (error: any) {
      Alert.alert('Resend Failed', error?.message || 'Failed to resend code');
    } finally {
      setResending(false);
    }
  };

  const handleSubmit = async () => {
    const codeValue = code.join('');
    const nextErrors = { code: '', newPassword: '', confirmPassword: '' };
    let hasError = false;

    if (codeValue.length !== 6) {
      nextErrors.code = 'Please enter the 6-digit verification code';
      hasError = true;
    }

    if (newPassword.length < 8) {
      nextErrors.newPassword = 'Password must be at least 8 characters';
      hasError = true;
    }

    if (confirmPassword !== newPassword) {
      nextErrors.confirmPassword = 'Passwords must match';
      hasError = true;
    } else if (!confirmPassword) {
      nextErrors.confirmPassword = 'Confirm your password';
      hasError = true;
    }

    setErrors(nextErrors);
    if (hasError) return;

    if (!email) {
      Alert.alert('Email not found', 'Please restart the forgot password process.', [
        { text: 'OK', onPress: () => router.replace('/auth/forgot-password') },
      ]);
      return;
    }

    setLoading(true);
    try {
      const result = await AuthService.confirmForgotPassword(email, codeValue, newPassword);
      if (result.error) {
        Alert.alert('Reset Failed', result.error);
        return;
      }

      try {
        await login(email, newPassword);
        router.replace('/(tabs)/loads');
      } catch {
        Alert.alert(
          'Password Updated',
          'Your password was changed. Please sign in with your new password.',
          [{ text: 'OK', onPress: () => router.replace('/auth/login') }]
        );
      }
    } catch (error: any) {
      Alert.alert('Reset Failed', error?.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  const isButtonEnabled = code.join('').length === 6 && newPassword.length > 0 && confirmPassword.length > 0;

  return (
    <AuthScreenLayout onBack={() => router.back()}>
      <View style={authFormStyles.iconBadge}>
        <MaterialIcons name="verified-user" size={28} color="#fff" />
      </View>
      <Text style={authFormStyles.title}>Enter Verification Code</Text>
      <Text style={authFormStyles.subtitle}>
        Enter the 6-digit code sent to your email and set a new password.
      </Text>

      <Text style={[authFormStyles.label, styles.centerLabel]}>Verification Code</Text>
      <View style={authFormStyles.codeRow}>
        {code.map((digit, index) => (
          <TextInput
            key={index}
            ref={(ref) => {
              codeRefs.current[index] = ref;
            }}
            value={digit}
            onChangeText={(value) => handleCodeChange(value, index)}
            onKeyPress={({ nativeEvent }) => handleCodeKeyPress(nativeEvent.key, index)}
            keyboardType="number-pad"
            maxLength={index === 0 ? 6 : 1}
            style={authFormStyles.codeInput}
            textContentType="oneTimeCode"
            autoComplete="one-time-code"
          />
        ))}
      </View>
      {!!errors.code && <Text style={authFormStyles.error}>{errors.code}</Text>}

      <Text style={authFormStyles.label}>New Password</Text>
      <Input
        placeholder="Enter new password"
        leftIcon={<MaterialIcons name="lock" size={20} color="#86939e" />}
        rightIcon={
          <MaterialIcons
            name={showNewPassword ? 'visibility' : 'visibility-off'}
            size={20}
            color="#86939e"
            onPress={() => setShowNewPassword((prev) => !prev)}
          />
        }
        value={newPassword}
        onChangeText={(value) => {
          setNewPassword(value);
          if (errors.newPassword) setErrors((prev) => ({ ...prev, newPassword: '' }));
        }}
        secureTextEntry={!showNewPassword}
        autoCapitalize="none"
        inputContainerStyle={authFormStyles.inputContainer}
        inputStyle={authFormStyles.input}
        containerStyle={authFormStyles.inputWrapper}
        renderErrorMessage={false}
      />
      {!!errors.newPassword && <Text style={authFormStyles.error}>{errors.newPassword}</Text>}

      <Text style={authFormStyles.label}>Confirm Password</Text>
      <Input
        placeholder="Confirm new password"
        leftIcon={<MaterialIcons name="lock" size={20} color="#86939e" />}
        rightIcon={
          <MaterialIcons
            name={showConfirmPassword ? 'visibility' : 'visibility-off'}
            size={20}
            color="#86939e"
            onPress={() => setShowConfirmPassword((prev) => !prev)}
          />
        }
        value={confirmPassword}
        onChangeText={(value) => {
          setConfirmPassword(value);
          if (errors.confirmPassword) setErrors((prev) => ({ ...prev, confirmPassword: '' }));
        }}
        secureTextEntry={!showConfirmPassword}
        autoCapitalize="none"
        inputContainerStyle={authFormStyles.inputContainer}
        inputStyle={authFormStyles.input}
        containerStyle={authFormStyles.inputWrapper}
        renderErrorMessage={false}
      />
      {!!errors.confirmPassword && <Text style={authFormStyles.error}>{errors.confirmPassword}</Text>}

      <TouchableOpacity
        style={[
          authFormStyles.primaryButton,
          (!isButtonEnabled || loading) && authFormStyles.primaryButtonDisabled,
        ]}
        onPress={isButtonEnabled && !loading ? handleSubmit : undefined}
        disabled={!isButtonEnabled || loading}
        activeOpacity={0.8}>
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <Text
              style={[
                authFormStyles.primaryButtonText,
                !isButtonEnabled && authFormStyles.primaryButtonTextDisabled,
              ]}>
              Change Password
            </Text>
            {isButtonEnabled && <MaterialIcons name="arrow-forward" size={20} color="#fff" style={{ marginLeft: 8 }} />}
          </>
        )}
      </TouchableOpacity>

      <TouchableOpacity onPress={handleResend} disabled={resending} style={styles.resendButton}>
        <Text style={[authFormStyles.link, resending && styles.resendDisabled]}>
          {resending ? 'Sending...' : 'Resend code'}
        </Text>
      </TouchableOpacity>

      <View style={authFormStyles.dividerRow}>
        <View style={authFormStyles.dividerLine} />
        <Text style={authFormStyles.dividerText}>or</Text>
        <View style={authFormStyles.dividerLine} />
      </View>

      <Text style={authFormStyles.footerText}>
        Back to{' '}
        <Text style={authFormStyles.link} onPress={() => router.replace('/auth/login')}>
          Login
        </Text>
      </Text>
    </AuthScreenLayout>
  );
}

const styles = StyleSheet.create({
  centerLabel: {
    textAlign: 'center',
  },
  resendButton: {
    alignItems: 'center',
    marginTop: 16,
  },
  resendDisabled: {
    color: driverTheme.colors.text.disabled,
  },
});
