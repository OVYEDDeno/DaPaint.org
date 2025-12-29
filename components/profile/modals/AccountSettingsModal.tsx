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

interface AccountSettingsModalProps {
    visible: boolean;
    onClose: () => void;
    accountForm: {
        email: string;
        newPassword: string;
        confirmPassword: string;
    };
    onUpdateField: (field: any, value: string) => void;
    onSave: () => void;
    onDeleteAccount: () => void;
    saving: boolean;
    dismissKeyboard: () => void;
}

export default function AccountSettingsModal({
    visible,
    onClose,
    accountForm,
    onUpdateField,
    onSave,
    onDeleteAccount,
    saving,
    dismissKeyboard,
}: AccountSettingsModalProps) {
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
                        <Text style={styles.sheetTitle}>Account Settings</Text>
                        <Pressable onPress={onClose}>
                            <Text style={styles.sheetClose}>X</Text>
                        </Pressable>
                    </View>
                    <ScrollView
                        style={styles.sheetContent}
                        contentContainerStyle={styles.sheetScrollContent}
                        showsVerticalScrollIndicator={false}
                    >
                        <Text style={styles.sheetLabel}>Email</Text>
                        <TextInput
                            style={styles.sheetInput}
                            value={accountForm.email}
                            onChangeText={text => onUpdateField('email', text)}
                            placeholder="you@email.com"
                            keyboardType="email-address"
                            autoCapitalize="none"
                            placeholderTextColor={DaPaintColors.textTertiary}
                        />

                        <Text style={styles.sheetLabel}>New Password</Text>
                        <TextInput
                            style={styles.sheetInput}
                            value={accountForm.newPassword}
                            onChangeText={text => onUpdateField('newPassword', text)}
                            placeholder="New password"
                            secureTextEntry
                            placeholderTextColor={DaPaintColors.textTertiary}
                        />

                        <Text style={styles.sheetLabel}>Confirm Password</Text>
                        <TextInput
                            style={styles.sheetInput}
                            value={accountForm.confirmPassword}
                            onChangeText={text =>
                                onUpdateField('confirmPassword', text)
                            }
                            placeholder="Confirm password"
                            secureTextEntry
                            placeholderTextColor={DaPaintColors.textTertiary}
                        />

                        <Pressable
                            style={styles.sheetDangerButton}
                            onPress={onDeleteAccount}
                        >
                            <Text style={styles.sheetDangerText}>Delete Account</Text>
                        </Pressable>
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
    sheetDangerButton: {
        alignItems: 'center',
        backgroundColor: 'rgba(255,69,58,0.1)',
        borderColor: DaPaintColors.error,
        borderRadius: DaPaintRadius.sm,
        borderWidth: 1,
        marginTop: DaPaintSpacing.md,
        paddingVertical: DaPaintSpacing.sm,
    },
    sheetDangerText: {
        color: DaPaintColors.error,
        ...DaPaintTypography.labelMedium,
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
