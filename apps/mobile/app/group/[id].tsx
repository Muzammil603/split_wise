import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../src/lib/api";
import { useLocalSearchParams, useRouter } from "expo-router";
import { View, Text, ScrollView, Pressable, StyleSheet, TouchableOpacity, Alert } from "react-native";
import { useState } from "react";

export default function GroupDetail() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"expenses" | "members" | "settle" | "settings">("expenses");

  const { data: group, isLoading: groupLoading } = useQuery({
    queryKey: ["group", id],
    queryFn: async () => {
      const response = await api.get(`/groups/${id}`);
      console.log('Group detail response:', response.data);
      return response.data;
    },
  });

  const { data: expenses, isLoading: expensesLoading } = useQuery({
    queryKey: ["expenses", id],
    queryFn: async () => {
      const response = await api.get(`/groups/${id}/expenses?limit=20`);
      console.log('🔍 Expenses API Response:', response.data);
      console.log('🔍 Expenses items:', response.data.items);
      return response.data.items;
    },
  });

  const { data: balances, isLoading: balancesLoading } = useQuery({
    queryKey: ["balances", id],
    queryFn: async () => (await api.get(`/groups/${id}/balances`)).data,
  });

  const { data: friends } = useQuery({
    queryKey: ["friends"],
    queryFn: async () => (await api.get("/friends")).data,
  });

  const { data: me } = useQuery({
    queryKey: ["me"],
    queryFn: async () => (await api.get("/me")).data,
  });

  const addFriendToGroupMutation = useMutation({
    mutationFn: async (friendId: string) => {
      return (await api.post(`/groups/${id}/members`, {
        userId: friendId,
        role: "member"
      })).data;
    },
    onSuccess: () => {
      Alert.alert("Success", "Friend added to group successfully!");
      queryClient.invalidateQueries({ queryKey: ["group", id] });
    },
    onError: (error: any) => {
      Alert.alert("Error", error.response?.data?.message || "Failed to add friend to group");
    },
  });

  const handleAddExpense = () => {
    router.push(`/add-expense?groupId=${id}`);
  };

  const handleSettleUp = () => {
    router.push(`/settle-up?groupId=${id}`);
  };

  if (groupLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading group...</Text>
      </View>
    );
  }

  if (!group) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Group not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.groupName}>{group.name}</Text>
        <Text style={styles.groupInfo}>
          {group.currency} · {group.members?.length || 0} members
        </Text>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity style={styles.addExpenseButton} onPress={handleAddExpense}>
          <Text style={styles.addExpenseText}>Add an expense</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.settleButton} onPress={handleSettleUp}>
          <Text style={styles.settleText}>Settle up</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        {[
          { key: "expenses", label: "Expenses" },
          { key: "members", label: "Members" },
          { key: "settle", label: "Settle Up" },
          { key: "settings", label: "Settings" },
        ].map((tab) => (
          <TouchableOpacity
            key={tab.key}
            onPress={() => setActiveTab(tab.key as any)}
            style={[
              styles.tab,
              activeTab === tab.key ? styles.activeTab : styles.inactiveTab
            ]}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === tab.key ? styles.activeTabText : styles.inactiveTabText
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      <ScrollView style={styles.content}>
        {activeTab === "expenses" && (
          <View>
            {expensesLoading ? (
              <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>Loading expenses...</Text>
              </View>
            ) : expenses && expenses.length > 0 ? (
              expenses.map((item: any) => {
                console.log('🔍 Processing expense item:', {
                  id: item.id,
                  type: item.type,
                  paidById: item.paidById,
                  paidBy: item.paidBy?.name,
                  note: item.note,
                  amountCents: item.amountCents
                });
                // Handle settlements
                if (item.type === 'settlement') {
                  const isFromUser = item.fromUserId === me?.id;
                  const isToUser = item.toUserId === me?.id;
                  
                  return (
                    <View key={item.id} style={styles.settlementCard}>
                      <View style={styles.settlementHeader}>
                        <View style={styles.settlementLeft}>
                          <Text style={styles.settlementAmount}>
                            ${(item.amountCents / 100).toFixed(2)} {item.currency}
                          </Text>
                          <Text style={styles.settlementNote}>
                            {item.note || "Settlement payment"}
                          </Text>
                          <Text style={styles.settlementPaidBy}>
                            {isFromUser 
                              ? `You paid ${item.toUser?.name || "Unknown"}`
                              : isToUser
                                ? `${item.fromUser?.name || "Unknown"} paid you`
                                : `${item.fromUser?.name || "Unknown"} paid ${item.toUser?.name || "Unknown"}`
                            }
                          </Text>
                        </View>
                        <View style={styles.settlementRight}>
                          <Text style={styles.settlementDate}>
                            {new Date(item.createdAt).toLocaleDateString()}
                          </Text>
                          <View style={styles.settlementStatus}>
                            <Text style={styles.settlementStatusText}>
                              {isFromUser ? "You paid" : isToUser ? "You received" : "Payment"}
                            </Text>
                          </View>
                        </View>
                      </View>
                    </View>
                  );
                }

                // Handle expenses (existing logic)
                const userSplit = item.splits?.find((split: any) => split.userId === me?.id);
                const userOwedAmount = userSplit ? userSplit.amountCents : 0;
                const userPaid = item.paidById === me?.id;
                const isOwed = userPaid && userOwedAmount > 0;
                const owes = !userPaid && userOwedAmount > 0;

                // Calculate who the user lent money to
                const otherSplits = item.splits?.filter((split: any) => split.userId !== me?.id) || [];
                const lentToCount = otherSplits.length;
                const lentToText = lentToCount === 1 
                  ? `to ${otherSplits[0]?.user?.name || 'someone'}`
                  : lentToCount > 1 
                    ? '' // Just show "you lent $X" for multiple people
                    : '';

                return (
                  <TouchableOpacity 
                    key={item.id} 
                    style={styles.expenseCard}
                    onPress={() => router.push(`/expense/${item.id}?groupId=${id}`)}
                  >
                    <View style={styles.expenseHeader}>
                      <View style={styles.expenseLeft}>
                        <Text style={styles.expenseAmount}>
                          ${(item.amountCents / 100).toFixed(2)} {item.currency}
                        </Text>
                        <Text style={styles.expenseNote}>
                          {item.note || "No description"}
                        </Text>
                        <Text style={styles.expensePaidBy}>
                          {userPaid 
                            ? `You paid $${(item.amountCents / 100).toFixed(2)}`
                            : `${item.paidBy?.name || "Unknown"} paid $${(item.amountCents / 100).toFixed(2)}`
                          }
                        </Text>
                      </View>
                      <View style={styles.expenseRight}>
                        <Text style={styles.expenseDate}>
                          {new Date(item.createdAt).toLocaleDateString()}
                        </Text>
                        {userPaid ? (
                          <View style={styles.expenseOwed}>
                            <Text style={[styles.expenseOwedLabel, styles.expenseOwedGreen]}>
                              you lent ${(userOwedAmount / 100).toFixed(2)} {lentToText}
                            </Text>
                          </View>
                        ) : userOwedAmount > 0 ? (
                          <View style={styles.expenseOwed}>
                            <Text style={styles.expenseOwedLabel}>
                              {item.paidBy?.name || "Unknown"} lent you
                            </Text>
                            <Text style={[styles.expenseOwedAmount, styles.expenseOwedRed]}>
                              ${(userOwedAmount / 100).toFixed(2)}
                            </Text>
                          </View>
                        ) : (
                          <View style={styles.expenseOwed}>
                            <Text style={styles.expenseOwedLabel}>not involved</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>No expenses yet</Text>
                <Text style={styles.emptySubtitle}>
                  Add your first expense to get started!
                </Text>
              </View>
            )}
          </View>
        )}

        {activeTab === "members" && (
          <View>
            {group.members && group.members.length > 0 ? (
              group.members.map((member: any) => {
                console.log('Member data:', member);
                return (
                  <View key={member.userId} style={styles.memberCard}>
                    <View style={styles.memberAvatar}>
                      <Text style={styles.memberAvatarText}>
                        {(member.user?.name || member.userId).charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.memberInfo}>
                      <Text style={styles.memberName}>
                        {member.user?.name || member.userId}
                      </Text>
                      <Text style={styles.memberEmail}>
                        {member.user?.email || "No email"}
                      </Text>
                    </View>
                    <Text style={styles.memberRole}>
                      {member.role === 'owner' ? '👑' : '👤'}
                    </Text>
                  </View>
                );
              })
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>No members</Text>
                <Text style={styles.emptySubtitle}>
                  This group has no members yet.
                </Text>
              </View>
            )}
          </View>
        )}

        {activeTab === "settle" && (
          <View>
            <TouchableOpacity 
              style={styles.settleUpButton}
              onPress={() => router.push(`/settle-up?groupId=${id}`)}
            >
              <Text style={styles.settleUpButtonText}>Settle Up</Text>
            </TouchableOpacity>
            
            {balancesLoading ? (
              <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>Loading balances...</Text>
              </View>
            ) : balances && balances.length > 0 ? (
              <>
                {balances.map((balance: any) => (
                  <View key={balance.userId} style={styles.balanceCard}>
                    <View style={styles.balanceHeader}>
                      <Text style={styles.balanceUser}>
                        {balance.user?.name || balance.userId}
                      </Text>
                      <Text
                        style={[
                          styles.balanceAmount,
                          Number(balance.balanceCents) >= 0
                            ? styles.positiveBalance
                            : styles.negativeBalance
                        ]}
                      >
                        {Number(balance.balanceCents) >= 0 ? 'gets back' : 'owes'} ${Math.abs(Number(balance.balanceCents) / 100).toFixed(2)}
                      </Text>
                    </View>
                  </View>
                ))}
              </>
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>All settled up!</Text>
                <Text style={styles.emptySubtitle}>
                  No outstanding balances in this group.
                </Text>
              </View>
            )}
          </View>
        )}

        {activeTab === "settings" && (
          <View>
            <View style={styles.settingsSection}>
              <Text style={styles.settingsTitle}>Add Friends to Group</Text>
              <Text style={styles.settingsSubtitle}>
                Add your friends to this group so they can participate in expenses
              </Text>
              
              {friends && friends.friends && friends.friends.length > 0 ? (
                <View style={styles.friendsList}>
                  {friends.friends.map((friend: any) => {
                    // Check if friend is already a member of this group
                    const isAlreadyMember = group.members?.some((member: any) => member.userId === friend.id);
                    
                    return (
                      <View key={friend.id} style={styles.friendCard}>
                        <View style={styles.friendAvatar}>
                          <Text style={styles.friendAvatarText}>
                            {friend.name.charAt(0).toUpperCase()}
                          </Text>
                        </View>
                        <View style={styles.friendInfo}>
                          <Text style={styles.friendName}>{friend.name}</Text>
                          <Text style={styles.friendEmail}>{friend.email}</Text>
                        </View>
                        <TouchableOpacity
                          style={[
                            styles.addFriendButton,
                            isAlreadyMember && styles.addFriendButtonDisabled
                          ]}
                          onPress={() => {
                            if (!isAlreadyMember) {
                              addFriendToGroupMutation.mutate(friend.id);
                            }
                          }}
                          disabled={isAlreadyMember || addFriendToGroupMutation.isPending}
                        >
                          <Text style={[
                            styles.addFriendButtonText,
                            isAlreadyMember && styles.addFriendButtonTextDisabled
                          ]}>
                            {isAlreadyMember ? "Added" : "Add to Group"}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </View>
              ) : (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyTitle}>No friends yet</Text>
                  <Text style={styles.emptySubtitle}>
                    Add friends from your Account page first, then you can invite them to groups.
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    fontSize: 16,
    color: '#6b7280',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#dc2626',
    fontWeight: '600',
  },
  header: {
    backgroundColor: 'white',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  groupName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  groupInfo: {
    fontSize: 16,
    color: '#6b7280',
  },
  actionButtons: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
  },
  addExpenseButton: {
    flex: 1,
    backgroundColor: '#32a852',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  addExpenseText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  settleButton: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  settleText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '600',
  },
  settleUpButton: {
    backgroundColor: '#32a852',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  settleUpButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#32a852',
  },
  inactiveTab: {
    borderBottomColor: 'transparent',
  },
  tabText: {
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '500',
  },
  activeTabText: {
    color: '#32a852',
  },
  inactiveTabText: {
    color: '#6b7280',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  expenseCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  expenseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  expenseLeft: {
    flex: 1,
  },
  expenseRight: {
    alignItems: 'flex-end',
  },
  expenseAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  expenseDate: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  expenseNote: {
    fontSize: 16,
    color: '#374151',
    marginBottom: 4,
  },
  expensePaidBy: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  expenseOwed: {
    alignItems: 'flex-end',
  },
  expenseOwedLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 2,
  },
  expenseOwedAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#059669', // Green for amounts you're owed
  },
  expenseOwedRed: {
    color: '#dc2626', // Red for amounts you owe
  },
  expenseOwedGreen: {
    color: '#059669', // Green for amounts you lent
  },
  memberCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#32a852',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  memberAvatarText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  memberEmail: {
    fontSize: 14,
    color: '#6b7280',
  },
  memberRole: {
    fontSize: 20,
  },
  balanceCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  balanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  balanceUser: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  balanceAmount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  positiveBalance: {
    color: '#059669',
  },
  negativeBalance: {
    color: '#dc2626',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  settingsSection: {
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
  settingsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  settingsSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 20,
    lineHeight: 20,
  },
  friendsList: {
    gap: 12,
  },
  friendCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
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
  addFriendButton: {
    backgroundColor: '#32a852',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
  },
  addFriendButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  addFriendButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
  addFriendButtonTextDisabled: {
    color: '#6b7280',
  },
  // Settlement styles
  settlementCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#10b981', // Green border for settlements
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  settlementHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  settlementLeft: {
    flex: 1,
  },
  settlementAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  settlementNote: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  settlementPaidBy: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  settlementRight: {
    alignItems: 'flex-end',
  },
  settlementDate: {
    fontSize: 12,
    color: '#9ca3af',
    marginBottom: 8,
  },
  settlementStatus: {
    backgroundColor: '#d1fae5', // Light green background
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  settlementStatusText: {
    fontSize: 12,
    color: '#065f46', // Dark green text
    fontWeight: '600',
  },
});
