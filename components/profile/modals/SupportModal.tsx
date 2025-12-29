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

interface SupportModalProps {
    visible: boolean;
    onClose: () => void;
    message: string;
    onUpdateMessage: (value: string) => void;
    onSubmit: () => void;
    dismissKeyboard: () => void;
    title: string;
    placeholder: string;
}

export default function SupportModal({
    visible,
    onClose,
    message,
    onUpdateMessage,
    onSubmit,
    dismissKeyboard,
    title,
    placeholder,
}: SupportModalProps) {
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
                        <Text style={styles.sheetTitle}>{title}</Text>
                        <Pressable onPress={onClose}>
                            <Text style={styles.sheetClose}>X</Text>
                        </Pressable>
                    </View>
                    <ScrollView
                        style={styles.sheetContent}
                        contentContainerStyle={styles.sheetScrollContent}
                    >
                        <TextInput
                            style={[styles.sheetInput, styles.sheetTextArea]}
                            value={message}
                            onChangeText={onUpdateMessage}
                            placeholder={placeholder}
                            multiline
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
                            onPress={onSubmit}
                        >
                            <Text style={styles.sheetPrimaryText}>Send</Text>
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
    sheetInput: {
        backgroundColor: DaPaintButtons.faq.background,
        borderColor: DaPaintButtons.faq.border,
        borderRadius: DaPaintRadius.sm,
        borderWidth: 1,
        color: DaPaintColors.textPrimary,
        padding: DaPaintSpacing.sm,
    },
    sheetTextArea: {
        minHeight: 120,
        textAlignVertical: 'top',
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
