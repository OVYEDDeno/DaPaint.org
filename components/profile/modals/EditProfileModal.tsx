import React from 'react';
import {
    View,
    Text,
    Modal,
    Pressable,
    ScrollView,
    TextInput,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
} from 'react-native';
import {
    DaPaintColors,
    DaPaintSpacing,
    DaPaintTypography,
    DaPaintButtons,
    DaPaintRadius,
} from '../../../constants/DaPaintDesign';

interface EditProfileModalProps {
    visible: boolean;
    onClose: () => void;
    editForm: {
        display_name: string;
        username: string;
        phone: string;
        birthday: string;
        city: string;
        zipcode: string;
    };
    onUpdateField: (field: any, value: string) => void;
    onSave: () => void;
    saving: boolean;
    dismissKeyboard: () => void;
}

export default function EditProfileModal({
    visible,
    onClose,
    editForm,
    onUpdateField,
    onSave,
    saving,
    dismissKeyboard,
}: EditProfileModalProps) {
    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={onClose}
        >
            <Pressable
                onPress={dismissKeyboard}
                accessible={false}
                style={styles.sheetTouchGuard}
            >
                <KeyboardAvoidingView
                    style={styles.sheetContainer}
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                >
                    <View style={styles.sheetHeader}>
                        <Text style={styles.sheetTitle}>Edit Profile</Text>
                        <Pressable onPress={onClose}>
                            <Text style={styles.sheetClose}>X</Text>
                        </Pressable>
                    </View>
                    <ScrollView
                        style={styles.sheetContent}
                        contentContainerStyle={styles.sheetScrollContent}
                        showsVerticalScrollIndicator={false}
                    >
                        <Text style={styles.sheetLabel}>Display Name</Text>
                        <TextInput
                            style={styles.sheetInput}
                            value={editForm.display_name}
                            onChangeText={text => onUpdateField('display_name', text)}
                            placeholder="Display name"
                            placeholderTextColor={DaPaintColors.textTertiary}
                        />

                        <Text style={styles.sheetLabel}>Username</Text>
                        <TextInput
                            style={styles.sheetInput}
                            value={editForm.username}
                            onChangeText={text =>
                                onUpdateField('username', text.toLowerCase())
                            }
                            placeholder="username"
                            autoCapitalize="none"
                            placeholderTextColor={DaPaintColors.textTertiary}
                        />

                        <Text style={styles.sheetLabel}>Phone</Text>
                        <TextInput
                            style={styles.sheetInput}
                            value={editForm.phone}
                            onChangeText={text => onUpdateField('phone', text)}
                            placeholder="(123) 456-7890"
                            keyboardType="phone-pad"
                            placeholderTextColor={DaPaintColors.textTertiary}
                        />

                        <Text style={styles.sheetLabel}>Birthday (YYYY-MM-DD)</Text>
                        <TextInput
                            style={styles.sheetInput}
                            value={editForm.birthday}
                            onChangeText={text => onUpdateField('birthday', text)}
                            placeholder="2000-01-01"
                            placeholderTextColor={DaPaintColors.textTertiary}
                        />

                        <Text style={styles.sheetLabel}>City</Text>
                        <TextInput
                            style={styles.sheetInput}
                            value={editForm.city}
                            onChangeText={text => onUpdateField('city', text)}
                            placeholder="City"
                            placeholderTextColor={DaPaintColors.textTertiary}
                        />

                        <Text style={styles.sheetLabel}>Zip Code</Text>
                        <TextInput
                            style={styles.sheetInput}
                            value={editForm.zipcode}
                            onChangeText={text => onUpdateField('zipcode', text)}
                            placeholder="Zip code"
                            autoCapitalize="characters"
                            placeholderTextColor={DaPaintColors.textTertiary}
                        />
                    </ScrollView>
                    <View style={styles.sheetFooter}>
                        <Pressable
                            style={styles.sheetSecondaryButton}
                            onPress={onClose}
                        >
                            <Text style={styles.sheetSecondaryText}>Cancel</Text>
                        </Pressable>
                        <Pressable
                            style={styles.sheetPrimaryButton}
                            onPress={onSave}
                            disabled={saving}
                        >
                            <Text style={styles.sheetPrimaryText}>
                                {saving ? 'Saving...' : 'Save'}
                            </Text>
                        </Pressable>
                    </View>
                </KeyboardAvoidingView>
            </Pressable>
        </Modal>
    );
}

const styles = StyleSheet.create({
    sheetTouchGuard: {
        flex: 1,
    },
    sheetContainer: {
        backgroundColor: DaPaintColors.bg0,
        flex: 1,
    },
    sheetHeader: {
        alignItems: 'center',
        backgroundColor: DaPaintColors.surface,
        borderBottomColor: DaPaintButtons.faq.border,
        borderBottomWidth: 1,
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingBottom: DaPaintSpacing.headerBottom,
        paddingHorizontal: DaPaintSpacing.lg,
        paddingTop: DaPaintSpacing.headerTop,
    },
    sheetTitle: {
        ...DaPaintTypography.displayMedium,
        color: DaPaintColors.textPrimary,
    },
    sheetClose: {
        color: DaPaintColors.textPrimary,
        fontSize: 22,
        fontWeight: '400',
    },
    sheetContent: {
        flex: 1,
    },
    sheetScrollContent: {
        paddingBottom: DaPaintSpacing.xxl,
        paddingHorizontal: DaPaintSpacing.lg,
        paddingTop: DaPaintSpacing.md,
    },
    sheetLabel: {
        ...DaPaintTypography.labelSmall,
        color: DaPaintColors.textPrimary,
        marginBottom: DaPaintSpacing.xxs,
        marginTop: DaPaintSpacing.sm,
    },
    sheetInput: {
        backgroundColor: DaPaintButtons.faq.background,
        borderColor: DaPaintButtons.faq.border,
        borderRadius: DaPaintRadius.sm,
        borderWidth: 1,
        color: DaPaintColors.textPrimary,
        padding: DaPaintSpacing.sm,
    },
    sheetFooter: {
        backgroundColor: DaPaintColors.surface,
        borderTopColor: DaPaintButtons.faq.border,
        borderTopWidth: 1,
        flexDirection: 'row',
        gap: DaPaintSpacing.sm,
        paddingHorizontal: DaPaintSpacing.lg,
        paddingVertical: DaPaintSpacing.md,
    },
    sheetSecondaryButton: {
        alignItems: 'center',
        backgroundColor: DaPaintButtons.faq.background,
        borderColor: DaPaintButtons.faq.border,
        borderRadius: DaPaintRadius.sm,
        borderWidth: 1,
        flex: 1,
        paddingVertical: DaPaintSpacing.sm,
    },
    sheetSecondaryText: {
        color: DaPaintButtons.faq.text,
        ...DaPaintTypography.labelMedium,
    },
    sheetPrimaryButton: {
        alignItems: 'center',
        backgroundColor: DaPaintColors.primaryDeep,
        borderRadius: DaPaintRadius.sm,
        flex: 1,
        paddingVertical: DaPaintSpacing.sm,
    },
    sheetPrimaryText: {
        color: '#FFFFFF',
        ...DaPaintTypography.labelMedium,
    },
});
