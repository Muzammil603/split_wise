import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../src/lib/api";
import { useLocalSearchParams, useRouter } from "expo-router";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, TextInput, Modal } from "react-native";
import { useState } from "react";

export default function SettleUp() {
  const { groupId } = useLocalSearchParams();
  const router = useRouter();
  const [showSettleModal, setShowSettleModal] = useState(false);
  const [selectedSettlement, setSelectedSettlement] = useState<any>(null);

  const { data: balances, isLoading: balancesLoading } = useQuery({
    queryKey: ["balances", groupId],
    queryFn: async () => {
      const response = await api.get(`/groups/${groupId}/balances`);
      console.log('🔍 Balances API Response:', response.data);
      console.log('🔍 First balance item:', response.data[0]);
      return response.data;
    },
    enabled: !!groupId,
  });

  const { data: suggestions, isLoading: suggestionsLoading } = useQuery({
    queryKey: ["settlement-suggestions", groupId],
    queryFn: async () => (await api.get(`/groups/${groupId}/settlements/suggest`)).data,
    enabled: !!groupId,
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

  if (balancesLoading || suggestionsLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading settle up data...</Text>
      </View>
    );
  }

  const handleSettleUp = (suggestion: any) => {
    setSelectedSettlement(suggestion);
    setShowSettleModal(true);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settle Up</Text>
        <View style={styles.headerActions} />
      </View>

      <ScrollView style={styles.content}>
        {/* Current Balances */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Current Balances</Text>
          {balances && balances.length > 0 ? (
            <>
              {balances.map((balance: any) => {
                // Use user data from balance response (now included by backend)
                const user = balance.user;
                
                console.log('🔍 Balance item:', {
                  balance,
                  user,
                  hasUser: !!user,
                  userName: user?.name,
                  userEmail: user?.email
                });
                
                const isCurrentUser = balance.userId === me?.id;
                const amount = (balance.balanceCents / 100).toFixed(2);
                const isOwed = balance.balanceCents > 0;
                const owes = balance.balanceCents < 0;

                return (
                  <View key={balance.userId} style={styles.balanceCard}>
                    <View style={styles.balanceUser}>
                      <View style={styles.userAvatar}>
                        <Text style={styles.userAvatarText}>
                          {(user?.name || 'U').charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <View style={styles.userInfo}>
                        <Text style={styles.userName}>
                          {user?.name || 'Unknown'}
                          {isCurrentUser && ' (You)'}
                        </Text>
                        <Text style={styles.userEmail}>{user?.email}</Text>
                      </View>
                    </View>
                    <View style={styles.balanceAmount}>
                      {isOwed ? (
                        <Text style={styles.owedAmount}>owes ${amount}</Text>
                      ) : owes ? (
                        <Text style={styles.owesAmount}>owes ${Math.abs(parseFloat(amount)).toFixed(2)}</Text>
                      ) : (
                        <Text style={styles.evenAmount}>settled up</Text>
                      )}
                    </View>
                  </View>
                );
              })}
            </>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No balances to display</Text>
            </View>
          )}
        </View>

        {/* Suggested Settlements */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Suggested Settlements</Text>
          <Text style={styles.sectionSubtitle}>Tap to record a settlement</Text>
          
          {suggestions && suggestions.length > 0 ? (
            <>
              {suggestions.map((suggestion: any, index: number) => {
                const payer = group?.members?.find((m: any) => m.userId === suggestion.fromUserId)?.user;
                const payee = group?.members?.find((m: any) => m.userId === suggestion.toUserId)?.user;
                const amount = (suggestion.amountCents / 100).toFixed(2);

                return (
                  <TouchableOpacity
                    key={index}
                    style={styles.suggestionCard}
                    onPress={() => handleSettleUp(suggestion)}
                  >
                    <Text style={styles.suggestionText}>
                      {payer?.name || 'Unknown'} pays {payee?.name || 'Unknown'}
                    </Text>
                    <Text style={styles.suggestionAmount}>${amount}</Text>
                  </TouchableOpacity>
                );
              })}
            </>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No settlement suggestions</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Settle Up Modal */}
      {showSettleModal && selectedSettlement && (
        <SettleUpModal
          settlement={selectedSettlement}
          group={group}
          me={me}
          groupId={groupId}
          onClose={() => {
            setShowSettleModal(false);
            setSelectedSettlement(null);
          }}
        />
      )}
    </View>
  );
}

// Settle Up Modal Component
function SettleUpModal({ settlement, group, me, groupId, onClose }: any) {
  const queryClient = useQueryClient(); // Get queryClient instance
  const [selectedPayer, setSelectedPayer] = useState(settlement.fromUserId);
  const [selectedPayee, setSelectedPayee] = useState(settlement.toUserId);
  const [amount, setAmount] = useState((settlement.amountCents / 100).toFixed(2));
  const [date, setDate] = useState(new Date());
  const [notes, setNotes] = useState('');
  const [showPayerModal, setShowPayerModal] = useState(false);
  const [showPayeeModal, setShowPayeeModal] = useState(false);
  const [showDateModal, setShowDateModal] = useState(false);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const payer = group?.members?.find((m: any) => m.userId === selectedPayer)?.user;
  const payee = group?.members?.find((m: any) => m.userId === selectedPayee)?.user;

  const handleSave = async () => {
    if (isSaving) return; // Prevent double submission
    
    setIsSaving(true);
    try {
      // Convert amount to cents
      const amountCents = Math.round(parseFloat(amount) * 100);
      
      // Prepare settlement data
      const settlementData = {
        fromUserId: selectedPayer,
        toUserId: selectedPayee,
        amountCents: amountCents,
        currency: 'USD',
        date: date.toISOString(),
        note: notes,
        method: 'manual'
      };

      console.log('Recording settlement:', settlementData);

      // Call the backend API
      const response = await api.post(`/groups/${groupId}/settlements`, settlementData);
      
      console.log('Settlement recorded successfully:', response.data);
      
      // Invalidate queries to refetch balances and suggestions
      await queryClient.invalidateQueries({ queryKey: ["balances", groupId] });
      await queryClient.invalidateQueries({ queryKey: ["settlement-suggestions", groupId] });
      
      Alert.alert("Settlement Recorded", "Payment has been recorded successfully!");
      onClose();
    } catch (error) {
      console.error('Failed to record settlement:', error);
      Alert.alert("Error", "Failed to record settlement. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={styles.modalOverlay}>
      <View style={styles.modalContent}>
        {/* Header */}
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Settle up</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* User Transaction Visual */}
        <View style={styles.transactionVisual}>
          <TouchableOpacity 
            style={styles.userContainer}
            onPress={() => setShowPayerModal(true)}
          >
            <View style={styles.userAvatar}>
              <Text style={styles.userAvatarText}>
                {(payer?.name || 'U').charAt(0).toUpperCase()}
              </Text>
            </View>
            <Text style={styles.userLabel}>{payer?.id === me?.id ? 'You' : payer?.name || 'Unknown'}</Text>
          </TouchableOpacity>
          
          <View style={styles.arrowContainer}>
            <Text style={styles.arrow}>→</Text>
          </View>
          
          <TouchableOpacity 
            style={styles.userContainer}
            onPress={() => setShowPayeeModal(true)}
          >
            <View style={styles.userAvatar}>
              <Text style={styles.userAvatarText}>
                {(payee?.name || 'U').charAt(0).toUpperCase()}
              </Text>
            </View>
            <Text style={styles.userLabel}>{payee?.name || 'Unknown'}</Text>
          </TouchableOpacity>
        </View>

        {/* Payment Summary */}
        <View style={styles.paymentSummary}>
          <Text style={styles.paymentText}>
            <Text style={styles.payerBubble}>{payer?.id === me?.id ? 'You' : payer?.name || 'Unknown'}</Text> paid <Text style={styles.payeeBubble}>{payee?.name || 'Unknown'}</Text>
          </Text>
          <TextInput
            style={styles.paymentAmountInput}
            value={amount}
            onChangeText={setAmount}
            keyboardType="numeric"
            placeholder="0.00"
          />
        </View>

        {/* Action Fields */}
        <View style={styles.actionFields}>
          <TouchableOpacity 
            style={styles.actionField}
            onPress={() => setShowDateModal(true)}
          >
            <Text style={styles.actionFieldText}>
              {date.toLocaleDateString('en-US', { 
                month: 'long', 
                day: 'numeric', 
                year: 'numeric' 
              })}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionField}
            onPress={() => setShowNotesModal(true)}
          >
            <Text style={styles.actionFieldText}>Add image/notes</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionField}>
            <Text style={styles.actionFieldText}>{group?.name || 'Group'}</Text>
          </TouchableOpacity>
        </View>

        {/* Footer Buttons */}
        <View style={styles.modalFooter}>
          <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.saveButton, isSaving && styles.saveButtonDisabled]} 
          onPress={handleSave}
          disabled={isSaving}
        >
          <Text style={styles.saveButtonText}>
            {isSaving ? 'Saving...' : 'Save'}
          </Text>
        </TouchableOpacity>
        </View>
      </View>

      {/* Date Picker Modal */}
      {showDateModal && (
        <DatePickerModal
          selectedDate={date}
          onDateChange={setDate}
          onClose={() => setShowDateModal(false)}
        />
      )}

      {/* Notes Modal */}
      {showNotesModal && (
        <NotesModal
          notes={notes}
          onNotesChange={setNotes}
          onClose={() => setShowNotesModal(false)}
        />
      )}

      {/* Payer Selection Modal */}
      {showPayerModal && (
        <PayerSelectionModal
          group={group}
          me={me}
          selectedPayer={selectedPayer}
          onPayerSelect={setSelectedPayer}
          onClose={() => setShowPayerModal(false)}
        />
      )}

      {/* Payee Selection Modal */}
      {showPayeeModal && (
        <PayeeSelectionModal
          group={group}
          me={me}
          selectedPayee={selectedPayee}
          onPayeeSelect={setSelectedPayee}
          onClose={() => setShowPayeeModal(false)}
        />
      )}
    </View>
  );
}

// Date Picker Modal Component
function DatePickerModal({ selectedDate, onDateChange, onClose }: any) {
  const [currentDate, setCurrentDate] = useState(selectedDate);

  const handleDateSelect = (day: number) => {
    const newDate = new Date(currentDate);
    newDate.setDate(day);
    onDateChange(newDate);
    onClose();
  };

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (direction === 'prev') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setCurrentDate(newDate);
  };

  const daysInMonth = getDaysInMonth(currentDate);
  const firstDay = getFirstDayOfMonth(currentDate);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const prevMonthDays = Array.from({ length: firstDay }, (_, i) => 31 - firstDay + i + 1);

  return (
    <View style={styles.modalOverlay}>
      <View style={styles.dateModalContent}>
        <View style={styles.dateModalHeader}>
          <Text style={styles.dateModalTitle}>Choose date</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.monthNavigation}>
          <TouchableOpacity onPress={() => navigateMonth('prev')}>
            <Text style={styles.navButton}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.monthYear}>
            {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </Text>
          <TouchableOpacity onPress={() => navigateMonth('next')}>
            <Text style={styles.navButton}>›</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.calendarGrid}>
          <View style={styles.daysHeader}>
            <>
              {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
                <Text key={day} style={styles.dayHeader}>{day}</Text>
              ))}
            </>
          </View>
          
          <View style={styles.daysGrid}>
            <>
              {prevMonthDays.map(day => (
                <Text key={day} style={styles.prevMonthDay}>{day}</Text>
              ))}
              {days.map(day => (
                <TouchableOpacity
                  key={day}
                  style={[
                    styles.dayButton,
                    day === selectedDate.getDate() && styles.selectedDay
                  ]}
                  onPress={() => handleDateSelect(day)}
                >
                  <Text style={[
                    styles.dayText,
                    day === selectedDate.getDate() && styles.selectedDayText
                  ]}>
                    {day}
                  </Text>
                </TouchableOpacity>
              ))}
            </>
          </View>
        </View>
      </View>
    </View>
  );
}

