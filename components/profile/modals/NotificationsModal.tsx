import React from 'react';
import {
    View,
    Text,
    Modal,
    Pressable,
    ScrollView,
    Switch,
    StyleSheet,
} from 'react-native';
import {
    DaPaintColors,
    DaPaintSpacing,
    DaPaintTypography,
    DaPaintButtons,
    DaPaintRadius,
} from '../../../constants/DaPaintDesign';

interface NotificationsModalProps {
    visible: boolean;
    onClose: () => void;
    notificationSettings: {
        new_follower: boolean;
        dapaint_invite: boolean;
        dapaint_joined: boolean;
        dapaint_starting: boolean;
        dapaint_result: boolean;
        messages: boolean;
    } | null;
    onToggleNotification: (key: any, value: boolean) => void;
}

export default function NotificationsModal({
    visible,
    onClose,
    notificationSettings,
    onToggleNotification,
}: NotificationsModalProps) {
    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={onClose}
        >
            <View style={styles.sheetContainer}>
                <View style={styles.sheetHeader}>
                    <Text style={styles.sheetTitle}>Notifications</Text>
                    <Pressable onPress={onClose}>
                        <Text style={styles.sheetClose}>X</Text>
                    </Pressable>
                </View>
                <ScrollView
                    style={styles.sheetContent}
                    contentContainerStyle={styles.sheetScrollContent}
                >
                    <View style={styles.toggleRow}>
                        <Text style={styles.toggleLabel}>New Followers</Text>
                        <Switch
                            value={notificationSettings?.new_follower ?? true}
                            onValueChange={value =>
                                onToggleNotification('new_follower', value)
                            }
                        />
                    </View>
                    <View style={styles.toggleRow}>
                        <Text style={styles.toggleLabel}>DaPaint Invites</Text>
                        <Switch
                            value={notificationSettings?.dapaint_invite ?? true}
                            onValueChange={value =>
                                onToggleNotification('dapaint_invite', value)
                            }
                        />
                    </View>
                    <View style={styles.toggleRow}>
                        <Text style={styles.toggleLabel}>DaPaint Joined</Text>
                        <Switch
                            value={notificationSettings?.dapaint_joined ?? true}
                            onValueChange={value =>
                                onToggleNotification('dapaint_joined', value)
                            }
                        />
                    </View>
                    <View style={styles.toggleRow}>
                        <Text style={styles.toggleLabel}>DaPaint Starting</Text>
                        <Switch
                            value={notificationSettings?.dapaint_starting ?? true}
                            onValueChange={value =>
                                onToggleNotification('dapaint_starting', value)
                            }
                        />
                    </View>
                    <View style={styles.toggleRow}>
                        <Text style={styles.toggleLabel}>DaPaint Results</Text>
                        <Switch
                            value={notificationSettings?.dapaint_result ?? true}
                            onValueChange={value =>
                                onToggleNotification('dapaint_result', value)
                            }
                        />
                    </View>
                    <View style={styles.toggleRow}>
                        <Text style={styles.toggleLabel}>Messages</Text>
                        <Switch
                            value={notificationSettings?.messages ?? true}
                            onValueChange={value =>
                                onToggleNotification('messages', value)
                            }
                        />
                    </View>
                </ScrollView>
                <View style={styles.sheetFooter}>
                    <Pressable
                        style={styles.sheetPrimaryButton}
                        onPress={onClose}
                    >
                        <Text style={styles.sheetPrimaryText}>Done</Text>
                    </Pressable>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
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
    toggleRow: {
        alignItems: 'center',
        borderBottomColor: DaPaintButtons.faq.border,
        borderBottomWidth: 1,
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: DaPaintSpacing.sm,
    },
    toggleLabel: {
        color: DaPaintColors.textPrimary,
        ...DaPaintTypography.bodyMedium,
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
