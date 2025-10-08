import { useState } from "react";
import { View, Text, TextInput, Button, StyleSheet, Alert } from "react-native";
import { api, setTokens } from "../../src/lib/api";

export default function Login() {
  const [email, setEmail] = useState("alice@example.com");
  const [password, setPassword] = useState("password123");
  const [isLoading, setIsLoading] = useState(false);
  const [loginStatus, setLoginStatus] = useState<string>("");

  async function handleLogin() {
    setIsLoading(true);
    setLoginStatus("");
    try {
      console.log("Attempting login...");
      const response = await api.post("/auth/login", { email, password });
      console.log("Login response:", response.data);
      const { access, refresh } = response.data;
      setTokens(access, refresh);
      console.log("Tokens set:", access ? "YES" : "NO", refresh ? "YES" : "NO");
      setLoginStatus("✅ Login successful!");
      Alert.alert("Success", "Logged in successfully!");
    } catch (error: any) {
      console.error("Login error:", error);
      setLoginStatus("❌ Login failed: " + (error.response?.data?.message || "Unknown error"));
      Alert.alert("Error", error.response?.data?.message || "Login failed");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleRegister() {
    setIsLoading(true);
    setLoginStatus("");
    try {
      console.log("Attempting registration...");
      const response = await api.post("/auth/register", { 
        email, 
        password, 
        name: email.split("@")[0] 
      });
      console.log("Register response:", response.data);
      const { access, refresh } = response.data;
      setTokens(access, refresh);
      console.log("Tokens set:", access ? "YES" : "NO", refresh ? "YES" : "NO");
      setLoginStatus("✅ Registration successful!");
      Alert.alert("Success", "Registered and logged in successfully!");
    } catch (error: any) {
      console.error("Register error:", error);
      const errorMessage = error.response?.data?.message || "Registration failed";
      setLoginStatus("❌ Registration failed: " + errorMessage);
      Alert.alert("Error", errorMessage);
    } finally {
      setIsLoading(false);
    }
  }

  function handleLogout() {
    setTokens(null, null);
    Alert.alert("Success", "Logged out successfully!");
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Splitwise++</Text>
      <Text style={styles.subtitle}>Login to continue</Text>
      
      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        
        <Button
          title={isLoading ? "Loading..." : "Login"}
          onPress={handleLogin}
          disabled={isLoading}
        />
        
        <View style={styles.spacer} />
        
        <Button
          title={isLoading ? "Loading..." : "Register"}
          onPress={handleRegister}
          disabled={isLoading}
        />
        
        <View style={styles.spacer} />
        
        <Button
          title="Logout"
          onPress={handleLogout}
          color="#F44336"
        />
        
        {loginStatus ? (
          <View style={styles.statusContainer}>
            <Text style={styles.statusText}>{loginStatus}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
    color: '#666',
  },
  form: {
    backgroundColor: 'white',
    padding: 24,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
  },
  spacer: {
    height: 16,
  },
  statusContainer: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    alignItems: 'center',
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});