// Notes Modal Component
function NotesModal({ notes, onNotesChange, onClose }: any) {
  const [memo, setMemo] = useState('');
  const [attachedFile, setAttachedFile] = useState<string | null>(null);

  const handleSave = () => {
    onNotesChange(`${memo}\n${notes}`.trim());
    onClose();
  };

  return (
    <View style={styles.modalOverlay}>
      <View style={styles.notesModalContent}>
        <View style={styles.notesModalHeader}>
          <Text style={styles.notesModalTitle}>Add image/notes</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.notesContent}>
          <View style={styles.memoSection}>
            <Text style={styles.memoLabel}>Include a memo:</Text>
            <View style={styles.memoInput}>
              <Text style={styles.memoInputText}>{memo || 'Enter memo...'}</Text>
            </View>
          </View>

          <View style={styles.separator} />

          <View style={styles.attachSection}>
            <Text style={styles.attachLabel}>Attach an image or PDF:</Text>
            <View style={styles.fileSection}>
              <TouchableOpacity style={styles.chooseFileButton}>
                <Text style={styles.chooseFileText}>Choose File</Text>
              </TouchableOpacity>
              <Text style={styles.noFileText}>No file chosen</Text>
            </View>
          </View>

          <View style={styles.notesSection}>
            <Text style={styles.notesLabel}>Add notes:</Text>
            <View style={styles.notesInput}>
              <Text style={styles.notesInputText}>{notes || 'Add notes'}</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity style={styles.doneButton} onPress={handleSave}>
          <Text style={styles.doneButtonText}>Done</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// Payer Selection Modal Component
function PayerSelectionModal({ group, me, selectedPayer, onPayerSelect, onClose }: any) {
  const handlePayerSelect = (userId: string) => {
    onPayerSelect(userId);
    onClose();
  };

  return (
    <View style={styles.modalOverlay}>
      <View style={styles.selectionModalContent}>
        <View style={styles.selectionModalHeader}>
          <Text style={styles.selectionModalTitle}>Choose payer</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>
        <ScrollView style={styles.selectionModalBody}>
          {group?.members?.map((member: any) => {
            const user = member.user;
            const isSelected = member.userId === selectedPayer;
            const isCurrentUser = member.userId === me?.id;
            
            return (
              <TouchableOpacity
                key={member.userId}
                style={[styles.memberSelectRow, isSelected && styles.selectedMemberSelectRow]}
                onPress={() => handlePayerSelect(member.userId)}
              >
                <View style={styles.userAvatar}>
                  <Text style={styles.userAvatarText}>
                    {(user?.name || 'U').charAt(0).toUpperCase()}
                  </Text>
                </View>
                <Text style={styles.memberSelectText}>
                  {isCurrentUser ? 'You' : user?.name || 'Unknown'}
                </Text>
                {isSelected && <Text style={styles.selectedIndicator}>✓</Text>}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );
}

// Payee Selection Modal Component
function PayeeSelectionModal({ group, me, selectedPayee, onPayeeSelect, onClose }: any) {
  const handlePayeeSelect = (userId: string) => {
    onPayeeSelect(userId);
    onClose();
  };

  return (
    <View style={styles.modalOverlay}>
      <View style={styles.selectionModalContent}>
        <View style={styles.selectionModalHeader}>
          <Text style={styles.selectionModalTitle}>Choose a recipient</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>
        <ScrollView style={styles.selectionModalBody}>
          {group?.members?.map((member: any) => {
            const user = member.user;
            const isSelected = member.userId === selectedPayee;
            const isCurrentUser = member.userId === me?.id;
            
            return (
              <TouchableOpacity
                key={member.userId}
                style={[styles.memberSelectRow, isSelected && styles.selectedMemberSelectRow]}
                onPress={() => handlePayeeSelect(member.userId)}
              >
                <View style={styles.userAvatar}>
                  <Text style={styles.userAvatarText}>
                    {(user?.name || 'U').charAt(0).toUpperCase()}
                  </Text>
                </View>
                <Text style={styles.memberSelectText}>
                  {isCurrentUser ? 'You' : user?.name || 'Unknown'}
                </Text>
                {isSelected && <Text style={styles.selectedIndicator}>✓</Text>}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontSize: 16,
    color: '#32a852',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  headerActions: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 16,
  },
  balanceCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  balanceUser: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#32a852',
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
  balanceAmount: {
    alignItems: 'flex-end',
  },
  owedAmount: {
    fontSize: 16,
    color: '#10b981',
    fontWeight: '600',
  },
  owesAmount: {
    fontSize: 16,
    color: '#ef4444',
    fontWeight: '600',
  },
  evenAmount: {
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '600',
  },
  suggestionCard: {
    backgroundColor: '#10b981',
    borderRadius: 8,
    padding: 16,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  suggestionText: {
    fontSize: 16,
    color: 'white',
    fontWeight: '600',
    flex: 1,
  },
  suggestionAmount: {
    fontSize: 16,
    color: 'white',
    fontWeight: 'bold',
  },
  emptyState: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#6b7280',
  },
  // Modal Styles
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    width: '90%',
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#32a852',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  closeButton: {
    padding: 4,
  },
  closeButtonText: {
    fontSize: 18,
    color: 'white',
    fontWeight: 'bold',
  },
  transactionVisual: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  userContainer: {
    alignItems: 'center',
  },
  arrowContainer: {
    marginHorizontal: 20,
  },
  arrow: {
    fontSize: 24,
    color: '#6b7280',
  },
  userLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 8,
  },
  paymentSummary: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  paymentText: {
    fontSize: 16,
    color: '#1f2937',
    marginBottom: 8,
  },
  payerBubble: {
    backgroundColor: '#d1fae5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#a7f3d0',
    borderStyle: 'dashed',
  },
  payeeBubble: {
    backgroundColor: '#d1fae5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#a7f3d0',
    borderStyle: 'dashed',
  },
  paymentAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  paymentAmountInput: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    textAlign: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 8,
    backgroundColor: '#f9fafb',
  },
  actionFields: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  actionField: {
    backgroundColor: '#f3f4f6',
    borderRadius: 20,
    padding: 12,
    marginBottom: 8,
    alignItems: 'center',
  },
  actionFieldText: {
    fontSize: 16,
    color: '#1f2937',
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    borderRadius: 20,
    padding: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#1f2937',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#32a852',
    borderRadius: 20,
    padding: 12,
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
  // Date Picker Modal
  dateModalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    width: '90%',
    maxHeight: '70%',
  },
  dateModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#32a852',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  dateModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  monthNavigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'white',
  },
  navButton: {
    fontSize: 20,
    color: '#1f2937',
    fontWeight: 'bold',
  },
  monthYear: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  calendarGrid: {
    padding: 16,
  },
  daysHeader: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 8,
  },
  dayHeader: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1f2937',
    width: 40,
    textAlign: 'center',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 2,
  },
  selectedDay: {
    backgroundColor: '#32a852',
    borderRadius: 20,
  },
  dayText: {
    fontSize: 16,
    color: '#1f2937',
  },
  selectedDayText: {
    color: 'white',
    fontWeight: 'bold',
  },
  prevMonthDay: {
    fontSize: 16,
    color: '#d1d5db',
    width: 40,
    height: 40,
    textAlign: 'center',
    lineHeight: 40,
    margin: 2,
  },
  // Notes Modal
  notesModalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    width: '90%',
    maxHeight: '80%',
  },
  notesModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#32a852',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  notesModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  notesContent: {
    padding: 20,
  },
  memoSection: {
    marginBottom: 16,
  },
  memoLabel: {
    fontSize: 16,
    color: '#1f2937',
    marginBottom: 8,
  },
  memoInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    backgroundColor: 'white',
  },
  memoInputText: {
    fontSize: 16,
    color: '#1f2937',
  },
  separator: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginVertical: 16,
  },
  attachSection: {
    marginBottom: 16,
  },
  attachLabel: {
    fontSize: 16,
    color: '#1f2937',
    marginBottom: 8,
  },
  fileSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chooseFileButton: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    backgroundColor: 'white',
  },
  chooseFileText: {
    fontSize: 16,
    color: '#1f2937',
  },
  noFileText: {
    fontSize: 16,
    color: '#9ca3af',
    marginLeft: 12,
  },
  notesSection: {
    marginBottom: 16,
  },
  notesLabel: {
    fontSize: 16,
    color: '#1f2937',
    marginBottom: 8,
  },
  notesInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    backgroundColor: 'white',
    minHeight: 80,
  },
  notesInputText: {
    fontSize: 16,
    color: '#1f2937',
  },
  doneButton: {
    backgroundColor: '#32a852',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    margin: 20,
  },
  doneButtonText: {
    fontSize: 16,
    color: 'white',
    fontWeight: '600',
  },

  // Selection Modal Styles
  selectionModalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    width: '90%',
    maxHeight: '80%',
    overflow: 'hidden',
  },
  selectionModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#32a852',
    padding: 16,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  selectionModalTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  selectionModalBody: {
    padding: 16,
  },
  memberSelectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  selectedMemberSelectRow: {
    backgroundColor: '#e0ffe0', // Light green background for selected
  },
  memberSelectText: {
    fontSize: 16,
    color: '#1f2937',
    marginLeft: 12,
    flex: 1,
  },
  selectedIndicator: {
    fontSize: 18,
    color: '#32a852',
    fontWeight: 'bold',
  },
});