import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../src/lib/api";
import { Link, useRouter } from "expo-router";
import { View, Text, Pressable, FlatList, RefreshControl, StyleSheet, TouchableOpacity, Alert } from "react-native";
import { useState, useEffect } from "react";

export default function Groups() {
  const [refreshing, setRefreshing] = useState(false);
  const queryClient = useQueryClient();
  const router = useRouter();
  
  console.log('Groups component rendered');
  
  const { data, refetch, error } = useQuery({
    queryKey: ["groups"],
    queryFn: async () => {
      const response = await api.get("/groups?limit=50");
      console.log('Groups response:', response.data);
      return response.data.items;
    },
    retry: false, // Don't retry on 401 errors
  });

  // Handle 401 errors by redirecting to login
  useEffect(() => {
    if (error && (error as any)?.response?.status === 401) {
      console.log('Unauthorized, redirecting to login');
      router.replace('/login');
    }
  }, [error, router]);

  if (error) {
    console.error('Groups query error:', error);
  }

  // Get current user for creating groups
  const { data: me } = useQuery({
    queryKey: ["me"],
    queryFn: async () => (await api.get("/me")).data,
    retry: false,
  });

  // Create group mutation
  const createGroupMutation = useMutation({
    mutationFn: async (groupData: { name: string; currency: string }) => {
      if (!me?.id) {
        throw new Error('User not authenticated');
      }
      return (await api.post("/groups", {
        name: groupData.name,
        currency: groupData.currency,
        ownerUserId: me.id,
      })).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["groups"] });
      Alert.alert("Success", "Group created successfully!");
    },
    onError: (error: any) => {
      console.error('Create group error:', error);
      Alert.alert("Error", error.response?.data?.message || "Failed to create group");
    }
  });

  const handleCreateGroup = () => {
    if (!me?.id) {
      Alert.alert("Error", "Please log in to create a group");
      return;
    }
    
    const groupName = prompt("Enter group name:");
    if (groupName && groupName.trim()) {
      createGroupMutation.mutate({
        name: groupName.trim(),
        currency: "USD"
      });
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Groups</Text>
        <TouchableOpacity style={styles.addButton} onPress={handleCreateGroup}>
          <Text style={styles.addButtonText}>+</Text>
        </TouchableOpacity>
      </View>
      
      <FlatList
        data={data ?? []}
        keyExtractor={(g) => g.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        renderItem={({ item }) => (
          <Link href={`/group/${item.id}`} asChild>
            <Pressable style={styles.groupCard}>
              <View style={styles.groupHeader}>
                <Text style={styles.groupName}>{item.name}</Text>
                <Text style={styles.groupCurrency}>{item.currency}</Text>
              </View>
              <Text style={styles.groupDate}>
                Created {new Date(item.createdAt).toLocaleDateString()}
              </Text>
              <View style={styles.groupFooter}>
                <Text style={styles.memberCount}>👥 {item.members?.length || 0} members</Text>
                <Text style={styles.balanceText}>$0.00</Text>
              </View>
            </Pressable>
          </Link>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>No groups yet</Text>
            <Text style={styles.emptySubtitle}>
              Create your first group to start splitting expenses with friends!
            </Text>
            <TouchableOpacity style={styles.createButton} onPress={handleCreateGroup}>
              <Text style={styles.createButtonText}>Create Group</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#32a852',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  listContent: {
    padding: 16,
  },
  groupCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  groupName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    flex: 1,
  },
  groupCurrency: {
    fontSize: 14,
    color: '#6b7280',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  groupDate: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 12,
  },
  groupFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  memberCount: {
    fontSize: 14,
    color: '#6b7280',
  },
  balanceText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#059669',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 24,
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
    marginBottom: 24,
  },
  createButton: {
    backgroundColor: '#32a852',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  createButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});