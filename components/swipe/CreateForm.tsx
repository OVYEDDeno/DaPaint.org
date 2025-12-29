// components/swipe/CreateForm.tsx
import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  Alert,
  Platform,
  ScrollView,
  KeyboardAvoidingView,
} from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { createDaPaint } from "../../lib/api/dapaints";
import { DaPaintDatePickerTheme } from "../../constants/DaPaintDesign";
import { theme } from "../../constants/theme";
import { getKeyboardDismissHandler } from "../../lib/webFocusGuard";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Conditional import for DateTimePicker - only import on native platforms
let DateTimePicker: any = null;
if (Platform.OS !== 'web') {
  try {
    DateTimePicker = require('@react-native-community/datetimepicker').default;
  } catch (e) {
    console.warn('DateTimePicker not available:', e);
  }
}

// Removed unused SCREEN_WIDTH const

type UserData = {
  id: string;
  display_name: string;
  current_winstreak: number;
} | null;

type CreateFormProps = {
  userData: UserData;
  onCreated: () => Promise<void>;
};

export default function CreateForm({ userData, onCreated }: CreateFormProps) {
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const insets = useSafeAreaInsets();
  const STORAGE_KEY = "dapaint_create_draft_v1";
  const dismissKeyboard = getKeyboardDismissHandler();
  
  const [formData, setFormData] = useState({
    dapaint: '',
    description: '',
    howWinnerIsDetermined: '',
    rulesOfDapaint: '',
    streetAddress: '',
    city: '',
    postalCode: '',
    date: new Date(),
    time: new Date(),
    ticketPrice: '0',
    maxParticipants: 2,
    dapaintType: '1v1' as '1v1' | 'team',
  });

  const updateField = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const toDate = (value: any) => {
    if (value?.toDate && typeof value.toDate === "function") {
      const d = value.toDate();
      return d instanceof Date && !isNaN(d.getTime()) ? d : new Date();
    }
    if (value instanceof Date && !isNaN(value.getTime())) return value;
    const d = new Date(value);
    return isNaN(d.getTime()) ? new Date() : d;
  };

  const formatDate = (dateValue: any) => {
    const date = toDate(dateValue);
    if (!(date instanceof Date) || typeof date.toLocaleDateString !== "function") {
      return "";
    }
    if (isNaN(date.getTime())) return "";
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

  // Load draft on mount
  useEffect(() => {
    const loadDraft = async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (!raw) return;
        const parsed = JSON.parse(raw);
        if (parsed?.formData) {
          setFormData((prev) => ({
            ...prev,
            ...parsed.formData,
            date: toDate(parsed.formData.date),
            time: toDate(parsed.formData.time),
          }));
        }
        if (parsed?.step) {
          setStep(Math.min(Math.max(parsed.step, 1), 4));
        }
      } catch (e) {
        console.warn("Failed to load draft", e);
      }
    };
    loadDraft();
  }, []);

  // Persist draft
  useEffect(() => {
    const saveDraft = async () => {
      try {
        await AsyncStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            step,
            formData: {
              ...formData,
              date: toDate(formData.date).toISOString(),
              time: toDate(formData.time).toISOString(),
            },
          })
        );
      } catch (e) {
        console.warn("Failed to save draft", e);
      }
    };
    saveDraft();
  }, [step, formData]);

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

  const footerPaddingBottom =
    (Platform.OS === 'ios' ? 4 : 4) + insets.bottom + (Platform.OS === 'web' ? 60 : 0);

  const scrollBottomPadding = 12 + footerPaddingBottom;

  const handleNext = () => {
    // Validation for each step
    if (step === 1) {
      if (!formData.dapaint.trim()) {
        Alert.alert("Try Again", "Please enter the DaPaint name");
        return;
      }
      if (!formData.howWinnerIsDetermined.trim()) {
        Alert.alert("Try Again", "Please specify how the winner is determined");
        return;
      }
    } else if (step === 2) {
      if (!formData.streetAddress.trim() || !formData.city.trim() || !formData.postalCode.trim()) {
        Alert.alert("Try Again", "Please fill all location fields");
        return;
      }
    } else if (step === 3) {
      const startsAt = new Date(formData.date);
      startsAt.setHours(formData.time.getHours());
      startsAt.setMinutes(formData.time.getMinutes());
      
      if (startsAt < new Date()) {
        Alert.alert("Try Again", "Start time must be in the future");
        return;
      }
    }

    setStep(step + 1);
  };

  const handleBack = () => {
    setStep(step - 1);
  };

  const handleCreate = async () => {
    if (!userData) {
      Alert.alert("Error", "User data not available");
      return;
    }

    setLoading(true);
    try {
      const startsAt = toDate(formData.date);
      const timeVal = toDate(formData.time);
      const parsedPrice = Number.parseFloat(formData.ticketPrice);
      const ticketPrice = Number.isFinite(parsedPrice) ? Math.max(0, parsedPrice) : 0;
      startsAt.setHours(timeVal.getHours());
      startsAt.setMinutes(timeVal.getMinutes());
      startsAt.setSeconds(0);
      startsAt.setMilliseconds(0);

      await createDaPaint({
        dapaint: formData.dapaint,
        description: formData.description || null,
        how_winner_is_determined: formData.howWinnerIsDetermined,
        rules_of_dapaint: formData.rulesOfDapaint || null,
        location: formData.streetAddress,
        city: formData.city,
        zipcode: formData.postalCode,
        starts_at: startsAt.toISOString(),
        ticket_price: ticketPrice,
        max_participants: formData.maxParticipants,
        dapaint_type: formData.dapaintType,
      });

      // Reset form
      setFormData({
        dapaint: '',
        description: '',
        howWinnerIsDetermined: '',
        rulesOfDapaint: '',
        streetAddress: '',
        city: '',
        postalCode: '',
        date: new Date(),
        time: new Date(),
        ticketPrice: '0',
        maxParticipants: 2,
        dapaintType: '1v1',
      });
      setStep(1);

      Alert.alert("Success", "Your DaPaint is live!");
      await onCreated();
      await AsyncStorage.removeItem(STORAGE_KEY);
    } catch (error: any) {
      console.error("Error creating DaPaint:", error);
      Alert.alert("Error", "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const selectDaPaintType = (type: '1v1' | 'team') => {
    updateField('dapaintType', type);
    if (type === '1v1') {
      updateField('maxParticipants', 2);
    } else {
      updateField('maxParticipants', 10);
    }
  };



  return (
    <SafeAreaView style={styles.screen}>
        <Pressable onPress={dismissKeyboard} accessible={false} style={styles.touchGuard}>
      <View style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
      >
        {/* Header with Progress */}
            <View style={styles.header}>
              <Text style={styles.title}>Create DaPaint</Text>
              <View style={styles.progressContainer}>
                {[1, 2, 3, 4].map((s) => (
                  <View
                    key={s}
                    style={[
                      styles.progressDot,
                      s <= step ? styles.progressDotActive : styles.progressDotInactive,
                    ]}
                  />
                ))}
              </View>
            </View>

            <ScrollView 
              style={styles.content} 
              contentContainerStyle={[styles.scrollContent, { paddingBottom: scrollBottomPadding }]}
              showsVerticalScrollIndicator={false}
            >
        {/* Step 1: What */}
        {step === 1 && (
          <View style={styles.step}>
            <Text style={styles.stepTitle}>What's the DaPaint?</Text>
            <Text style={styles.stepSubtitle}>
              Be specific about what you're competing in
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>DaPaint Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., 100 Pushups in 10 minutes"
                value={formData.dapaint}
                onChangeText={(text) => updateField('dapaint', text)}
                placeholderTextColor={theme.colors.textTertiary}
                multiline
                onPressIn={(e) => {
                  if (Platform.OS === 'web') {
                    e.stopPropagation();
                  }
                }}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>How is winner determined? *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., First to finish, Most reps, etc."
                value={formData.howWinnerIsDetermined}
                onChangeText={(text) => updateField('howWinnerIsDetermined', text)}
                placeholderTextColor={theme.colors.textTertiary}
                multiline
                onPressIn={(e) => {
                  if (Platform.OS === 'web') {
                    e.stopPropagation();
                  }
                }}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Description (optional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Standard pushups, chest to ground. Video proof required."
                value={formData.description}
                onChangeText={(text) => updateField('description', text)}
                placeholderTextColor={theme.colors.textTertiary}
                multiline
                numberOfLines={4}
                onPressIn={(e) => {
                  if (Platform.OS === 'web') {
                    e.stopPropagation();
                  }
                }}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Rules (optional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Specific rules for this DaPaint..."
                value={formData.rulesOfDapaint}
                onChangeText={(text) => updateField('rulesOfDapaint', text)}
                placeholderTextColor={theme.colors.textTertiary}
                multiline
                numberOfLines={4}
                onPressIn={(e) => {
                  if (Platform.OS === 'web') {
                    e.stopPropagation();
                  }
                }}
              />
            </View>

            {/* Examples Card */}
            <View style={styles.exampleCard}>
              <Text style={styles.exampleTitle}>Good Examples:</Text>
              <Text style={styles.exampleText}>• 50 Burpees non-stop</Text>
              <Text style={styles.exampleText}>• Run 5K under 25 minutes</Text>
              <Text style={styles.exampleText}>• Plank for 3 minutes straight</Text>
            </View>
          </View>
        )}

        {/* Step 2: Where */}
        {step === 2 && (
          <View style={styles.step}>
            <Text style={styles.stepTitle}>Where will this happen?</Text>
            <Text style={styles.stepSubtitle}>
              Full address where the DaPaint takes place
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Street Address *</Text>
              <TextInput
                style={styles.input}
                placeholder="123 Main St"
                value={formData.streetAddress}
                onChangeText={(text) => updateField('streetAddress', text)}
                placeholderTextColor={theme.colors.textTertiary}
                onPressIn={(e) => {
                  if (Platform.OS === 'web') {
                    e.stopPropagation();
                  }
                }}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>City *</Text>
              <TextInput
                style={styles.input}
                placeholder="Miami"
                value={formData.city}
                onChangeText={(text) => updateField('city', text)}
                placeholderTextColor={theme.colors.textTertiary}
                onPressIn={(e) => {
                  if (Platform.OS === 'web') {
                    e.stopPropagation();
                  }
                }}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Postal Code *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., 90210 or SW1A 1AA"
                value={formData.postalCode}
                onChangeText={(text) => updateField('postalCode', text.toUpperCase())}
                placeholderTextColor={theme.colors.textTertiary}
                keyboardType="default"
                autoCapitalize="characters"
                autoCorrect={false}
                textContentType="postalCode"
                maxLength={12}
                onPressIn={(e) => {
                  if (Platform.OS === 'web') {
                    e.stopPropagation();
                  }
                }}
              />
            </View>

            {/* Info Card */}
            <View style={styles.infoCard}>
              <Text style={styles.infoIcon}>📍</Text>
              <Text style={styles.infoText}>
                Only users in your postal code will see this DaPaint
              </Text>
            </View>
          </View>
        )}

        {/* Step 3: When */}
        {step === 3 && (
          <View style={styles.step}>
            <Text style={styles.stepTitle}>When does it start?</Text>
            <Text style={styles.stepSubtitle}>
              Pick a date and time for the DaPaint
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Date *</Text>
              {Platform.OS === 'web' ? (
                <TextInput
                  style={styles.input}
                  value={formatDate(formData.date)}
                  onChangeText={(text) => {
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
                  onPressIn={(e) => {
                    if (Platform.OS === 'web') {
                      e.stopPropagation();
                    }
                  }}
                />
              ) : (
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
                <TextInput
                  style={styles.input}
                  value={formatTime(formData.time)}
                  onChangeText={(text) => {
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
                  placeholder="6:00 PM"
                placeholderTextColor={theme.colors.textTertiary}
                onPressIn={(e) => {
                  if (Platform.OS === 'web') {
                    e.stopPropagation();
                  }
                }}
                />
              ) : (
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

            {/* Info Card */}
            <View style={styles.infoCard}>
              <Text style={styles.infoIcon}>⏰</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.infoText}>
                  Submission deadline: 24 hours after start time
                </Text>
                <Text style={[styles.infoText, { marginTop: 8 }]}>
                  If your foe doesn't submit, you win automatically!
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Step 4: Type */}
        {step === 4 && (
          <View style={styles.step}>
            <Text style={styles.stepTitle}>DaPaint Type</Text>
            <Text style={styles.stepSubtitle}>
              1v1 or Team competition
            </Text>

            <Pressable
              style={[
                styles.typeCard,
                formData.dapaintType === '1v1' ? styles.typeCardActive : styles.typeCardInactive,
              ]}
              onPress={() => selectDaPaintType('1v1')}
              onPressIn={(e) => {
                if (Platform.OS === 'web') {
                  e.stopPropagation();
                }
              }}
            >
              <Text style={styles.typeIcon}>🎯</Text>
              <Text style={styles.typeTitle}>1v1 (One Foe)</Text>
              <Text style={styles.typeDescription}>
                Classic head-to-head competition. First person to join locks it in.
              </Text>
            </Pressable>

            <Pressable
              style={[
                styles.typeCard,
                formData.dapaintType === 'team' ? styles.typeCardActive : styles.typeCardInactive,
              ]}
              onPress={() => selectDaPaintType('team')}
              onPressIn={(e) => {
                if (Platform.OS === 'web') {
                  e.stopPropagation();
                }
              }}
            >
              <Text style={styles.typeIcon}>👥</Text>
              <Text style={styles.typeTitle}>Team (Multiple Foes)</Text>
              <Text style={styles.typeDescription}>
                Multiple people can join and compete. Best Team wins.
              </Text>
            </Pressable>

          </View>
        )}
      </ScrollView>
      {/* Footer Buttons */}
      <View style={[styles.footer, { paddingBottom: footerPaddingBottom }]}>
        {step > 1 && (
          <Pressable 
            style={styles.backButton} 
            onPress={handleBack}
            disabled={loading}
          >
            <Text style={styles.backButtonText}>Back</Text>
          </Pressable>
        )}
        <Pressable
          style={[styles.nextButton, step === 1 && styles.nextButtonFull]}
          onPress={step === 4 ? handleCreate : handleNext}
          disabled={loading}
        >
          <Text style={styles.nextButtonText}>
            {loading
              ? 'Creating...'
              : step === 4
              ? 'Create DaPaint'
              : 'Next'}
          </Text>
        </Pressable>
      </View>
          </KeyboardAvoidingView>
        </View>
      </Pressable>
    </SafeAreaView>
);
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  touchGuard: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: 'transparent',
    alignSelf: 'center',
    width: '100%',
    maxWidth: 420,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.space.lg,
    paddingTop: Platform.OS === 'web' ? theme.space.headerTop : theme.space.sm,
    paddingBottom: Platform.OS === 'web' ? theme.space.headerBottom : theme.space.xs,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#005c82',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  progressDotActive: {
    backgroundColor: theme.colors.primaryDeep,
  },
  progressDotInactive: {
    backgroundColor: 'rgba(0, 92, 130, 0.24)',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: theme.space.lg,
    paddingTop: 32,
    paddingBottom: 100,
  },
  step: {
    gap: 24,
  },
  stepTitle: {
    ...theme.type.displaySmall,
    color: theme.colors.textPrimary,
  },
  stepSubtitle: {
    ...theme.type.bodyLarge,
    color: theme.colors.textSecondary,
    lineHeight: 22,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    ...theme.type.labelMedium,
    color: theme.colors.textPrimary,
  },
  input: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.sm,
    padding: 16,
    fontSize: 16,
    color: theme.colors.textPrimary,
    borderWidth: 1,
    borderColor: theme.colors.border,
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
  exampleCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  exampleTitle: {
    ...theme.type.displaySmall,
    color: theme.colors.textPrimary,
    marginBottom: 12,
  },
  exampleText: {
    ...theme.type.bodyMedium,
    color: theme.colors.textSecondary,
    marginBottom: 8,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  infoIcon: {
    fontSize: 20,
    color: theme.colors.textPrimary,
  },
  infoText: {
    ...theme.type.bodyMedium,
    color: theme.colors.textSecondary,
    lineHeight: 20,
    flex: 1,
  },
  typeCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: 20,
    borderWidth: 2,
    borderColor: theme.colors.border,
    gap: 8,
  },
  typeCardInactive: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
  },
  typeCardActive: {
    borderColor: theme.colors.primaryDeep,
    backgroundColor: 'rgba(0, 92, 130, 0.12)',
    ...Platform.select({
      ios: {
        shadowColor: theme.colors.primaryDeep,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.18,
        shadowRadius: 10,
      },
      android: {
        elevation: 3,
      },
      web: {
        boxShadow: '0px 6px 10px rgba(0,92,130,0.18)',
      },
      default: {
        shadowColor: theme.colors.primaryDeep,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.18,
        shadowRadius: 10,
        elevation: 3,
      },
    }),
  },
  typeIcon: {
    fontSize: 32,
    marginBottom: 8,
    color: theme.colors.textPrimary,
  },
  typeTitle: {
    ...theme.type.displaySmall,
    color: theme.colors.textPrimary,
  },
  typeDescription: {
    ...theme.type.bodyMedium,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  matchingCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: 20,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  matchingBadge: {
    backgroundColor: theme.colors.primaryDeep,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  matchingBadgeText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  matchingTitle: {
    ...theme.type.displaySmall,
    color: theme.colors.textPrimary,
  },
  matchingText: {
    ...theme.type.bodyMedium,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: theme.space.lg,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 92, 130, 0.14)',
  },
  backButton: {
    padding: 18,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(0, 92, 130, 0.35)',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
    minHeight: 48,
  },
  backButtonText: {
    color: '#005c82',
    fontSize: 16,
    fontWeight: '600',
  },
  nextButton: {
    backgroundColor: '#005c82',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    flex: 2,
    minHeight: 48,
  },
  nextButtonFull: {
    flex: 1,
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
