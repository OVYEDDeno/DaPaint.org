// components/swipe/EditDaPaintModal.tsx
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
  Alert,
  Platform,
  Keyboard,
  KeyboardAvoidingView,
} from 'react-native';
import { useEffect, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../../constants/theme';
import { getKeyboardDismissHandler } from '../../lib/webFocusGuard';
// Conditional import for DateTimePicker - only import on native platforms
let DateTimePicker: any = null;
if (Platform.OS !== 'web') {
  try {
    DateTimePicker = require('@react-native-community/datetimepicker').default;
  } catch (e) {
    console.warn('DateTimePicker not available:', e);
  }
}
import { DaPaint, editDaPaint, canEditDaPaint } from '../../lib/api/dapaints';
import { DaPaintDatePickerTheme } from '../../constants/DaPaintDesign';

type EditDaPaintModalProps = {
  visible: boolean;
  dapaint: DaPaint;
  onClose: () => void;
  onSuccess: () => void;
};

export default function EditDaPaintModal({
  visible,
  dapaint,
  onClose,
  onSuccess,
}: EditDaPaintModalProps) {
  const [loading, setLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [keyboardOffset, setKeyboardOffset] = useState(0);
  const insets = useSafeAreaInsets();
  const dismissKeyboard = getKeyboardDismissHandler();

  const [formData, setFormData] = useState({
    dapaint: dapaint.dapaint,
    description: dapaint.description || '',
    howWinnerIsDetermined: dapaint.how_winner_is_determined,
    rulesOfDapaint: dapaint.rules_of_dapaint || '',
    streetAddress: dapaint.location,
    city: dapaint.city,
    postalCode: dapaint.zipcode,
    date: new Date(dapaint.starts_at),
    time: new Date(dapaint.starts_at),
    ticketPrice: dapaint.ticket_price.toString(),
    maxParticipants: dapaint.max_participants,
  });

  const updateField = (field: string, value: any) => {
    setFormData({ ...formData, [field]: value });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  useEffect(() => {
    const showEvent = Platform.OS === 'android' ? 'keyboardDidShow' : 'keyboardWillShow';
    const hideEvent = Platform.OS === 'android' ? 'keyboardDidHide' : 'keyboardWillHide';

    const onShow = (e: any) => {
      const heightFromEvent = e?.endCoordinates?.height ?? 0;
      setKeyboardOffset(heightFromEvent);
    };

    const onHide = () => setKeyboardOffset(0);

    const showSub = Keyboard.addListener(showEvent, onShow);
    const hideSub = Keyboard.addListener(hideEvent, onHide);

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const onDateChange = (_event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      updateField('date', selectedDate);
    }
  };

  const onTimeChange = (_event: any, selectedTime?: Date) => {
    setShowTimePicker(Platform.OS === 'ios');
    if (selectedTime) {
      updateField('time', selectedTime);
    }
  };

  const handleSave = async () => {
    if (!formData.dapaint.trim() || !formData.howWinnerIsDetermined.trim()) {
      Alert.alert('Try Again', 'Please fill all required fields');
      return;
    }

    // Check if can still edit
    const canEdit = await canEditDaPaint(dapaint.id);
    if (!canEdit) {
      Alert.alert('Cannot Edit', 'Someone has already joined this DaPaint');
      onClose();
      return;
    }

    setLoading(true);

    try {
      const startsAt = new Date(formData.date);
      startsAt.setHours(formData.time.getHours());
      startsAt.setMinutes(formData.time.getMinutes());
      startsAt.setSeconds(0);
      startsAt.setMilliseconds(0);

      if (startsAt < new Date()) {
        Alert.alert('Try Again', 'Start time must be in the future');
        return;
      }

      await editDaPaint(dapaint.id, {
        dapaint: formData.dapaint,
        description: formData.description || null,
        how_winner_is_determined: formData.howWinnerIsDetermined,
        rules_of_dapaint: formData.rulesOfDapaint || null,
        location: formData.streetAddress,
        city: formData.city,
        zipcode: formData.postalCode,
        starts_at: startsAt.toISOString(),
        ticket_price: parseFloat(formData.ticketPrice),
        max_participants: formData.maxParticipants,
      });

      Alert.alert('Success', 'DaPaint updated successfully', [
        {
          text: 'OK',
          onPress: () => {
            onSuccess();
            onClose();
          },
        },
      ]);
    } catch (error: any) {
      console.error('Error updating DaPaint:', error);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const footerPaddingBottom = (Platform.OS === 'ios' ? 24 : 12) + keyboardOffset + insets.bottom;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <Pressable onPress={dismissKeyboard} accessible={false} style={styles.touchGuard}>
        <KeyboardAvoidingView
          style={styles.container}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top : 0}
        >
          <View style={styles.inner}>
            <View style={styles.header}>
              <Text style={styles.title}>Edit DaPaint</Text>
              <Pressable onPress={onClose}>
                <Text style={styles.closeButton}>バ</Text>
              </Pressable>
            </View>

            <ScrollView
              style={styles.content}
              contentContainerStyle={[
                styles.scrollContent,
                { paddingBottom: footerPaddingBottom + 80 },
              ]}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.inputGroup}>
                <Text style={styles.label}>DaPaint *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.dapaint}
                  onChangeText={(text) => updateField('dapaint', text)}
                  placeholder="e.g., 100 Pushups in 10 minutes"
                  placeholderTextColor={theme.colors.textTertiary}
                  multiline
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>How is the winner determined? *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.howWinnerIsDetermined}
                  onChangeText={(text) => updateField('howWinnerIsDetermined', text)}
                  placeholder="e.g., First to finish"
                  placeholderTextColor={theme.colors.textTertiary}
                  multiline
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Description</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={formData.description}
                  onChangeText={(text) => updateField('description', text)}
                  placeholder="Additional details..."
                  placeholderTextColor={theme.colors.textTertiary}
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Rules</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={formData.rulesOfDapaint}
                  onChangeText={(text) => updateField('rulesOfDapaint', text)}
                  placeholder="Rules of the DaPaint..."
                  placeholderTextColor={theme.colors.textTertiary}
                  multiline
                  numberOfLines={4}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Street Address *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.streetAddress}
                  onChangeText={(text) => updateField('streetAddress', text)}
                  placeholder="123 Main St"
                  placeholderTextColor={theme.colors.textTertiary}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>City *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.city}
                  onChangeText={(text) => updateField('city', text)}
                  placeholder="Miami"
                  placeholderTextColor={theme.colors.textTertiary}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Postal Code *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.postalCode}
                  onChangeText={(text) => updateField('postalCode', text.toUpperCase())}
                  placeholder="e.g., 90210 or SW1A 1AA"
                  placeholderTextColor={theme.colors.textTertiary}
                  keyboardType="default"
                  autoCapitalize="characters"
                  autoCorrect={false}
                  textContentType="postalCode"
                  maxLength={12}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Date *</Text>
                {Platform.OS === 'web' ? (
                  // Text input fallback for web
                  <TextInput
                    style={styles.input}
                    value={formatDate(formData.date)}
                    onChangeText={(text) => {
                      // Parse MM/DD/YYYY format
                      const parts = text.split('/');
                      if (parts.length === 3) {
                        const year = parseInt(parts[2] || '0');
                        const month = parseInt(parts[0] || '0') - 1;
                        const day = parseInt(parts[1] || '0');
                        
                        if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
                          const date = new Date(year, month, day);
                          if (!isNaN(date.getTime())) {
                            updateField('date', date);
                          }
                        }
                      }
                    }}
                    placeholder="MM/DD/YYYY"
                    placeholderTextColor={theme.colors.textTertiary}
                    keyboardType="numeric"
                  />
                ) : (
                  // Native date picker
                  <>
                    <Pressable onPress={() => setShowDatePicker(true)}>
                      <View style={[styles.input, { pointerEvents: 'none' }]}>
                        <Text style={styles.inputText}>{formatDate(formData.date)}</Text>
                      </View>
                    </Pressable>
                    {showDatePicker && DateTimePicker && (
                      <View style={styles.datePickerWrapper}>
                        <DateTimePicker
                          value={formData.date}
                          mode="date"
                          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                          onChange={onDateChange}
                          minimumDate={new Date()}
                          themeVariant={DaPaintDatePickerTheme.themeVariant}
                          textColor={DaPaintDatePickerTheme.textColor}
                          style={styles.dateTimePicker}
                        />
                      </View>
                    )}
                  </>
                )}
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Time *</Text>
                {Platform.OS === 'web' ? (
                  // Text input fallback for web
                  <TextInput
                    style={styles.input}
                    value={formatTime(formData.time)}
                    onChangeText={(text) => {
                      // Parse HH:MM AM/PM format (simplified)
                      const date = new Date();
                      const timeParts = text.match(/(\d+):(\d+)\s*(AM|PM)/i);
                      if (timeParts && timeParts[1] && timeParts[2] && timeParts[3]) {
                        let hours = parseInt(timeParts[1]);
                        const minutes = parseInt(timeParts[2]);
                        const period = timeParts[3].toUpperCase();
                        
                        if (period === 'PM' && hours < 12) hours += 12;
                        if (period === 'AM' && hours === 12) hours = 0;
                        
                        date.setHours(hours);
                        date.setMinutes(minutes);
                        updateField('time', date);
                      }
                    }}
                    placeholder="HH:MM AM/PM"
                    placeholderTextColor={theme.colors.textTertiary}
                  />
                ) : (
                  // Native time picker
                  <>
                    <Pressable onPress={() => setShowTimePicker(true)}>
                      <View style={[styles.input, { pointerEvents: 'none' }]}>
                        <Text style={styles.inputText}>{formatTime(formData.time)}</Text>
                      </View>
                    </Pressable>
                    {showTimePicker && DateTimePicker && (
                      <View style={styles.datePickerWrapper}>
                        <DateTimePicker
                          value={formData.time}
                          mode="time"
                          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                          onChange={onTimeChange}
                          themeVariant={DaPaintDatePickerTheme.themeVariant}
                          textColor={DaPaintDatePickerTheme.textColor}
                          style={styles.dateTimePicker}
                        />
                      </View>
                    )}
                  </>
                )}
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Ticket Price</Text>
                <View style={styles.priceInputContainer}>
                  <Text style={styles.pricePrefix}>$</Text>
                  <TextInput
                    style={[styles.input, styles.priceInput]}
                    value={formData.ticketPrice}
                    onChangeText={(text) => updateField('ticketPrice', text)}
                    placeholder="0.00"
                    placeholderTextColor={theme.colors.textTertiary}
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>

              {dapaint.dapaint_type === 'team' && (
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Max Participants *</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.maxParticipants.toString()}
                    onChangeText={(text) => updateField('maxParticipants', parseInt(text) || 2)}
                    placeholder="e.g., 10"
                    placeholderTextColor={theme.colors.textTertiary}
                    keyboardType="number-pad"
                  />
                </View>
              )}
            </ScrollView>

            <View style={[styles.footer, { paddingBottom: footerPaddingBottom }]}>
              <Pressable style={styles.cancelButton} onPress={onClose}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.saveButton, loading && styles.saveButtonDisabled]}
                onPress={handleSave}
                disabled={loading}
              >
                <Text style={styles.saveButtonText}>
                  {loading ? 'Saving...' : 'Save Changes'}
                </Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  inner: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  touchGuard: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    paddingTop: theme.space.headerTop,
    paddingBottom: theme.space.headerBottom,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: 'rgba(255,255,255,0.95)',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  closeButton: {
    fontSize: 24,
    color: theme.colors.textPrimary,
    fontWeight: '300',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingTop: 32,
    paddingBottom: 100,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    backgroundColor: theme.colors.surface,
    color: theme.colors.textPrimary,
    minHeight: 48,
  },
  inputText: {
    fontSize: 16,
    color: theme.colors.textPrimary,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  dateTimePicker: {
    backgroundColor: 'transparent',
    marginTop: 24,
    borderRadius: 16,
    alignItems: 'center',
  },
  datePickerWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  priceInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    backgroundColor: theme.colors.surface,
  },
  pricePrefix: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    paddingLeft: 16,
  },
  priceInput: {
    flex: 1,
    borderWidth: 0,
    backgroundColor: 'transparent',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    padding: 16,
    paddingTop: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  cancelButton: {
    flex: 1,
    padding: 18,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: theme.colors.border,
    alignItems: 'center',
    minHeight: 48,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  saveButton: {
    flex: 2,
    padding: 18,
    borderRadius: 12,
    backgroundColor: theme.colors.primaryDeep,
    alignItems: 'center',
    minHeight: 48,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
