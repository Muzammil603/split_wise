import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";

export default function Balances() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Balances</Text>
      <Text style={styles.subtitle}>View balances and settle up</Text>
      
      <TouchableOpacity 
        style={styles.settleUpButton}
        onPress={() => router.push('/settle-up')}
      >
        <Text style={styles.settleUpButtonText}>Settle Up</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 32,
  },
  settleUpButton: {
    backgroundColor: '#32a852',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 8,
  },
  settleUpButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});