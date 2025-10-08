// app/(tabs)/groups.tsx
import { useQuery } from "@tanstack/react-query";
import { api } from "../../src/lib/api";
import { View, Text, ActivityIndicator, StyleSheet, Button } from "react-native";

export default function Groups() {
  const { data, isLoading, error, refetch } = useQuery({ 
    queryKey: ["groups"], 
    queryFn: async () => (await api.get("/groups")).data,
    retry: false, // Don't retry on auth errors
    enabled: false, // Don't auto-fetch, require manual trigger
  });

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text>Loading groups...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>Error loading groups: {error.message}</Text>
        <Text style={styles.helpText}>Please log in first using the Login tab</Text>
        <Button title="Try Again" onPress={() => refetch()} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Your Groups</Text>
      
      {!data && !isLoading && (
        <View style={styles.center}>
          <Text style={styles.helpText}>Click "Load Groups" to fetch your groups</Text>
          <Text style={styles.helpText}>Make sure you're logged in first!</Text>
          <Button title="Load Groups" onPress={() => refetch()} />
        </View>
      )}
      
      {data?.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.empty}>No groups found. Create your first group!</Text>
        </View>
      ) : (
        data?.map((g: any) => (
          <View key={g.id} style={styles.groupCard}>
            <Text style={styles.groupName}>{g.name}</Text>
            <Text style={styles.groupCurrency}>{g.currency}</Text>
          </View>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  groupCard: {
    backgroundColor: 'white',
    padding: 16,
    marginBottom: 12,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  groupName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  groupCurrency: {
    fontSize: 14,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 32,
  },
  empty: {
    textAlign: 'center',
    color: '#666',
    fontSize: 16,
  },
  error: {
    color: 'red',
    textAlign: 'center',
    fontSize: 16,
    marginBottom: 16,
  },
  helpText: {
    color: '#666',
    textAlign: 'center',
    fontSize: 14,
    marginBottom: 8,
  },
});