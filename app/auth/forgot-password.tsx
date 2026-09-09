import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Input } from 'react-native-elements';
import AuthScreenLayout, { authFormStyles } from '../../src/components/auth/AuthScreenLayout';
import AuthService from '../../src/services/AuthService';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ForgotPassword() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState('');

  const isButtonEnabled = email.trim().length > 0;

  const handleSendCode = async () => {
    const trimmedEmail = email.trim();

    if (!EMAIL_REGEX.test(trimmedEmail)) {
      setEmailError('Enter a valid email');
      return;
    }

    setEmailError('');
    setLoading(true);
    try {
      const result = await AuthService.forgotPassword(trimmedEmail);
      if (result.error) {
        Alert.alert('Reset Failed', result.error);
        return;
      }

      router.push({
        pathname: '/auth/reset-password',
        params: { email: trimmedEmail },
      });
    } catch (error: any) {
      Alert.alert('Reset Failed', error?.message || 'Failed to send reset code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthScreenLayout onBack={() => router.back()}>
      <View style={authFormStyles.iconBadge}>
        <MaterialIcons name="vpn-key" size={28} color="#fff" />
      </View>
      <Text style={authFormStyles.title}>Reset Password</Text>
      <Text style={authFormStyles.subtitle}>
        Regain access to your account by resetting your password.
      </Text>

      <Text style={authFormStyles.label}>Email Address</Text>
      <Input
        placeholder="john@company.com"
        leftIcon={<MaterialIcons name="email" size={20} color="#86939e" />}
        value={email}
        onChangeText={(value) => {
          setEmail(value);
          if (emailError) setEmailError('');
        }}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        inputContainerStyle={authFormStyles.inputContainer}
        inputStyle={authFormStyles.input}
        containerStyle={authFormStyles.inputWrapper}
        renderErrorMessage={false}
      />
      {!!emailError && <Text style={authFormStyles.error}>{emailError}</Text>}

      <TouchableOpacity
        style={[
          authFormStyles.primaryButton,
          (!isButtonEnabled || loading) && authFormStyles.primaryButtonDisabled,
        ]}
        onPress={isButtonEnabled && !loading ? handleSendCode : undefined}
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
              Send OTP
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
        Remembered your password?{' '}
        <Text style={authFormStyles.link} onPress={() => router.replace('/auth/login')}>
          Login
        </Text>
      </Text>
    </AuthScreenLayout>
  );
}
