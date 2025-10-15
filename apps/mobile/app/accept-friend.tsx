import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../src/lib/api";
import { useRouter } from "expo-router";
import { useState } from "react";

export default function AcceptFriend() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [friendToken, setFriendToken] = useState("");

  const acceptFriendMutation = useMutation({
    mutationFn: async (token: string) => {
      return (await api.post("/friends/accept", { token })).data;
    },
    onSuccess: (data) => {
      Alert.alert("Success", data.message);
      queryClient.invalidateQueries({ queryKey: ["friends"] });
      router.back();
    },
    onError: (error: any) => {
      Alert.alert("Error", error.response?.data?.message || "Failed to accept friend");
    },
  });

  const handleAcceptFriend = () => {
    if (!friendToken.trim()) {
      Alert.alert("Error", "Please enter a friend token");
      return;
    }
    acceptFriendMutation.mutate(friendToken.trim());
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Accept Friend</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Add a Friend</Text>
          <Text style={styles.cardSubtitle}>
            Enter the friend token you received from someone to become friends
          </Text>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Friend Token</Text>
            <TextInput
              style={styles.input}
              value={friendToken}
              onChangeText={setFriendToken}
              placeholder="Enter friend token"
              autoCapitalize="none"
              autoCorrect={false}
              multiline
            />
          </View>

          <TouchableOpacity
            style={[styles.acceptButton, !friendToken.trim() && styles.acceptButtonDisabled]}
            onPress={handleAcceptFriend}
            disabled={!friendToken.trim() || acceptFriendMutation.isPending}
          >
            <Text style={styles.acceptButtonText}>
              {acceptFriendMutation.isPending ? "Accepting..." : "Accept Friend"}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.helpCard}>
          <Text style={styles.helpTitle}>How to get a friend token?</Text>
          <Text style={styles.helpText}>
            1. Ask your friend to go to Account → Add Friend{'\n'}
            2. They'll get a unique token{'\n'}
            3. They share that token with you{'\n'}
            4. Enter the token here to become friends
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    backgroundColor: 'white',
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 16,
  },
  backButtonText: {
    fontSize: 16,
    color: '#32a852',
    fontWeight: '600',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  cardSubtitle: {
    fontSize: 16,
    color: '#6b7280',
    lineHeight: 24,
    marginBottom: 24,
  },
  inputContainer: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
    minHeight: 100,
    textAlignVertical: 'top',
  },
  acceptButton: {
    backgroundColor: '#32a852',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  acceptButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  acceptButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  helpCard: {
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    padding: 20,
  },
  helpTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 12,
  },
  helpText: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
});
