import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "../../src/lib/api";

type Form = {
  groupId: string;
  paidById: string;
  amount: string;
  note?: string;
  mode: "equal" | "shares" | "percent" | "exact";
  splits: { userId: string; value: string }[];
  date?: string;
};

export default function AddExpense() {
  const [tab, setTab] = useState<Form["mode"]>("equal");
  const [formData, setFormData] = useState<Form>({
    groupId: "",
    paidById: "",
    amount: "",
    note: "",
    mode: "equal",
    splits: [],
    date: new Date().toISOString().split('T')[0],
  });

  const { data: groups } = useQuery({
    queryKey: ["groups"],
    queryFn: async () => (await api.get("/groups?limit=50")).data.items,
  });

  const { data: me } = useQuery({
    queryKey: ["me"],
    queryFn: async () => (await api.get("/me")).data,
  });

  const createExpense = useMutation({
    mutationFn: async (data: Form) => {
      const totalCents = Math.round(parseFloat(data.amount) * 100);
      const body: any = {
        paidById: data.paidById,
        totalCents,
        currency: "USD",
        note: data.note,
        mode: data.mode,
        date: data.date,
      };
      
      if (data.mode !== "equal") {
        body.splits = data.splits.map(s => ({
          userId: s.userId,
          value: s.value,
        }));
      }
      
      return (await api.post(`/groups/${data.groupId}/expenses`, body, {
        headers: { "Idempotency-Key": crypto.randomUUID() }
      })).data;
    },
    onSuccess: () => {
      Alert.alert("Success", "Expense added successfully!");
      setFormData({
        groupId: "",
        paidById: "",
        amount: "",
        note: "",
        mode: "equal",
        splits: [],
        date: new Date().toISOString().split('T')[0],
      });
    },
    onError: (error: any) => {
      Alert.alert("Error", error.response?.data?.message || "Failed to add expense");
    },
  });

  const handleSubmit = () => {
    if (!formData.groupId || !formData.paidById || !formData.amount) {
      Alert.alert("Error", "Please fill in all required fields");
      return;
    }
    createExpense.mutate(formData);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Add Expense</Text>
      </View>

      <View style={styles.form}>
        {/* Group Selection */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Group *</Text>
          <TextInput
            style={styles.input}
            value={formData.groupId}
            onChangeText={(text) => setFormData({ ...formData, groupId: text })}
            placeholder="Enter group ID"
          />
        </View>

        {/* Payer Selection */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Paid by *</Text>
          <TextInput
            style={styles.input}
            value={formData.paidById}
            onChangeText={(text) => setFormData({ ...formData, paidById: text })}
            placeholder="Enter user ID"
          />
        </View>

        {/* Amount */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Amount *</Text>
          <TextInput
            style={styles.input}
            value={formData.amount}
            onChangeText={(text) => setFormData({ ...formData, amount: text })}
            placeholder="0.00"
            keyboardType="decimal-pad"
          />
        </View>

        {/* Split Mode Selection */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Split Mode</Text>
          <View style={styles.tabContainer}>
            {(["equal", "shares", "percent", "exact"] as const).map((mode) => (
              <TouchableOpacity
                key={mode}
                style={[styles.tab, tab === mode && styles.activeTab]}
                onPress={() => {
                  setTab(mode);
                  setFormData({ ...formData, mode });
                }}
              >
                <Text style={[styles.tabText, tab === mode && styles.activeTabText]}>
                  {mode.charAt(0).toUpperCase() + mode.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Note */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Note</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={formData.note}
            onChangeText={(text) => setFormData({ ...formData, note: text })}
            placeholder="What was this for?"
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Date */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Date</Text>
          <TextInput
            style={styles.input}
            value={formData.date}
            onChangeText={(text) => setFormData({ ...formData, date: text })}
            placeholder="YYYY-MM-DD"
          />
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, createExpense.isPending && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={createExpense.isPending}
        >
          <Text style={styles.submitButtonText}>
            {createExpense.isPending ? "Adding..." : "Add Expense"}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  form: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'white',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#d1d5db',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  tabContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: '#32a852',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  activeTabText: {
    color: 'white',
  },
  submitButton: {
    backgroundColor: '#32a852',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  submitButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});