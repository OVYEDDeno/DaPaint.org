import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import {
    DaPaintButtons,
    DaPaintColors,
    DaPaintRadius,
    DaPaintSpacing,
    DaPaintTypography,
} from '../../constants/DaPaintDesign';

interface ProfileStatsProps {
    userData: any;
    subscriberCount: number;
}

export default function ProfileStats({ userData, subscriberCount }: ProfileStatsProps) {
    const userStats = [
        { label: 'Subscribers', value: subscriberCount.toString() },
        { label: 'Win Streak', value: userData?.current_winstreak || '0' },
        { label: 'Highest Win Streak', value: userData?.highest_winstreak || '0' },
        { label: 'Wins', value: userData?.wins || '0' },
        { label: 'Losses', value: userData?.losses || '0' },
        {
            label: 'Win Rate',
            value:
                userData?.wins !== undefined &&
                    userData?.losses !== undefined &&
                    userData.wins + userData.losses > 0
                    ? `${Math.round((userData.wins / (userData.wins + userData.losses)) * 100)}%`
                    : '0%',
        },
        { label: 'Disqualifications', value: userData?.disqualifications || '0' },
    ];

    return (
        <View style={styles.statsSection}>
            <Text style={styles.sectionTitle}>Stats</Text>
            <View style={styles.statsGrid}>
                {userStats.map((stat, index) => (
                    <View key={index} style={styles.statCard}>
                        <Text style={styles.statValue}>{stat.value}</Text>
                        <Text style={styles.statLabel}>{stat.label}</Text>
                    </View>
                ))}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    statsSection: {
        marginBottom: DaPaintSpacing.xl,
    },
    sectionTitle: {
        ...DaPaintTypography.displaySmall,
        color: DaPaintColors.textPrimary,
        marginBottom: DaPaintSpacing.md,
        textAlign: 'center',
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: DaPaintSpacing.sm,
        justifyContent: 'space-between',
    },
    statCard: {
        alignItems: 'center',
        backgroundColor: DaPaintButtons.faq.background,
        borderColor: DaPaintButtons.faq.border,
        borderRadius: DaPaintRadius.md,
        borderWidth: 1,
        flex: 1,
        minWidth: '48%',
        paddingHorizontal: DaPaintSpacing.md,
        paddingVertical: DaPaintSpacing.md,
    },
    statValue: {
        ...DaPaintTypography.displaySmall,
        color: DaPaintColors.textPrimary,
        marginBottom: DaPaintSpacing.xxs,
    },
    statLabel: {
        ...DaPaintTypography.bodySmall,
        color: DaPaintColors.textTertiary,
        textAlign: 'center',
    },
});
