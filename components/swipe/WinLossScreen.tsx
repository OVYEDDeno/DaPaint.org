// components/swipe/WinLossScreen.tsx - cinematic result celebration
import * as Sharing from 'expo-sharing';
import React, { useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Pressable,
    Alert,
    Platform,
} from 'react-native';

import { theme } from '../../constants/theme';
import type { DaPaint } from '../../lib/api/dapaints';
import BackgroundLayer from '../ui/BackgroundLayer';

// Conditional import for view shot to avoid web issues
let captureRef: any;
try {
    if (Platform.OS !== 'web') {
        captureRef = require('react-native-view-shot').captureRef;
    }
} catch (error) {
    console.warn('react-native-view-shot not available:', error);
    captureRef = null;
}

type WinLossScreenProps = {
    dapaint: DaPaint;
    isWinner: boolean;
    onContinue: () => void;
};

export default function WinLossScreen({
    dapaint,
    isWinner,
    onContinue,
}: WinLossScreenProps) {
    const viewRef = useRef(null);

    const statusText = isWinner ? 'VICTORY' : 'DEFEAT';
    const emoji = isWinner ? '🏆' : '😞';
    const primaryColor = isWinner ? theme.colors.success : theme.colors.error;

    const handleShare = async () => {
        if (Platform.OS === 'web') {
            Alert.alert('Not Supported', 'Please use the mobile app to share screenshots.');
            return;
        }

        if (!captureRef || !viewRef.current) {
            Alert.alert('Error', 'Unable to capture screenshot');
            return;
        }

        try {
            const uri = await captureRef(viewRef.current, {
                format: 'png',
                quality: 0.8,
            });

            const isAvailable = await Sharing.isAvailableAsync();
            if (!isAvailable) {
                Alert.alert('Sharing Unavailable', 'Sharing is not available on your device');
                return;
            }

            await Sharing.shareAsync(uri, {
                mimeType: 'image/png',
                dialogTitle: `I ${isWinner ? 'won' : 'competed in'} a DaPaint challenge!`,
            });
        } catch (error) {
            console.error('Error sharing:', error);
            Alert.alert('Error', 'Failed to share screenshot');
        }
    };

    return (
        <View style={styles.container}>
            <BackgroundLayer />
            <View ref={viewRef} style={styles.content} collapsable={false}>
                <View style={[styles.iconWrap, { borderColor: primaryColor + '40', backgroundColor: primaryColor + '10' }]}>
                    <Text style={styles.emoji}>{emoji}</Text>
                </View>

                <Text style={[styles.title, { color: primaryColor }]}>{statusText}</Text>
                <Text style={styles.subtitle}>{isWinner ? 'Winning streak increased!' : 'Better luck next time.'}</Text>

                <View style={styles.card}>
                    <Text style={styles.cardTitle}>{dapaint.dapaint}</Text>
                    <View style={styles.row}>
                        <Text style={styles.rowText}>📍 {dapaint.location}, {dapaint.city}</Text>
                    </View>
                    <View style={styles.row}>
                        <Text style={styles.rowText}>🏅 {dapaint.how_winner_is_determined}</Text>
                    </View>
                </View>

                <View style={styles.buttons}>
                    <Pressable
                        style={({ pressed }) => [
                            styles.primaryBtn,
                            { backgroundColor: primaryColor },
                            pressed && styles.pressed,
                        ]}
                        onPress={onContinue}
                    >
                        <Text style={styles.primaryText}>Continue</Text>
                    </Pressable>

                    <Pressable
                        style={({ pressed }) => [
                            styles.secondaryBtn,
                            { borderColor: primaryColor },
                            pressed && styles.pressed,
                        ]}
                        onPress={handleShare}
                    >
                        <Text style={[styles.secondaryText, { color: primaryColor }]}>Share Result</Text>
                    </Pressable>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: theme.space.lg,
        backgroundColor: 'transparent',
    },
    content: {
        width: '100%',
        maxWidth: 420,
        alignItems: 'center',
    },
    iconWrap: {
        width: 120,
        height: 120,
        borderRadius: 60,
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: theme.space.lg,
        ...theme.shadow.medium,
    },
    emoji: { fontSize: 64 },
    title: {
        ...theme.type.displayXL,
        textAlign: 'center',
        marginBottom: theme.space.xxs,
    },
    subtitle: {
        ...theme.type.bodyLarge,
        color: theme.colors.textSecondary,
        textAlign: 'center',
        marginBottom: theme.space.lg,
    },
    card: {
        width: '100%',
        padding: theme.space.lg,
        backgroundColor: theme.colors.surface,
        borderRadius: theme.radius.xl,
        borderWidth: 1,
        borderColor: theme.colors.border,
        marginBottom: theme.space.xl,
        ...theme.shadow.medium,
    },
    cardTitle: {
        ...theme.type.displayMedium,
        color: theme.colors.textPrimary,
        marginBottom: theme.space.sm,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: theme.space.xs,
    },
    rowText: {
        ...theme.type.bodyLarge,
        color: theme.colors.textSecondary,
    },
    buttons: {
        width: '100%',
        gap: theme.space.sm,
    },
    primaryBtn: {
        paddingVertical: theme.space.sm,
        borderRadius: theme.radius.md,
        alignItems: 'center',
        ...theme.shadow.medium,
    },
    primaryText: {
        ...theme.type.labelLarge,
        color: '#ffffff',
    },
    secondaryBtn: {
        paddingVertical: theme.space.sm,
        borderRadius: theme.radius.md,
        borderWidth: 1,
        alignItems: 'center',
    },
    secondaryText: {
        ...theme.type.labelLarge,
    },
    pressed: {
        opacity: 0.9,
        transform: [{ scale: 0.985 }],
    },
});
