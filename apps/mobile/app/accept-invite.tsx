import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../src/lib/api';

export default function AcceptInvite() {
  const { token } = useLocalSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [accepting, setAccepting] = useState(false);

  // Get current user
  const { data: me } = useQuery({
    queryKey: ["me"],
    queryFn: async () => (await api.get("/me")).data,
  });

  // Get invite details
  const { data: invite, isLoading, error } = useQuery({
    queryKey: ["invite", token],
    queryFn: async () => {
      const invites = await api.get("/invites");
      return invites.data.find((inv: any) => inv.token === token);
    },
    enabled: !!token && !!me?.id,
  });

  const acceptMutation = useMutation({
    mutationFn: async () => {
      if (!invite || !me?.id) throw new Error("Missing data");
      return (await api.post(`/groups/${invite.groupId}/invites/accept`, {
        token: invite.token,
        userId: me.id,
      })).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["groups"] });
      queryClient.invalidateQueries({ queryKey: ["pending-invites"] });
      router.replace('/(tabs)/groups');
    },
    onError: (error: any) => {
      console.error('Accept invite error:', error);
    },
  });

  const handleAccept = () => {
    setAccepting(true);
    acceptMutation.mutate();
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#32a852" />
        <Text style={styles.loadingText}>Loading invitation...</Text>
      </View>
    );
  }

  if (error || !invite) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorIcon}>❌</Text>
        <Text style={styles.errorTitle}>Invalid Invitation</Text>
        <Text style={styles.errorSubtitle}>
          This invitation link is invalid or has expired.
        </Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.replace('/(tabs)/groups')}
        >
          <Text style={styles.backButtonText}>Go to Groups</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.icon}>📧</Text>
        <Text style={styles.title}>You're Invited!</Text>
        <Text style={styles.subtitle}>
          You've been invited to join the group:
        </Text>
        
        <View style={styles.groupCard}>
          <Text style={styles.groupName}>{invite.group?.name || "Unknown Group"}</Text>
          <Text style={styles.groupRole}>Role: {invite.role}</Text>
          <Text style={styles.groupDate}>
            Invited {new Date(invite.createdAt).toLocaleDateString()}
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.acceptButton, accepting && styles.acceptButtonDisabled]}
          onPress={handleAccept}
          disabled={accepting || acceptMutation.isPending}
        >
          <Text style={styles.acceptButtonText}>
            {accepting || acceptMutation.isPending ? "Accepting..." : "Accept Invitation"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.declineButton}
          onPress={() => router.replace('/(tabs)/groups')}
          disabled={accepting || acceptMutation.isPending}
        >
          <Text style={styles.declineButtonText}>Maybe Later</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  content: {
    alignItems: 'center',
    width: '100%',
    maxWidth: 400,
  },
  icon: {
    fontSize: 64,
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 30,
    textAlign: 'center',
  },
  groupCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    alignItems: 'center',
  },
  groupName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  groupRole: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 4,
  },
  groupDate: {
    fontSize: 14,
    color: '#9ca3af',
  },
  acceptButton: {
    backgroundColor: '#32a852',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  acceptButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  acceptButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  declineButton: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  declineButtonText: {
    color: '#6b7280',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
  },
  errorIcon: {
    fontSize: 64,
    marginBottom: 20,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#dc2626',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorSubtitle: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 30,
    textAlign: 'center',
  },
  backButton: {
    backgroundColor: '#32a852',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  backButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
