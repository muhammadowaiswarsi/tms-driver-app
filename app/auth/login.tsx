import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Input } from 'react-native-elements';
import AuthScreenLayout, { authFormStyles } from '../../src/components/auth/AuthScreenLayout';
import { useAuth } from '../../src/hooks/useAuth';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Login() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const isButtonEnabled = email.trim().length > 0 && password.trim().length > 0;

  const handleLogin = async () => {
    const trimmedEmail = email.trim();
    let hasError = false;

    if (!EMAIL_REGEX.test(trimmedEmail)) {
      setEmailError('Enter a valid email');
      hasError = true;
    } else {
      setEmailError('');
    }

    if (!password.trim()) {
      setPasswordError('Password is required');
      hasError = true;
    } else {
      setPasswordError('');
    }

    if (hasError) return;

    setLoading(true);
    try {
      const result = await login(trimmedEmail, password);

      if (result?.challenge === 'NEW_PASSWORD_REQUIRED') {
        router.push('/auth/new-password');
      } else if (result?.user) {
        router.replace('/(tabs)/loads');
      } else {
        Alert.alert('Login Failed', 'An unknown error has occurred');
      }
    } catch (error: any) {
      const errorMessage = error?.message || error?.toString() || 'An unknown error has occurred';
      Alert.alert('Login Failed', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthScreenLayout>
      <View style={authFormStyles.iconBadge}>
        <MaterialIcons name="local-shipping" size={28} color="#fff" />
      </View>
      <Text style={authFormStyles.title}>Welcome Back</Text>
      <Text style={authFormStyles.subtitle}>Sign in to manage your drayage operations</Text>

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

      <View style={authFormStyles.labelRow}>
        <Text style={[authFormStyles.label, styles.labelNoMargin]}>Password</Text>
        <TouchableOpacity onPress={() => router.push('/auth/forgot-password')} hitSlop={8}>
          <Text style={authFormStyles.link}>Forgot password?</Text>
        </TouchableOpacity>
      </View>
      <Input
        placeholder="Enter your password"
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
          if (passwordError) setPasswordError('');
        }}
        secureTextEntry={!showPassword}
        autoCapitalize="none"
        autoComplete="password"
        inputContainerStyle={authFormStyles.inputContainer}
        inputStyle={authFormStyles.input}
        containerStyle={authFormStyles.inputWrapper}
        renderErrorMessage={false}
      />
      {!!passwordError && <Text style={authFormStyles.error}>{passwordError}</Text>}

      <TouchableOpacity
        style={[
          authFormStyles.primaryButton,
          (!isButtonEnabled || loading) && authFormStyles.primaryButtonDisabled,
        ]}
        onPress={isButtonEnabled && !loading ? handleLogin : undefined}
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
              Sign In
            </Text>
            {isButtonEnabled && (
              <MaterialIcons name="arrow-forward" size={20} color="#fff" style={{ marginLeft: 8 }} />
            )}
          </>
        )}
      </TouchableOpacity>
    </AuthScreenLayout>
  );
}

const styles = StyleSheet.create({
  labelNoMargin: {
    marginBottom: 0,
  },
});
