import { useState } from "react";
import { View, Text, TextInput, Button, StyleSheet } from "react-native";
import { api } from "../../src/lib/api";

export default function SettleUp() {
  const [groupId, setGroupId] = useState("cmgh8aq88000121f8kxb03gxf");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  async function suggest() {
    if (!groupId) {
      alert("Please enter a group ID");
      return;
    }
    
    setLoading(true);
    try {
      const res = await api.post(`/groups/${groupId}/settlements:suggest`, {});
      setSuggestions(res.data);
    } catch (error: any) {
      alert("Error: " + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  }

  async function record(s: any) {
    try {
      await api.post(`/groups/${groupId}/settlements`, {
        fromUserId: s.fromUserId, 
        toUserId: s.toUserId,
        amountCents: s.amountCents, 
        currency: "USD", 
        note: "Auto"
      });
      alert("Settlement recorded!");
      await suggest(); // Refresh suggestions
    } catch (error: any) {
      alert("Error: " + (error.response?.data?.message || error.message));
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Settle Up</Text>
      
      <Text style={styles.label}>Group ID</Text>
      <TextInput 
        style={styles.input}
        value={groupId} 
        onChangeText={setGroupId}
        placeholder="Enter group ID"
      />
      
      <Button 
        title={loading ? "Loading..." : "Get Settlement Suggestions"} 
        onPress={suggest}
        disabled={loading}
      />
      
      {suggestions.length === 0 && groupId && !loading && (
        <View style={styles.emptyContainer}>
          <Text style={styles.empty}>No settlements needed - everyone is settled up!</Text>
        </View>
      )}
      
      {suggestions.map((s, i) => (
        <View key={i} style={styles.suggestionCard}>
          <Text style={styles.suggestionText}>
            {s.fromUserId} → {s.toUserId}
          </Text>
          <Text style={styles.amount}>
            ${(s.amountCents / 100).toFixed(2)}
          </Text>
          <Button 
            title="Record Payment" 
            onPress={() => record(s)}
            color="#4CAF50"
          />
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
  emptyContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  empty: {
    fontSize: 16,
    color: '#666',
  },
  suggestionCard: {
    backgroundColor: 'white',
    padding: 16,
    marginVertical: 8,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  suggestionText: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  amount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2196F3',
    marginBottom: 12,
  },
});
