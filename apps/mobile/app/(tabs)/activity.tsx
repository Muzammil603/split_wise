import { View, Text, StyleSheet } from "react-native";

export default function Activity() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Activity Feed</Text>
      <Text style={styles.subtitle}>Recent activity will appear here</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
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
  },
});