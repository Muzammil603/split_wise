import { View, Text, StyleSheet, TouchableOpacity, Alert, TextInput, Modal, FlatList, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, setTokens } from "../../src/lib/api";
import { useState } from "react";

export default function Settings() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [inviteModalVisible, setInviteModalVisible] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [addFriendModalVisible, setAddFriendModalVisible] = useState(false);
  const [friendToken, setFriendToken] = useState("");

  const { data: me } = useQuery({
    queryKey: ["me"],
    queryFn: async () => (await api.get("/me")).data,
  });

  const { data: groups } = useQuery({
    queryKey: ["groups"],
    queryFn: async () => (await api.get("/groups?limit=50")).data.items,
  });

  const { data: friends } = useQuery({
    queryKey: ["friends"],
    queryFn: async () => (await api.get("/friends")).data,
  });

  // Get pending invites for the current user
  const { data: pendingInvites } = useQuery({
    queryKey: ["pending-invites"],
    queryFn: async () => (await api.get("/invites")).data,
    enabled: !!me?.id,
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      console.log("Logout: Starting mutation...");
      console.log("Logout: Clearing tokens...");
      // Clear tokens from API client
      setTokens(null, null);
      console.log("Logout: Tokens cleared");
      return Promise.resolve(); // Make sure we return a resolved promise
    },
    onSuccess: () => {
      console.log("Logout: Success callback triggered");
      console.log("Logout: Clearing cache...");
      // Clear all cached data
      queryClient.clear();
      console.log("Logout: Cache cleared");
      console.log("Logout: Navigating to login...");
      // Navigate to login
      router.replace("/login");
      console.log("Logout: Navigation called");
    },
    onError: (error) => {
      console.error("Logout error:", error);
      Alert.alert("Error", "Failed to logout");
    },
  });

  const deleteAccountMutation = useMutation({
    mutationFn: async () => {
      return (await api.delete("/me")).data;
    },
    onSuccess: () => {
      // Clear all cached data
      queryClient.clear();
      // Navigate to login
      router.replace("/login");
    },
    onError: (error: any) => {
      Alert.alert("Error", error.response?.data?.message || "Failed to delete account");
    },
  });

  const handleLogout = () => {
    console.log("Logout button pressed");
    // For now, let's skip the confirmation dialog and go straight to logout
    console.log("Calling logout mutation directly...");
    logoutMutation.mutate();
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "Delete Account",
      "Are you sure you want to delete your account? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => deleteAccountMutation.mutate() },
      ]
    );
  };

  const inviteMutation = useMutation({
    mutationFn: async ({ groupId, email }: { groupId: string; email: string }) => {
      return (await api.post(`/groups/${groupId}/invites`, {
        email,
        role: "member"
      })).data;
    },
    onSuccess: () => {
      Alert.alert("Success", "Invitation sent successfully!");
      setInviteModalVisible(false);
      setInviteEmail("");
      setSelectedGroupId("");
      queryClient.invalidateQueries({ queryKey: ["groups"] });
    },
    onError: (error: any) => {
      Alert.alert("Error", error.response?.data?.message || "Failed to send invitation");
    },
  });

  const handleInviteFriend = (groupId: string) => {
    setSelectedGroupId(groupId);
    setInviteModalVisible(true);
  };

  const handleSendInvite = () => {
    if (!inviteEmail.trim()) {
      Alert.alert("Error", "Please enter an email address");
      return;
    }

    if (!selectedGroupId) {
      Alert.alert("Error", "Please select a group");
      return;
    }

    inviteMutation.mutate({
      groupId: selectedGroupId,
      email: inviteEmail.trim(),
    });
  };

  const acceptInviteMutation = useMutation({
    mutationFn: async ({ groupId, token }: { groupId: string; token: string }) => {
      return (await api.post(`/groups/${groupId}/invites/accept`, {
        token,
        userId: me?.id,
      })).data;
    },
    onSuccess: () => {
      Alert.alert("Success", "Invitation accepted! You are now a member of this group.");
      queryClient.invalidateQueries({ queryKey: ["groups"] });
      queryClient.invalidateQueries({ queryKey: ["pending-invites"] });
    },
    onError: (error: any) => {
      Alert.alert("Error", error.response?.data?.message || "Failed to accept invitation");
    },
  });

  const addFriendMutation = useMutation({
    mutationFn: async () => {
      return (await api.post("/friends/add")).data;
    },
    onSuccess: (data) => {
      setFriendToken(data.token);
      setAddFriendModalVisible(true);
      queryClient.invalidateQueries({ queryKey: ["friends"] });
    },
    onError: (error: any) => {
      Alert.alert("Error", error.response?.data?.message || "Failed to generate friend token");
    },
  });

  const acceptFriendMutation = useMutation({
    mutationFn: async (token: string) => {
      return (await api.post("/friends/accept", { token })).data;
    },
    onSuccess: (data) => {
      Alert.alert("Success", data.message);
      queryClient.invalidateQueries({ queryKey: ["friends"] });
      setAddFriendModalVisible(false);
      setFriendToken("");
    },
    onError: (error: any) => {
      Alert.alert("Error", error.response?.data?.message || "Failed to accept friend");
    },
  });

  const handleAcceptInvite = (groupId: string, token: string) => {
    acceptInviteMutation.mutate({ groupId, token });
  };

  const handleAddFriend = () => {
    addFriendMutation.mutate();
  };

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
        <Text style={styles.title}>Account</Text>
        <Text style={styles.subtitle}>Manage your account settings</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={true}>
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{me?.name || "User"}</Text>
          <Text style={styles.userEmail}>{me?.email || "No email"}</Text>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutButtonText}>Logout</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteAccount}>
            <Text style={styles.deleteButtonText}>Delete Account</Text>
          </TouchableOpacity>
        </View>

        {/* Pending Invites Section */}
        {pendingInvites && pendingInvites.length > 0 && (
          <View style={styles.inviteSection}>
            <Text style={styles.sectionTitle}>Pending Invites</Text>
            <Text style={styles.sectionSubtitle}>Accept invitations to join groups</Text>

            <FlatList
              data={pendingInvites}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <View style={styles.inviteCard}>
                  <View style={styles.inviteInfo}>
                    <Text style={styles.inviteGroupName}>{item.group.name}</Text>
                    <Text style={styles.inviteRole}>Role: {item.role}</Text>
                    <Text style={styles.inviteDate}>
                      Invited {new Date(item.createdAt).toLocaleDateString()}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.acceptInviteButton}
                    onPress={() => handleAcceptInvite(item.groupId, item.token)}
                    disabled={acceptInviteMutation.isPending}
                  >
                    <Text style={styles.acceptInviteText}>
                      {acceptInviteMutation.isPending ? "Accepting..." : "Accept"}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
              scrollEnabled={true}
              style={styles.invitesList}
              showsVerticalScrollIndicator={true}
            />
          </View>
        )}

            {/* Friends Section */}
            <View style={styles.inviteSection}>
              <Text style={styles.sectionTitle}>Friends</Text>
              <Text style={styles.sectionSubtitle}>Manage your friends</Text>

              <View style={styles.friendActions}>
                <TouchableOpacity style={styles.addFriendButton} onPress={handleAddFriend}>
                  <Text style={styles.addFriendButtonText}>Add Friend</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.acceptFriendButton} 
                  onPress={() => router.push('/accept-friend')}
                >
                  <Text style={styles.acceptFriendButtonText}>Accept Friend</Text>
                </TouchableOpacity>
              </View>

              {friends && friends.friends && friends.friends.length > 0 ? (
                <FlatList
                  data={friends.friends}
                  keyExtractor={(item) => item.id}
                  renderItem={({ item }) => (
                    <View style={styles.friendCard}>
                      <View style={styles.friendAvatar}>
                        <Text style={styles.friendAvatarText}>
                          {item.name.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <View style={styles.friendInfo}>
                        <Text style={styles.friendName}>{item.name}</Text>
                        <Text style={styles.friendEmail}>{item.email}</Text>
                      </View>
                    </View>
                  )}
                  scrollEnabled={true}
                  style={styles.friendsList}
                  showsVerticalScrollIndicator={true}
                />
              ) : (
                <View style={styles.emptyFriends}>
                  <Text style={styles.emptyFriendsText}>No friends yet</Text>
                  <Text style={styles.emptyFriendsSubtext}>Add friends to start inviting them to groups</Text>
                </View>
              )}
            </View>

            <View style={styles.inviteSection}>
              <Text style={styles.sectionTitle}>Invite Friends to Groups</Text>
              <Text style={styles.sectionSubtitle}>Invite friends to your groups</Text>

          {groups && groups.length > 0 ? (
            <FlatList
              data={groups}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.groupInviteButton}
                  onPress={() => handleInviteFriend(item.id)}
                >
                  <Text style={styles.groupInviteText}>{item.name}</Text>
                  <Text style={styles.groupInviteSubtext}>👥 {item.members?.length || 0} members</Text>
                </TouchableOpacity>
              )}
              scrollEnabled={true}
              style={styles.groupsList}
              showsVerticalScrollIndicator={true}
            />
          ) : (
            <View style={styles.emptyGroups}>
              <Text style={styles.emptyGroupsText}>No groups yet</Text>
              <Text style={styles.emptyGroupsSubtext}>Create a group first to invite friends</Text>
            </View>
          )}
        </View>

        <View style={styles.features}>
          <Text style={styles.featuresTitle}>Premium Features (All Free!)</Text>
          <View style={styles.featureList}>
            <Text style={styles.featureItem}>✅ Recurring Expenses</Text>
            <Text style={styles.featureItem}>✅ Multi-currency Support</Text>
            <Text style={styles.featureItem}>✅ Receipt OCR</Text>
            <Text style={styles.featureItem}>✅ Advanced Notifications</Text>
            <Text style={styles.featureItem}>✅ Data Export</Text>
            <Text style={styles.featureItem}>✅ Privacy Controls</Text>
          </View>
        </View>
      </ScrollView>

          {/* Share Friend Token Modal */}
          <Modal
            visible={addFriendModalVisible}
            animationType="slide"
            transparent={true}
            onRequestClose={() => setAddFriendModalVisible(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Share Friend Token</Text>
                <Text style={styles.modalSubtitle}>
                  Share this token with your friend so they can add you
                </Text>

                <View style={styles.tokenContainer}>
                  <Text style={styles.tokenLabel}>Friend Token:</Text>
                  <Text style={styles.tokenText}>{friendToken}</Text>
                  <TouchableOpacity 
                    style={styles.copyButton}
                    onPress={() => {
                      // Copy to clipboard functionality would go here
                      Alert.alert("Copied", "Token copied to clipboard");
                    }}
                  >
                    <Text style={styles.copyButtonText}>Copy Token</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => {
                      setAddFriendModalVisible(false);
                      setFriendToken("");
                    }}
                  >
                    <Text style={styles.cancelButtonText}>Close</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>

          {/* Invite Modal */}
          <Modal
            visible={inviteModalVisible}
            animationType="slide"
            transparent={true}
            onRequestClose={() => setInviteModalVisible(false)}
          >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Invite Friend</Text>
            <Text style={styles.modalSubtitle}>
              Send an invitation to join your group
            </Text>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Email Address</Text>
              <TextInput
                style={styles.input}
                value={inviteEmail}
                onChangeText={setInviteEmail}
                placeholder="friend@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setInviteModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.sendButton, !inviteEmail.trim() && styles.sendButtonDisabled]}
                onPress={handleSendInvite}
                disabled={!inviteEmail.trim() || inviteMutation.isPending}
              >
                <Text style={styles.sendButtonText}>
                  {inviteMutation.isPending ? "Sending..." : "Send Invite"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  userInfo: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 16,
    color: '#6b7280',
  },
  actions: {
    gap: 12,
    marginBottom: 30,
  },
  logoutButton: {
    backgroundColor: '#f3f4f6',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#d1d5db',
    alignItems: 'center',
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  deleteButton: {
    backgroundColor: '#fef2f2',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fecaca',
    alignItems: 'center',
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#dc2626',
  },
  features: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  featuresTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16,
    textAlign: 'center',
  },
  featureList: {
    gap: 8,
  },
  featureItem: {
    fontSize: 16,
    color: '#374151',
    lineHeight: 24,
  },
  inviteSection: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 16,
  },
  groupsList: {
    maxHeight: 300,
  },
  groupInviteButton: {
    backgroundColor: '#f3f4f6',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  groupInviteText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  groupInviteSubtext: {
    fontSize: 14,
    color: '#6b7280',
  },
  emptyGroups: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  emptyGroupsText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  emptyGroupsSubtext: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 20,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 20,
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
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#111827',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  sendButton: {
    flex: 1,
    backgroundColor: '#32a852',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  sendButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  invitesList: {
    maxHeight: 300,
  },
  inviteCard: {
    backgroundColor: '#f3f4f6',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  inviteInfo: {
    flex: 1,
  },
  inviteGroupName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  inviteRole: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 2,
  },
  inviteDate: {
    fontSize: 12,
    color: '#9ca3af',
  },
  acceptInviteButton: {
    backgroundColor: '#32a852',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
  },
      acceptInviteText: {
        fontSize: 14,
        fontWeight: '600',
        color: 'white',
      },
      friendActions: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 16,
      },
      addFriendButton: {
        flex: 1,
        backgroundColor: '#32a852',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 8,
        alignItems: 'center',
      },
      addFriendButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: 'white',
      },
      acceptFriendButton: {
        flex: 1,
        backgroundColor: '#f3f4f6',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 8,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#d1d5db',
      },
      acceptFriendButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#374151',
      },
      friendsList: {
        maxHeight: 300,
      },
      friendCard: {
        backgroundColor: '#f3f4f6',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 8,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        flexDirection: 'row',
        alignItems: 'center',
      },
      friendAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#32a852',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
      },
      friendAvatarText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
      },
      friendInfo: {
        flex: 1,
      },
      friendName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1f2937',
        marginBottom: 2,
      },
      friendEmail: {
        fontSize: 14,
        color: '#6b7280',
      },
      emptyFriends: {
        alignItems: 'center',
        paddingVertical: 20,
      },
      emptyFriendsText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1f2937',
        marginBottom: 4,
      },
      emptyFriendsSubtext: {
        fontSize: 14,
        color: '#6b7280',
        textAlign: 'center',
      },
      tokenContainer: {
        marginBottom: 20,
      },
      tokenLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 8,
      },
      tokenText: {
        backgroundColor: '#f3f4f6',
        borderWidth: 1,
        borderColor: '#d1d5db',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 14,
        color: '#111827',
        fontFamily: 'monospace',
        marginBottom: 12,
      },
      copyButton: {
        backgroundColor: '#32a852',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 6,
        alignItems: 'center',
      },
      copyButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: 'white',
      },
    });