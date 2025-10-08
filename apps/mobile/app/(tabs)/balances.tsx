import { useState } from "react";
import { View, Text, TextInput, Button, StyleSheet } from "react-native";
import { api } from "../../src/lib/api";
import { useQuery } from "@tanstack/react-query";

export default function Balances() {
  const [groupId, setGroupId] = useState("cmgh8aq88000121f8kxb03gxf");
  
  const { data, refetch, isLoading } = useQuery({
    queryKey: ["balances", groupId],
    queryFn: async () => {
      if (!groupId) return [];
      return (await api.get(`/groups/${groupId}/balances`)).data;
    },
    enabled: false, // Only run when manually triggered
  });

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Group Balances</Text>
      
      <Text style={styles.label}>Group ID</Text>
      <TextInput 
        style={styles.input}
        value={groupId} 
        onChangeText={setGroupId}
        placeholder="Enter group ID"
      />
      
      <Button title="Load Balances" onPress={() => refetch()} />
      
      {isLoading && (
        <View style={styles.loadingContainer}>
          <Text style={styles.loading}>Loading...</Text>
        </View>
      )}
      
      {data?.length === 0 && groupId && !isLoading && (
        <View style={styles.emptyContainer}>
          <Text style={styles.empty}>No balances found for this group</Text>
        </View>
      )}
      
      {data?.map((r: any) => (
        <View key={r.user_id} style={styles.balanceCard}>
          <Text style={styles.userId}>{r.user_id}</Text>
          <Text style={[
            styles.balance, 
            r.balance_cents > 0 ? styles.positive : styles.negative
          ]}>
            ${(r.balance_cents / 100).toFixed(2)}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    fontSize: 16,
    marginBottom: 16,
  },
  loadingContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  loading: {
    fontSize: 16,
    color: '#666',
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  empty: {
    fontSize: 16,
    color: '#666',
  },
  balanceCard: {
    backgroundColor: 'white',
    padding: 16,
    marginVertical: 8,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  userId: {
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
  },
  balance: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  positive: {
    color: '#4CAF50',
  },
  negative: {
    color: '#F44336',
  },
});
