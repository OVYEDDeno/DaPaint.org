import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import {
    DaPaintButtons,
    DaPaintRadius,
    DaPaintSpacing,
    DaPaintTypography,
} from '../../constants/DaPaintDesign';

interface ProfileSettingsProps {
    onSupportPress: () => void;
    onFeedbackPress: () => void;
    onPrivacyPress: () => void;
    onLogoutPress: () => void;
}

export default function ProfileSettings({
    onSupportPress,
    onFeedbackPress,
    onPrivacyPress,
    onLogoutPress,
}: ProfileSettingsProps) {
    return (
        <View style={styles.settingsContainer}>
            <Pressable
                style={styles.settingButton}
                onPress={onSupportPress}
            >
                <Text style={styles.settingButtonText}>Help & Support</Text>
            </Pressable>
            <Pressable
                style={styles.settingButton}
                onPress={onFeedbackPress}
            >
                <Text style={styles.settingButtonText}>Feedback</Text>
            </Pressable>
            <Pressable
                style={styles.settingButton}
                onPress={onPrivacyPress}
            >
                <Text style={styles.settingButtonText}>Privacy</Text>
            </Pressable>
            <Pressable
                style={[styles.settingButton, styles.settingButtonLast]}
                onPress={onLogoutPress}
            >
                <Text style={styles.settingButtonText}>Log Out</Text>
            </Pressable>
        </View>
    );
}

const styles = StyleSheet.create({
    settingsContainer: {
        backgroundColor: DaPaintButtons.faq.background,
        borderColor: DaPaintButtons.faq.border,
        borderRadius: DaPaintRadius.md,
        borderWidth: 1,
        overflow: 'hidden',
    },
    settingButton: {
        alignItems: 'flex-start',
        backgroundColor: 'transparent',
        borderBottomColor: DaPaintButtons.faq.border,
        borderBottomWidth: 1,
        justifyContent: 'center',
        minHeight: 52,
        paddingHorizontal: DaPaintSpacing.md,
        width: '100%',
    },
    settingButtonLast: {
        borderBottomWidth: 0,
    },
    settingButtonText: {
        ...DaPaintTypography.bodyMedium,
        color: DaPaintButtons.faq.text,
    },
});
