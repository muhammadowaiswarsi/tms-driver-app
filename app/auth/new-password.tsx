import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Input } from 'react-native-elements';
import AuthScreenLayout, { authFormStyles } from '../../src/components/auth/AuthScreenLayout';
import { useAuth } from '../../src/hooks/useAuth';

export default function NewPassword() {
  const router = useRouter();
  const { authState, completeNewPassword } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({ password: '', confirmPassword: '' });

  useEffect(() => {
    if (authState?.challenge === 'NEW_PASSWORD_REQUIRED') return;

    const timer = setTimeout(() => {
      if (authState?.challenge !== 'NEW_PASSWORD_REQUIRED') {
        router.replace('/auth/login');
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [authState?.challenge, router]);

  const isButtonEnabled = password.trim().length > 0 && confirmPassword.trim().length > 0;

  const handleSubmit = async () => {
    const nextErrors = { password: '', confirmPassword: '' };
    let hasError = false;

    if (password.length < 8) {
      nextErrors.password = 'Password must be at least 8 characters';
      hasError = true;
    }

    if (confirmPassword !== password) {
      nextErrors.confirmPassword = 'Passwords must match';
      hasError = true;
    }

    setErrors(nextErrors);
    if (hasError) return;

    if (!authState?.user) {
      Alert.alert('Session expired', 'Please sign in again.', [
        { text: 'OK', onPress: () => router.replace('/auth/login') },
      ]);
      return;
    }

    setLoading(true);
    try {
      await completeNewPassword(authState.user, password);
      router.replace('/(tabs)/loads');
    } catch (error: any) {
      Alert.alert('Update Failed', error?.message || 'Failed to change password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthScreenLayout onBack={() => router.replace('/auth/login')}>
      <View style={authFormStyles.iconBadge}>
        <MaterialIcons name="lock-reset" size={28} color="#fff" />
      </View>
      <Text style={authFormStyles.title}>Set New Password</Text>
      <Text style={authFormStyles.subtitle}>
        Create a new password to finish signing in to your account.
      </Text>

      <Text style={authFormStyles.label}>New Password</Text>
      <Input
        placeholder="Enter new password"
        leftIcon={<MaterialIcons name="lock" size={20} color="#86939e" />}
        rightIcon={
          <MaterialIcons
            name={showPassword ? 'visibility' : 'visibility-off'}
            size={20}
            color="#86939e"
            onPress={() => setShowPassword((prev) => !prev)}
          />
        }
        value={password}
        onChangeText={(value) => {
          setPassword(value);
          if (errors.password) setErrors((prev) => ({ ...prev, password: '' }));
        }}
        secureTextEntry={!showPassword}
        autoCapitalize="none"
        inputContainerStyle={authFormStyles.inputContainer}
        inputStyle={authFormStyles.input}
        containerStyle={authFormStyles.inputWrapper}
        renderErrorMessage={false}
      />
      {!!errors.password && <Text style={authFormStyles.error}>{errors.password}</Text>}

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
              Continue
            </Text>
            {isButtonEnabled && <MaterialIcons name="arrow-forward" size={20} color="#fff" style={{ marginLeft: 8 }} />}
          </>
        )}
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
