import { useQuery } from "@tanstack/react-query";
import { api } from "../../src/lib/api";
import { useLocalSearchParams, useRouter } from "expo-router";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from "react-native";

export default function ExpenseDetail() {
  const { id, groupId } = useLocalSearchParams();
  const router = useRouter();

  const { data: expense, isLoading } = useQuery({
    queryKey: ["expense", id, groupId],
    queryFn: async () => {
      if (!groupId) {
        throw new Error('Group ID is required');
      }
      
      console.log('Fetching expense:', { id, groupId });
      // Use the existing expenses list endpoint and find the specific expense
      const response = await api.get(`/groups/${groupId}/expenses?limit=100`);
      const expenses = response.data.items;
      const foundExpense = expenses.find((exp: any) => exp.id === id);
      
      if (!foundExpense) {
        throw new Error('Expense not found');
      }
      
      console.log('Expense found:', foundExpense);
      return foundExpense;
    },
    enabled: !!id && !!groupId,
  });

  const { data: group } = useQuery({
    queryKey: ["group", groupId],
    queryFn: async () => (await api.get(`/groups/${groupId}`)).data,
    enabled: !!groupId,
  });

  const { data: me } = useQuery({
    queryKey: ["me"],
    queryFn: async () => (await api.get("/me")).data,
  });

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading expense...</Text>
        </View>
      </View>
    );
  }

  if (!expense) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Expense not found</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Calculate totals and splits
  const totalAmount = (expense.amountCents / 100).toFixed(2);
  const splits = expense.splits || [];
  const paidByUser = group?.members?.find((m: any) => m.userId === expense.paidById)?.user;

  // Calculate who paid what and who owes what
  const splitDetails = splits.map((split: any) => {
    const user = group?.members?.find((m: any) => m.userId === split.userId)?.user;
    const splitAmount = (split.amountCents / 100).toFixed(2);
    const isCurrentUser = split.userId === me?.id;
    
    // The split amount represents what each person actually paid
    const actualPaidAmount = splitAmount;
    
    // For equal split, each person owes the same amount (total / number of people)
    const equalShare = (parseFloat(totalAmount) / splits.length).toFixed(2);
    const owesAmount = equalShare;
    
    return {
      ...split,
      user,
      actualPaidAmount,
      owesAmount,
      isCurrentUser,
    };
  });

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Expense Details</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content}>
        {/* Expense Summary */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <Text style={styles.expenseTitle}>{expense.note || 'No description'}</Text>
            <Text style={styles.expenseDate}>
              {new Date(expense.date).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
              })}
            </Text>
          </View>
          
          <View style={styles.amountSection}>
            <Text style={styles.totalAmount}>${totalAmount} {expense.currency}</Text>
            <Text style={styles.paidByText}>
              {splits.length > 1 
                ? `${splits.length} people paid` 
                : `Paid by ${paidByUser?.name || 'Unknown'}`
              }
            </Text>
          </View>
        </View>

        {/* Split Details */}
        <View style={styles.splitsCard}>
          <Text style={styles.sectionTitle}>Split Details</Text>
          
          {splitDetails.map((split: any) => (
            <View key={split.id} style={styles.splitRow}>
              <View style={styles.splitUser}>
                <View style={styles.userAvatar}>
                  <Text style={styles.userAvatarText}>
                    {(split.user?.name || 'U').charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.userInfo}>
                  <Text style={styles.userName}>
                    {split.user?.name || 'Unknown'}
                    {split.isCurrentUser && ' (You)'}
                  </Text>
                  <Text style={styles.userEmail}>{split.user?.email}</Text>
                </View>
              </View>
              
              <View style={styles.splitAmount}>
                <Text style={styles.amountText}>
                  Paid ${split.actualPaidAmount}
                </Text>
                <Text style={styles.owesText}>
                  Owes ${split.owesAmount}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Balance Summary */}
        <View style={styles.balanceCard}>
          <Text style={styles.sectionTitle}>Balance Summary</Text>
          
          {splitDetails.map((split: any) => {
            const paidAmount = parseFloat(split.actualPaidAmount);
            const owesAmount = parseFloat(split.owesAmount);
            const netAmount = paidAmount - owesAmount;
            const isCurrentUser = split.isCurrentUser;
            
            if (Math.abs(netAmount) < 0.01) return null; // Skip if no balance
            
            return (
              <View key={split.id} style={styles.balanceRow}>
                <Text style={styles.balanceText}>
                  {netAmount > 0 ? (
                    // Person overpaid (is owed money)
                    `${isCurrentUser ? 'You' : split.user?.name} is owed $${netAmount.toFixed(2)}`
                  ) : (
                    // Person underpaid (owes money)
                    `${isCurrentUser ? 'You' : split.user?.name} owes $${Math.abs(netAmount).toFixed(2)}`
                  )}
                </Text>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontSize: 16,
    color: '#059669',
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  placeholder: {
    width: 60, // Same width as back button to center the title
  },
  content: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#6b7280',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  errorText: {
    fontSize: 18,
    color: '#dc2626',
    marginBottom: 16,
  },
  summaryCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  expenseTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    flex: 1,
    marginRight: 16,
  },
  expenseDate: {
    fontSize: 14,
    color: '#6b7280',
  },
  amountSection: {
    alignItems: 'center',
  },
  totalAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  paidByText: {
    fontSize: 16,
    color: '#6b7280',
  },
  splitsCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16,
  },
  splitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  splitUser: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#059669',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  userAvatarText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  userEmail: {
    fontSize: 14,
    color: '#6b7280',
  },
  splitAmount: {
    alignItems: 'flex-end',
  },
  amountText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  owesText: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  payerLabel: {
    fontSize: 12,
    color: '#059669',
    fontWeight: '600',
    marginTop: 2,
  },
  balanceCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  balanceRow: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  balanceText: {
    fontSize: 16,
    color: '#374151',
  },
});
