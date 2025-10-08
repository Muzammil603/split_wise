import { useState } from "react";
import { View, TextInput, Button, Text, StyleSheet } from "react-native";
import { api } from "../../src/lib/api";

export default function AddExpense() {
  const [groupId, setGroupId] = useState("cmgh8aq88000121f8kxb03gxf");
  const [paidById, setPaidById] = useState("cmgh8alg3000021f8n34tch3w");
  const [amount, setAmount] = useState(""); // dollars as string
  const [note, setNote] = useState("");

  async function submit() {
    try {
      const totalCents = Math.round(parseFloat(amount) * 100);
      const res = await api.post(`/groups/${groupId}/expenses`, {
        paidById, totalCents, currency: "USD", mode: "equal", note
      });
      alert("Expense added: " + res.data.id);
      // Clear form
      setAmount("");
      setNote("");
    } catch (error: any) {
      alert("Error: " + (error.response?.data?.message || error.message));
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Add Equal Expense</Text>
      
      <Text style={styles.label}>Group ID</Text>
      <TextInput 
        style={styles.input}
        value={groupId} 
        onChangeText={setGroupId}
        placeholder="Enter group ID"
      />
      
      <Text style={styles.label}>Paid By (User ID)</Text>
      <TextInput 
        style={styles.input}
        value={paidById} 
        onChangeText={setPaidById}
        placeholder="Enter user ID"
      />
      
      <Text style={styles.label}>Amount (USD)</Text>
      <TextInput 
        style={styles.input}
        value={amount} 
        onChangeText={setAmount} 
        keyboardType="decimal-pad"
        placeholder="0.00"
      />
      
      <Text style={styles.label}>Note</Text>
      <TextInput 
        style={styles.input}
        value={note} 
        onChangeText={setNote}
        placeholder="What was this for?"
      />
      
      <Button title="Add Equal Expense" onPress={submit} />
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
  },
});
