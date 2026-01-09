import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { Input, Text } from 'react-native-elements';
import { useAuth } from '../../src/hooks/useAuth';
import { driverTheme } from '../../src/theme/driverTheme';

export default function Login() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const isButtonEnabled = email.trim().length > 0 && password.trim().length > 0;

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }

    setLoading(true);
    try {
      const result = await login(email, password);
      
      // Check for error in result
      if (result?.error) {
        Alert.alert('Login Failed', result.error);
        setLoading(false);
        return;
      }
      
      if (result?.challenge === 'NEW_PASSWORD_REQUIRED') {
        // Handle new password required
        router.push('/auth/new-password' as any);
      } else if (result?.user) {
        // Login successful
        router.replace('/(tabs)/loads' as any);
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
    <View style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
        keyboardVerticalOffset={0}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}>
          <View style={styles.content}>
          <Text h2 style={styles.title}>
            Welcome Back
          </Text>
          <Text style={styles.subtitle}>Sign in to continue</Text>

          <View style={styles.form}>
            <Input
              placeholder="Email"
              leftIcon={<MaterialIcons name="email" size={20} color="#86939e" />}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              inputContainerStyle={styles.inputContainer}
              inputStyle={styles.input}
              containerStyle={styles.inputWrapper}
            />

            <Input
              placeholder="Password"
              leftIcon={<MaterialIcons name="lock" size={20} color="#86939e" />}
              rightIcon={
                <MaterialIcons
                  name={showPassword ? 'visibility' : 'visibility-off'}
                  size={20}
                  color="#86939e"
                  onPress={() => setShowPassword(!showPassword)}
                />
              }
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoComplete="password"
              inputContainerStyle={styles.inputContainer}
              inputStyle={styles.input}
              containerStyle={styles.inputWrapper}
            />

            <TouchableOpacity
              style={isButtonEnabled ? styles.loginButton : styles.loginButtonDisabled}
              onPress={isButtonEnabled ? handleLogin : undefined}
              disabled={!isButtonEnabled || loading}
              activeOpacity={0.8}>
              {loading ? (
                <Text style={styles.loginButtonText}>Loading...</Text>
              ) : (
                <Text style={isButtonEnabled ? styles.loginButtonText : styles.loginButtonTextDisabled}>
                  Login
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
    minHeight: '100%',
  },
  content: {
    width: '100%',
  },
  title: {
    textAlign: 'center',
    marginBottom: 10,
    color: '#333',
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: 40,
    color: '#86939e',
    fontSize: 16,
  },
  form: {
    width: '100%',
  },
  inputWrapper: {
    paddingHorizontal: 0,
    marginBottom: 10,
  },
  inputContainer: {
    borderWidth: 1,
    borderColor: '#e1e8ed',
    borderRadius: 8,
    paddingHorizontal: 10,
    backgroundColor: '#f5f5f5',
  },
  input: {
    marginLeft: 10,
    color: '#333',
  },
  loginButton: {
    backgroundColor: driverTheme.colors.primary.main,
    borderRadius: 8,
    paddingVertical: 14,
    marginTop: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  loginButtonDisabled: {
    backgroundColor: driverTheme.colors.grey[300],
    borderRadius: 8,
    paddingVertical: 14,
    marginTop: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  loginButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
  },
  loginButtonTextDisabled: {
    fontSize: 16,
    fontWeight: '600',
    color: driverTheme.colors.text.disabled,
  },
});

