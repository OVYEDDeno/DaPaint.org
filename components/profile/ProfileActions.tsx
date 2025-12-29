import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import {
    DaPaintButtons,
    DaPaintRadius,
    DaPaintSpacing,
    DaPaintTypography,
} from '../../constants/DaPaintDesign';

interface ProfileActionsProps {
    onEditPress: () => void;
    onAccountPress: () => void;
    onNotificationsPress: () => void;
    onPublicProfilePress: () => void;
}

export default function ProfileActions({
    onEditPress,
    onAccountPress,
    onNotificationsPress,
    onPublicProfilePress,
}: ProfileActionsProps) {
    return (
        <View style={styles.actionRow}>
            <Pressable
                style={styles.actionButton}
                onPress={onEditPress}
            >
                <Text style={styles.actionButtonText}>Edit Profile</Text>
            </Pressable>
            <Pressable
                style={styles.actionButton}
                onPress={onAccountPress}
            >
                <Text style={styles.actionButtonText}>Account</Text>
            </Pressable>
            <Pressable
                style={styles.actionButton}
                onPress={onNotificationsPress}
            >
                <Text style={styles.actionButtonText}>Notifications</Text>
            </Pressable>
            <Pressable
                style={styles.actionButton}
                onPress={onPublicProfilePress}
            >
                <Text style={styles.actionButtonText}>Public Profile</Text>
            </Pressable>
        </View>
    );
}

const styles = StyleSheet.create({
    actionRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: DaPaintSpacing.sm,
        justifyContent: 'space-between',
        marginBottom: DaPaintSpacing.xl,
    },
    actionButton: {
        alignItems: 'center',
        backgroundColor: DaPaintButtons.faq.background,
        borderColor: DaPaintButtons.faq.border,
        borderRadius: DaPaintRadius.sm,
        borderWidth: 1,
        flex: 1,
        minWidth: 140,
        paddingVertical: DaPaintSpacing.sm,
    },
    actionButtonText: {
        color: DaPaintButtons.faq.text,
        ...DaPaintTypography.labelSmall,
    },
});
