import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { api } from '../src/lib/api';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isLoginMode, setIsLoginMode] = useState(true);
  const router = useRouter();

  // No need to load Google OAuth script for development simulation

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      const requestData = { email, password };
      console.log('Logging in with data:', requestData);
      const response = await api.post('/auth/login', requestData);
      const { access, refresh } = response.data;
      
      // Store tokens and set them in the API client
      const { setTokens } = await import('../src/lib/api');
      setTokens(access, refresh);
      
      console.log('Login successful, tokens set');
      Alert.alert('Success', 'Login successful!');
      router.push('/(tabs)/groups');
    } catch (error: any) {
      console.error('Login error:', error.response?.data || error.message);
      Alert.alert('Error', error.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      const requestData = { email, password, name: email.split('@')[0] };
      console.log('Registering with data:', requestData);
      const response = await api.post('/auth/register', requestData);
      const { access, refresh } = response.data;
      
      // Store tokens and set them in the API client
      const { setTokens } = await import('../src/lib/api');
      setTokens(access, refresh);
      
      console.log('Registration successful, tokens set');
      Alert.alert('Success', 'Registration successful!');
      router.push('/(tabs)/groups');
    } catch (error: any) {
      console.error('Registration error:', error.response?.data || error.message);
      console.error('Full error object:', error);
      
      let errorMessage = 'Registration failed';
      if (error.response?.data?.message) {
        if (Array.isArray(error.response.data.message)) {
          errorMessage = error.response.data.message.join(', ');
        } else {
          errorMessage = error.response.data.message;
        }
      }
      
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    if (Platform.OS === 'web') {
      // For web, show a simple confirmation
      const confirmed = window.confirm('This will simulate Google Sign-In. Continue?');
      if (!confirmed) return;
      
      setLoading(true);
      try {
        console.log('Starting Google OAuth simulation...');
        
        // Show loading message
        Alert.alert('Google Sign-In', 'Please wait while we authenticate with Google...');
        
        // Simulate a delay for realistic OAuth flow
        setTimeout(() => {
          // Generate a mock Google token
          const mockGoogleToken = 'google_token_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
          console.log('Simulated Google auth with token:', mockGoogleToken);
          
          api.post('/auth/google', { googleToken: mockGoogleToken })
            .then(response => {
              const { access, refresh } = response.data;
              
              // Store tokens and set them in the API client
              import('../src/lib/api').then(({ setTokens }) => {
                setTokens(access, refresh);
                
                console.log('Google auth successful, tokens set');
                Alert.alert('Success', 'Signed in with Google successfully!');
                router.push('/(tabs)/groups');
              });
            })
            .catch(error => {
              console.error('Google auth error:', error);
              Alert.alert('Error', 'Google authentication failed');
            })
            .finally(() => {
              setLoading(false);
            });
        }, 2000); // Simulate 2-second delay for OAuth flow
        
      } catch (error: any) {
        console.error('Google auth error:', error);
        Alert.alert('Error', 'Google authentication failed');
        setLoading(false);
      }
    } else {
      // For native platforms, show info message
      Alert.alert('Info', 'Google Sign-In is not yet implemented for native platforms. Please use email/password authentication.');
    }
  };

  const handleForgotPassword = async () => {
    console.log('Forgot password button clicked!');
    console.log('Current email:', email);
    
    if (!email) {
      console.log('No email entered, showing error');
      Alert.alert('Error', 'Please enter your email address first');
      return;
    }

    try {
      console.log('Starting forgot password request...');
      setLoading(true);
      const response = await api.post('/auth/forgot-password', { email });
      console.log('Forgot password response:', response.data);
      Alert.alert('Success', response.data.message);
    } catch (error: any) {
      console.error('Forgot password error:', error);
      Alert.alert('Error', 'Failed to send password reset instructions');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          {/* Header with Splitwise branding */}
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <View style={styles.logo}>
                <Text style={styles.logoText}>S</Text>
              </View>
              <Text style={styles.brandName}>Splitwise++</Text>
            </View>
            <View style={styles.headerButtons}>
              <TouchableOpacity 
                style={isLoginMode ? styles.headerButtonActive : styles.headerButton}
                onPress={() => setIsLoginMode(true)}
              >
                <Text style={isLoginMode ? styles.headerButtonActiveText : styles.headerButtonText}>Log in</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={!isLoginMode ? styles.headerButtonActive : styles.headerButton}
                onPress={() => setIsLoginMode(false)}
              >
                <Text style={!isLoginMode ? styles.headerButtonActiveText : styles.headerButtonText}>Sign up</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Login Form Card */}
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>{isLoginMode ? 'Log in' : 'Sign up'}</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email address</Text>
              <TextInput
                style={styles.input}
                placeholder=""
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Password</Text>
              <TextInput
                style={styles.input}
                placeholder=""
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
              />
            </View>

            <TouchableOpacity 
              style={styles.loginButton} 
              onPress={isLoginMode ? handleLogin : handleRegister}
              disabled={loading}
            >
              <Text style={styles.loginButtonText}>
                {loading ? (isLoginMode ? 'Logging in...' : 'Creating account...') : (isLoginMode ? 'Log in' : 'Sign up')}
              </Text>
            </TouchableOpacity>

            {isLoginMode && (
              <TouchableOpacity 
                style={styles.forgotPassword}
                onPress={handleForgotPassword}
                disabled={loading}
              >
                <Text style={styles.forgotPasswordText}>Forgot your password?</Text>
              </TouchableOpacity>
            )}

            <View style={styles.separator}>
              <View style={styles.separatorLine} />
              <Text style={styles.separatorText}>or</Text>
              <View style={styles.separatorLine} />
            </View>

            <TouchableOpacity 
              style={styles.googleButton}
              onPress={handleGoogleAuth}
              disabled={loading}
            >
              <View style={styles.googleIcon}>
                <Text style={styles.googleIconText}>G</Text>
              </View>
              <Text style={styles.googleButtonText}>
                {isLoginMode ? 'Sign in with Google' : 'Sign up with Google'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5', // Light gray background like Splitwise
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 60,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logo: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: '#00b894', // Teal color like Splitwise
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  logoText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  brandName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2d3436',
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 16,
  },
  headerButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  headerButtonText: {
    fontSize: 16,
    color: '#00b894',
    fontWeight: '500',
  },
  headerButtonActive: {
    backgroundColor: '#00b894',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  headerButtonActiveText: {
    fontSize: 16,
    color: 'white',
    fontWeight: '500',
  },
  formCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  formTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2d3436',
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#2d3436',
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'white',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    color: '#2d3436',
  },
  loginButton: {
    backgroundColor: '#00b894',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  forgotPassword: {
    alignItems: 'center',
    marginBottom: 24,
  },
  forgotPasswordText: {
    fontSize: 16,
    color: '#00b894',
    fontWeight: '500',
  },
  separator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  separatorLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#ddd',
  },
  separatorText: {
    marginHorizontal: 16,
    fontSize: 16,
    color: '#636e72',
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 8,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  googleIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#4285f4',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  googleIconText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  googleButtonText: {
    fontSize: 16,
    color: '#2d3436',
    fontWeight: '500',
  },
});
