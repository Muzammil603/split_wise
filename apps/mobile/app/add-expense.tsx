import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, ScrollView, Modal } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../src/lib/api";

type SplitMode = 'equal' | 'exact' | 'percentage' | 'shares' | 'adjustment' | 'reimbursement' | 'itemized';

export default function AddExpense() {
  const { groupId } = useLocalSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [selectedPayer, setSelectedPayer] = useState<string>("you");
  const [splitMode, setSplitMode] = useState<SplitMode>('equal');
  const [showPayerModal, setShowPayerModal] = useState(false);
  const [showSplitModal, setShowSplitModal] = useState(false);
  const [exactAmounts, setExactAmounts] = useState<{[key: string]: string}>({});
  const [percentages, setPercentages] = useState<{[key: string]: string}>({});
  const [shares, setShares] = useState<{[key: string]: string}>({});
  const [adjustments, setAdjustments] = useState<{[key: string]: string}>({});

  const { data: group } = useQuery({
    queryKey: ["group", groupId],
    queryFn: async () => (await api.get(`/groups/${groupId}`)).data,
    onSuccess: (data) => {
      // Initialize selectedMembers with all group members by default
      if (data?.members && selectedMembers.length === 0) {
        setSelectedMembers(data.members.map((m: any) => m.userId));
      }
    }
  });

  const { data: me } = useQuery({
    queryKey: ["me"],
    queryFn: async () => (await api.get("/me")).data,
  });

  const addExpenseMutation = useMutation({
    mutationFn: async (expenseData: any) => {
      return (await api.post(`/groups/${groupId}/expenses`, expenseData)).data;
    },
    onSuccess: () => {
      Alert.alert("Success", "Expense added successfully!");
      queryClient.invalidateQueries({ queryKey: ["expenses", groupId] });
      queryClient.invalidateQueries({ queryKey: ["group", groupId] });
      router.back();
    },
    onError: (error: any) => {
      Alert.alert("Error", error.response?.data?.message || "Failed to add expense");
    },
  });

  const handleSubmit = async () => {
    if (!amount || !description) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    if (selectedMembers.length === 0) {
      Alert.alert("Error", "Please select at least one member");
      return;
    }

    if (!selectedPayer) {
      Alert.alert("Error", "Please select who paid for this expense");
      return;
    }

    // For multiple people, create one expense with the first payer as the main payer
    // but with exact splits that reflect what each person actually paid
    if (selectedPayer === 'multiple') {
      const totalPaid = getTotalMultipleAmount();
      
      if (totalPaid !== parseFloat(amount)) {
        Alert.alert("Error", `Individual amounts ($${totalPaid.toFixed(2)}) must equal total amount ($${amount})`);
        return;
      }

      // Find the first person who paid a non-zero amount to be the main payer
      const firstPayer = selectedMembers.find(memberId => parseFloat(exactAmounts[memberId] || '0') > 0);
      
      if (!firstPayer) {
        Alert.alert("Error", "At least one person must pay a non-zero amount");
        return;
      }

      // Create one expense with the first payer as the main payer
      const expenseData = {
        paidById: firstPayer,
        totalCents: Math.round(parseFloat(amount) * 100),
        currency: group?.currency || "USD",
        mode: 'exact',
        note: description,
        beneficiaries: selectedMembers,
        splits: selectedMembers.map(memberId => ({
          userId: memberId,
          amountCents: Math.round(parseFloat(exactAmounts[memberId] || '0') * 100)
        }))
      };

      console.log('Multiple people expense data:', JSON.stringify(expenseData, null, 2));
      console.log('firstPayer:', firstPayer);
      console.log('selectedMembers:', selectedMembers);
      console.log('exactAmounts:', exactAmounts);

      addExpenseMutation.mutate(expenseData);
      return;
    }

    const expenseData = {
      paidById: selectedPayer === 'you' ? me?.id : selectedPayer,
      totalCents: Math.round(parseFloat(amount) * 100),
      currency: group?.currency || "USD",
      mode: splitMode,
      note: description,
      beneficiaries: selectedMembers,
      splits: getSplitsData()
    };

    addExpenseMutation.mutate(expenseData);
  };

  const getSplitsData = () => {
    switch (splitMode) {
      case 'exact':
        return Object.entries(exactAmounts).map(([userId, amount]) => ({
          userId,
          amountCents: Math.round(parseFloat(amount || '0') * 100)
        }));
      case 'percentage':
        return Object.entries(percentages).map(([userId, percentage]) => ({
          userId,
          amountCents: Math.round((parseFloat(percentage || '0') / 100) * parseFloat(amount) * 100)
        }));
      case 'shares':
        const totalShares = Object.values(shares).reduce((sum, share) => sum + parseFloat(share || '0'), 0);
        return Object.entries(shares).map(([userId, share]) => ({
          userId,
          amountCents: totalShares > 0 ? Math.round((parseFloat(share || '0') / totalShares) * parseFloat(amount) * 100) : 0
        }));
      case 'adjustment':
        const baseAmount = parseFloat(amount) / selectedMembers.length;
        return Object.entries(adjustments).map(([userId, adjustment]) => ({
          userId,
          amountCents: Math.round((baseAmount + parseFloat(adjustment || '0')) * 100)
        }));
      default:
        return selectedMembers.map(userId => ({
          userId,
          amountCents: Math.round((parseFloat(amount) / selectedMembers.length) * 100)
        }));
    }
  };

  const toggleMember = (memberId: string) => {
    setSelectedMembers(prev => 
      prev.includes(memberId) 
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId]
    );
  };

  const getPerPersonAmount = () => {
    if (selectedMembers.length === 0) return 0;
    return parseFloat(amount || '0') / selectedMembers.length;
  };

  const getTotalPercentage = () => {
    return Object.values(percentages).reduce((sum, pct) => sum + parseFloat(pct || '0'), 0);
  };

  const getTotalExactAmount = () => {
    return Object.values(exactAmounts).reduce((sum, amt) => sum + parseFloat(amt || '0'), 0);
  };

  const getTotalMultipleAmount = () => {
    return Object.values(exactAmounts).reduce((sum, amt) => sum + parseFloat(amt || '0'), 0);
  };

  const getRemainingAmount = () => {
    const totalAmount = parseFloat(amount || '0');
    const multipleTotal = getTotalMultipleAmount();
    return totalAmount - multipleTotal;
  };

  if (!group) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Group not found or loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
          <Text style={styles.closeButtonText}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add an expense</Text>
      </View>

      <ScrollView style={styles.content}>
        {/* Participants */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>With you and:</Text>
          <View style={styles.participantsContainer}>
            {selectedMembers.length === 0 ? (
              <View style={styles.participantTag}>
                <Text style={styles.participantTagText}>S All of {group.name}</Text>
                <TouchableOpacity style={styles.participantTagClose}>
                  <Text style={styles.participantTagCloseText}>✕</Text>
                </TouchableOpacity>
              </View>
            ) : (
              selectedMembers.map((memberId) => {
                const member = group.members?.find((m: any) => m.userId === memberId);
                return (
                  <View key={memberId} style={styles.participantTag}>
                    <Text style={styles.participantTagText}>
                      {(member?.user?.name || memberId).charAt(0).toUpperCase()} {member?.user?.name || memberId}
                    </Text>
                    <TouchableOpacity 
                      style={styles.participantTagClose}
                      onPress={() => toggleMember(memberId)}
                    >
                      <Text style={styles.participantTagCloseText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                );
              })
            )}
          </View>
          {selectedMembers.length === 0 && (
            <TouchableOpacity 
              style={styles.addMembersButton}
              onPress={() => {
                // Select all members by default
                const allMemberIds = group.members?.map((m: any) => m.userId) || [];
                setSelectedMembers(allMemberIds);
              }}
            >
              <Text style={styles.addMembersButtonText}>+ Add members</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Description */}
        <View style={styles.section}>
          <View style={styles.descriptionContainer}>
            <Text style={styles.descriptionIcon}>🧾</Text>
            <TextInput
              style={styles.descriptionInput}
              value={description}
              onChangeText={setDescription}
              placeholder="Enter a description"
              placeholderTextColor="#9ca3af"
            />
          </View>
        </View>

        {/* Amount */}
        <View style={styles.section}>
          <View style={styles.amountContainer}>
            <Text style={styles.dollarSign}>$</Text>
            <TextInput
              style={styles.amountInput}
              value={amount}
              onChangeText={setAmount}
              placeholder="0.00"
              keyboardType="numeric"
              autoFocus={false}
              placeholderTextColor="#9ca3af"
            />
          </View>
        </View>

        {/* Payer and Split */}
        <View style={styles.section}>
          <View style={styles.payerSplitContainer}>
            <TouchableOpacity 
              style={styles.payerSplitRow}
              onPress={() => setShowPayerModal(true)}
            >
              <Text style={styles.payerSplitText}>
                Paid by <Text style={styles.highlightText}>
                  {(() => {
                    console.log('selectedPayer:', selectedPayer);
                    if (selectedPayer === 'you') return 'you';
                    if (selectedPayer === 'multiple') return 'multiple people';
                    if (selectedPayer) return group.members?.find((m: any) => m.userId === selectedPayer)?.user?.name || 'Unknown';
                    return 'you';
                  })()}
                </Text>
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.payerSplitRow}
              onPress={() => setShowSplitModal(true)}
            >
              <Text style={styles.payerSplitText}>
                and split <Text style={styles.highlightText}>
                  {splitMode === 'equal' ? 'equally' : 
                   splitMode === 'exact' ? 'by exact amounts' :
                   splitMode === 'percentage' ? 'by percentage' :
                   splitMode === 'shares' ? 'by shares' :
                   splitMode === 'adjustment' ? 'by adjustment' :
                   splitMode === 'reimbursement' ? 'as reimbursement' :
                   'by itemized'}
                </Text>
              </Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.perPersonText}>
            (${getPerPersonAmount().toFixed(2)}/person)
          </Text>
        </View>

        {/* Date and Add Image */}
        <View style={styles.section}>
          <View style={styles.dateImageContainer}>
            <TouchableOpacity style={styles.dateButton}>
              <Text style={styles.dateButtonText}>October 10, 2025</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.addImageButton}>
              <Text style={styles.addImageButtonText}>Add image/notes</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Group */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.groupButton}>
            <Text style={styles.groupButtonText}>{group.name}</Text>
          </TouchableOpacity>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.cancelButton}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.saveButton, (!amount || !description || selectedMembers.length === 0 || !selectedPayer) && styles.saveButtonDisabled]}
            onPress={handleSubmit}
            disabled={!amount || !description || selectedMembers.length === 0 || !selectedPayer || addExpenseMutation.isPending}
          >
            <Text style={styles.saveButtonText}>
              {addExpenseMutation.isPending ? "Adding..." : "Save"}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Payer Selection Modal */}
      <Modal visible={showPayerModal} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Choose payer</Text>
            <TouchableOpacity onPress={() => setShowPayerModal(false)}>
              <Text style={styles.modalCloseText}>✕</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalContent}>
            {/* You Option */}
            <TouchableOpacity
              style={[
                styles.payerOption,
                selectedPayer === 'you' && styles.payerOptionSelected
              ]}
              onPress={() => {
                setSelectedPayer('you');
                setShowPayerModal(false);
              }}
            >
              <View style={styles.payerAvatar}>
                <Text style={styles.payerAvatarText}>
                  {me?.name?.charAt(0).toUpperCase() || 'Y'}
                </Text>
              </View>
              <Text style={styles.payerName}>You</Text>
            </TouchableOpacity>

            {/* Individual Payers */}
            {group.members?.map((member: any) => (
              <TouchableOpacity
                key={member.userId}
                style={[
                  styles.payerOption,
                  selectedPayer === member.userId && styles.payerOptionSelected
                ]}
                onPress={() => {
                  setSelectedPayer(member.userId);
                  setShowPayerModal(false);
                }}
              >
                <View style={styles.payerAvatar}>
                  <Text style={styles.payerAvatarText}>
                    {(member.user?.name || member.userId).charAt(0).toUpperCase()}
                  </Text>
                </View>
                <Text style={styles.payerName}>{member.user?.name || member.userId}</Text>
              </TouchableOpacity>
            ))}
            
            {/* Multiple People Option */}
            <View style={styles.separator} />
            <Text style={styles.sectionTitle}>Multiple people</Text>
            
            {/* Checkbox for "Each person paid for their own share" */}
            <TouchableOpacity 
              style={styles.multiplePeopleCheckbox}
              onPress={() => {
                if (selectedPayer === 'multiple') {
                  setSelectedPayer('');
                } else {
                  setSelectedPayer('multiple');
                }
              }}
            >
              <View style={styles.checkboxContainer}>
                <View style={[styles.checkbox, selectedPayer === 'multiple' && styles.checkboxSelected]}>
                  {selectedPayer === 'multiple' && <Text style={styles.checkboxText}>✓</Text>}
                </View>
                <Text style={styles.checkboxLabel}>Each person paid for their own share</Text>
              </View>
            </TouchableOpacity>

            {/* Individual amount inputs for each person */}
            {selectedPayer === 'multiple' && (
              <View style={styles.multiplePeopleInputs}>
                {group.members?.map((member: any) => (
                  <View key={member.userId} style={styles.multiplePersonRow}>
                    <Text style={styles.multiplePersonName}>{member.user?.name || member.userId}</Text>
                    <View style={styles.multiplePersonInputContainer}>
                      <Text style={styles.dollarSign}>$</Text>
                      <TextInput
                        style={styles.multiplePersonInput}
                        placeholder="0.00"
                        keyboardType="numeric"
                        value={exactAmounts[member.userId] || ''}
                        onChangeText={(text) => setExactAmounts(prev => ({...prev, [member.userId]: text}))}
                      />
                    </View>
                  </View>
                ))}
                
                {/* Total and Remaining Amount Display */}
                <View style={styles.multiplePeopleTotal}>
                  <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>TOTAL</Text>
                    <Text style={styles.totalAmount}>${getTotalMultipleAmount().toFixed(2)}</Text>
                  </View>
                  <Text style={[
                    styles.remainingText,
                    getRemainingAmount() === 0 ? styles.remainingTextValid : styles.remainingTextInvalid
                  ]}>
                    {getRemainingAmount() === 0 
                      ? '✓ Amounts match total' 
                      : `${getRemainingAmount() > 0 ? 'Need' : 'Over by'} $${Math.abs(getRemainingAmount()).toFixed(2)}`
                    }
                  </Text>
                </View>
              </View>
            )}

            {/* Done Button */}
            <TouchableOpacity 
              style={[
                styles.doneButton,
                selectedPayer === 'multiple' && getRemainingAmount() !== 0 && styles.doneButtonDisabled
              ]}
              onPress={() => {
                if (selectedPayer === 'multiple' && getRemainingAmount() !== 0) {
                  Alert.alert(
                    "Amount Mismatch", 
                    `Individual amounts ($${getTotalMultipleAmount().toFixed(2)}) must equal total amount ($${amount}). ${getRemainingAmount() > 0 ? 'Need' : 'Over by'} $${Math.abs(getRemainingAmount()).toFixed(2)}.`
                  );
                  return;
                }
                setShowPayerModal(false);
              }}
            >
              <Text style={[
                styles.doneButtonText,
                selectedPayer === 'multiple' && getRemainingAmount() !== 0 && styles.doneButtonTextDisabled
              ]}>
                Done
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* Split Options Modal */}
      <Modal visible={showSplitModal} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Choose split options</Text>
            <TouchableOpacity onPress={() => setShowSplitModal(false)}>
              <Text style={styles.modalCloseText}>✕</Text>
            </TouchableOpacity>
          </View>
          
          {/* Split Mode Buttons */}
          <View style={styles.splitModeButtons}>
            <TouchableOpacity 
              style={[styles.splitModeButton, splitMode === 'equal' && styles.splitModeButtonActive]}
              onPress={() => setSplitMode('equal')}
            >
              <Text style={styles.splitModeButtonText}>=</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.splitModeButton, splitMode === 'exact' && styles.splitModeButtonActive]}
              onPress={() => setSplitMode('exact')}
            >
              <Text style={styles.splitModeButtonText}>1.23</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.splitModeButton, splitMode === 'percentage' && styles.splitModeButtonActive]}
              onPress={() => setSplitMode('percentage')}
            >
              <Text style={styles.splitModeButtonText}>%</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.splitModeButton, splitMode === 'shares' && styles.splitModeButtonActive]}
              onPress={() => setSplitMode('shares')}
            >
              <Text style={styles.splitModeButtonText}>☰</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.splitModeButton, splitMode === 'adjustment' && styles.splitModeButtonActive]}
              onPress={() => setSplitMode('adjustment')}
            >
              <Text style={styles.splitModeButtonText}>+/-</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.splitModeButton, splitMode === 'reimbursement' && styles.splitModeButtonActive]}
              onPress={() => setSplitMode('reimbursement')}
            >
              <Text style={styles.splitModeButtonText}>1</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.splitModeButton, splitMode === 'itemized' && styles.splitModeButtonActive]}
              onPress={() => setSplitMode('itemized')}
            >
              <Text style={styles.splitModeButtonText}>≡</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {splitMode === 'equal' && (
              <View>
                <Text style={styles.splitSectionTitle}>Split equally</Text>
                {selectedMembers.length > 0 ? (
                  selectedMembers.map((memberId) => {
                    const member = group?.members?.find((m: any) => m.userId === memberId);
                    return (
                      <View key={memberId} style={styles.splitMemberRow}>
                        <View style={styles.splitMemberAvatar}>
                          <Text style={styles.splitMemberAvatarText}>
                            {(member?.user?.name || memberId).charAt(0).toUpperCase()}
                          </Text>
                        </View>
                        <Text style={styles.splitMemberName}>{member?.user?.name || memberId}</Text>
                        <Text style={styles.splitMemberAmount}>${getPerPersonAmount().toFixed(2)}</Text>
                      </View>
                    );
                  })
                ) : (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyStateText}>No members selected</Text>
                    <Text style={styles.emptyStateSubtext}>Go back and select participants first</Text>
                  </View>
                )}
              </View>
            )}

            {splitMode === 'exact' && (
              <View>
                <Text style={styles.splitSectionTitle}>Split by exact amounts</Text>
                {selectedMembers.map((memberId) => {
                  const member = group.members?.find((m: any) => m.userId === memberId);
                  return (
                    <View key={memberId} style={styles.splitMemberRow}>
                      <View style={styles.splitMemberAvatar}>
                        <Text style={styles.splitMemberAvatarText}>
                          {(member?.user?.name || memberId).charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <Text style={styles.splitMemberName}>{member?.user?.name || memberId}</Text>
                      <TextInput
                        style={styles.exactAmountInput}
                        value={exactAmounts[memberId] || ''}
                        onChangeText={(text) => setExactAmounts(prev => ({...prev, [memberId]: text}))}
                        placeholder="0.00"
                        keyboardType="numeric"
                      />
                    </View>
                  );
                })}
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>TOTAL</Text>
                  <Text style={styles.totalAmount}>${getTotalExactAmount().toFixed(2)}</Text>
                </View>
                <Text style={styles.remainingText}>
                  ${(parseFloat(amount || '0') - getTotalExactAmount()).toFixed(2)} left
                </Text>
              </View>
            )}

            {splitMode === 'percentage' && (
              <View>
                <Text style={styles.splitSectionTitle}>Split by percentages</Text>
                {selectedMembers.map((memberId) => {
                  const member = group.members?.find((m: any) => m.userId === memberId);
                  return (
                    <View key={memberId} style={styles.splitMemberRow}>
                      <View style={styles.splitMemberAvatar}>
                        <Text style={styles.splitMemberAvatarText}>
                          {(member?.user?.name || memberId).charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <Text style={styles.splitMemberName}>{member?.user?.name || memberId}</Text>
                      <TextInput
                        style={styles.percentageInput}
                        value={percentages[memberId] || ''}
                        onChangeText={(text) => setPercentages(prev => ({...prev, [memberId]: text}))}
                        placeholder="0"
                        keyboardType="numeric"
                      />
                      <Text style={styles.percentageSymbol}>%</Text>
                    </View>
                  );
                })}
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>TOTAL</Text>
                  <Text style={styles.totalAmount}>{getTotalPercentage().toFixed(2)}%</Text>
                </View>
                <Text style={styles.remainingText}>
                  {100 - getTotalPercentage().toFixed(2)}% left
                </Text>
              </View>
            )}

            {splitMode === 'shares' && (
              <View>
                <Text style={styles.splitSectionTitle}>Split by shares</Text>
                {selectedMembers.map((memberId) => {
                  const member = group.members?.find((m: any) => m.userId === memberId);
                  const totalShares = Object.values(shares).reduce((sum, share) => sum + parseFloat(share || '0'), 0);
                  const memberShare = parseFloat(shares[memberId] || '1');
                  const shareAmount = totalShares > 0 ? (memberShare / totalShares) * parseFloat(amount || '0') : 0;
                  
                  return (
                    <View key={memberId} style={styles.splitMemberRow}>
                      <View style={styles.splitMemberAvatar}>
                        <Text style={styles.splitMemberAvatarText}>
                          {(member?.user?.name || memberId).charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <View style={styles.shareInfo}>
                        <Text style={styles.splitMemberName}>{member?.user?.name || memberId}</Text>
                        <Text style={styles.shareAmount}>Total share: ${shareAmount.toFixed(2)}</Text>
                      </View>
                      <View style={styles.shareInputContainer}>
                        <TextInput
                          style={styles.shareInput}
                          value={shares[memberId] || '1'}
                          onChangeText={(text) => setShares(prev => ({...prev, [memberId]: text}))}
                          placeholder="1"
                          keyboardType="numeric"
                        />
                        <Text style={styles.shareLabel}>share(s)</Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}

            {splitMode === 'adjustment' && (
              <View>
                <Text style={styles.splitSectionTitle}>Split by adjustment</Text>
                {selectedMembers.map((memberId) => {
                  const member = group.members?.find((m: any) => m.userId === memberId);
                  const baseAmount = parseFloat(amount || '0') / selectedMembers.length;
                  const adjustment = parseFloat(adjustments[memberId] || '0');
                  const totalAmount = baseAmount + adjustment;
                  
                  return (
                    <View key={memberId} style={styles.splitMemberRow}>
                      <View style={styles.splitMemberAvatar}>
                        <Text style={styles.splitMemberAvatarText}>
                          {(member?.user?.name || memberId).charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <View style={styles.adjustmentInfo}>
                        <Text style={styles.splitMemberName}>{member?.user?.name || memberId}</Text>
                        <Text style={styles.adjustmentAmount}>Total share: ${totalAmount.toFixed(2)}</Text>
                      </View>
                      <TextInput
                        style={styles.adjustmentInput}
                        value={adjustments[memberId] || ''}
                        onChangeText={(text) => setAdjustments(prev => ({...prev, [memberId]: text}))}
                        placeholder="0.00"
                        keyboardType="numeric"
                      />
                    </View>
                  );
                })}
              </View>
            )}

            {splitMode === 'reimbursement' && (
              <View>
                <Text style={styles.splitSectionTitle}>Reimbursement</Text>
                <Text style={styles.reimbursementSubtitle}>Each person gets back:</Text>
                {selectedMembers.map((memberId) => {
                  const member = group.members?.find((m: any) => m.userId === memberId);
                  return (
                    <View key={memberId} style={styles.splitMemberRow}>
                      <View style={styles.checkbox}>
                        <Text style={styles.checkboxText}>✓</Text>
                      </View>
                      <View style={styles.splitMemberAvatar}>
                        <Text style={styles.splitMemberAvatarText}>
                          {(member?.user?.name || memberId).charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <Text style={styles.splitMemberName}>{member?.user?.name || memberId}</Text>
                      <Text style={styles.splitMemberAmount}>$0.00</Text>
                    </View>
                  );
                })}
              </View>
            )}
          </ScrollView>

          <TouchableOpacity 
            style={styles.doneButton}
            onPress={() => setShowSplitModal(false)}
          >
            <Text style={styles.doneButtonText}>Done</Text>
          </TouchableOpacity>
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
    backgroundColor: '#32a852',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  closeButton: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
    marginRight: 30,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 16,
    color: '#374151',
    marginBottom: 8,
  },
  participantsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  participantTag: {
    backgroundColor: '#e5e7eb',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  participantTagText: {
    fontSize: 14,
    color: '#374151',
    marginRight: 8,
  },
  participantTagClose: {
    marginLeft: 4,
  },
  participantTagCloseText: {
    fontSize: 12,
    color: '#6b7280',
  },
  addMembersButton: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#32a852',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  addMembersButtonText: {
    fontSize: 14,
    color: '#32a852',
    fontWeight: '600',
  },
  descriptionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderStyle: 'dashed',
  },
  descriptionIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  descriptionInput: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 10,
  },
  amountInput: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#1f2937',
    textAlign: 'center',
    flex: 1,
    minWidth: 200,
  },
  payerSplitContainer: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  payerSplitRow: {
    marginBottom: 8,
  },
  payerSplitText: {
    fontSize: 16,
    color: '#374151',
  },
  highlightText: {
    backgroundColor: '#f0fdf4',
    color: '#32a852',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#32a852',
    borderStyle: 'dashed',
  },
  perPersonText: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 8,
  },
  dateImageContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  dateButton: {
    flex: 1,
    backgroundColor: '#e5e7eb',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  dateButtonText: {
    fontSize: 14,
    color: '#6b7280',
  },
  addImageButton: {
    flex: 1,
    backgroundColor: '#e5e7eb',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  addImageButtonText: {
    fontSize: 14,
    color: '#6b7280',
  },
  groupButton: {
    backgroundColor: '#e5e7eb',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  groupButtonText: {
    fontSize: 14,
    color: '#6b7280',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 30,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#32a852',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  saveButtonText: {
    fontSize: 16,
    color: 'white',
    fontWeight: '600',
  },
  errorText: {
    fontSize: 16,
    color: '#dc2626',
    textAlign: 'center',
    padding: 20,
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  modalHeader: {
    backgroundColor: '#32a852',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
    marginRight: 30,
  },
  modalCloseText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  payerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: 'white',
    borderRadius: 8,
    marginBottom: 8,
  },
  payerOptionSelected: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#32a852',
  },
  payerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#32a852',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  payerAvatarText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  payerName: {
    fontSize: 16,
    color: '#374151',
    fontWeight: '500',
  },
  separator: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginVertical: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 12,
  },
  multiplePeopleCheckbox: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#d1d5db',
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#32a852',
    borderColor: '#32a852',
  },
  checkboxText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  checkboxLabel: {
    fontSize: 16,
    color: '#374151',
    flex: 1,
  },
  multiplePeopleInputs: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  multiplePersonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  multiplePersonName: {
    fontSize: 16,
    color: '#374151',
    fontWeight: '500',
  },
  multiplePersonInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    minWidth: 120,
  },
  dollarSign: {
    fontSize: 16,
    color: '#6b7280',
    marginRight: 4,
  },
  multiplePersonInput: {
    flex: 1,
    fontSize: 16,
    color: '#374151',
    textAlign: 'right',
  },
  multiplePeopleToggle: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#32a852',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  multiplePeopleToggleSelected: {
    backgroundColor: '#32a852',
  },
  multiplePeopleToggleText: {
    fontSize: 16,
    color: '#32a852',
    fontWeight: '600',
  },
  emptyState: {
    padding: 20,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#9ca3af',
  },
  doneButton: {
    backgroundColor: '#32a852',
    borderRadius: 8,
    paddingVertical: 15,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginTop: 20,
    marginHorizontal: 20,
  },
  doneButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  doneButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  doneButtonTextDisabled: {
    color: '#6b7280',
  },
  multiplePeopleTotal: {
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  totalAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  remainingText: {
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '500',
  },
  remainingTextValid: {
    color: '#059669', // Green
  },
  remainingTextInvalid: {
    color: '#dc2626', // Red
  },
  // Split mode buttons
  splitModeButtons: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  splitModeButton: {
    flex: 1,
    backgroundColor: '#e5e7eb',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginHorizontal: 2,
  },
  splitModeButtonActive: {
    backgroundColor: '#32a852',
  },
  splitModeButtonText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '600',
  },
  // Split content
  splitSectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 16,
  },
  splitMemberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: 'white',
    borderRadius: 8,
    marginBottom: 8,
  },
  splitMemberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#32a852',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  splitMemberAvatarText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  splitMemberName: {
    flex: 1,
    fontSize: 16,
    color: '#374151',
    fontWeight: '500',
  },
  splitMemberAmount: {
    fontSize: 16,
    color: '#374151',
    fontWeight: '600',
  },
  exactAmountInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 16,
    color: '#374151',
    width: 80,
    textAlign: 'right',
  },
  percentageInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 16,
    color: '#374151',
    width: 60,
    textAlign: 'right',
  },
  percentageSymbol: {
    fontSize: 16,
    color: '#374151',
    marginLeft: 4,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    marginTop: 8,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#374151',
  },
  totalAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#374151',
  },
  remainingText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'right',
    marginTop: 4,
  },
  shareInfo: {
    flex: 1,
  },
  shareAmount: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  shareInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  shareInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 16,
    color: '#374151',
    width: 50,
    textAlign: 'center',
  },
  shareLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginLeft: 4,
  },
  adjustmentInfo: {
    flex: 1,
  },
  adjustmentAmount: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  adjustmentInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 16,
    color: '#374151',
    width: 80,
    textAlign: 'right',
  },
  reimbursementSubtitle: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 16,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    backgroundColor: '#32a852',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  checkboxText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  doneButton: {
    backgroundColor: '#32a852',
    margin: 20,
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
  },
  doneButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});