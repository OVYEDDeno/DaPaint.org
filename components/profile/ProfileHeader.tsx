import React from 'react';
import { View, Text, Image, Pressable, StyleSheet } from 'react-native';
import {
    DaPaintColors,
    DaPaintRadius,
    DaPaintShadows,
    DaPaintSpacing,
    DaPaintTypography,
} from '../../constants/DaPaintDesign';
import { getProfilePicUrl } from '../../lib/profilePics';

interface ProfileHeaderProps {
    userData: any;
    subscriberCount: number;
    avatarError: boolean;
    setAvatarError: (error: boolean) => void;
    refreshTrigger: number;
    onUploadPicture: () => void;
}

const FALLBACK_AVATAR = require('../../assets/logo.png');

export default function ProfileHeader({
    userData,
    subscriberCount,
    avatarError,
    setAvatarError,
    refreshTrigger,
    onUploadPicture,
}: ProfileHeaderProps) {
    // Get avatar URI with cache busting enabled
    const avatarUri = userData?.image_path
        ? getProfilePicUrl(userData.image_path, true)
        : null;

    return (
        <View style={styles.headerContainer}>
            <View style={styles.avatarContainer}>
                <Image
                    key={`avatar-${refreshTrigger}`}
                    source={
                        !avatarUri || avatarError
                            ? FALLBACK_AVATAR
                            : { uri: avatarUri }
                    }
                    style={styles.avatar}
                    resizeMode="cover"
                    onError={() => setAvatarError(true)}
                />
                <Pressable
                    style={styles.changePictureButton}
                    onPress={onUploadPicture}
                >
                    <Text style={styles.changePictureText}>+</Text>
                </Pressable>
            </View>

            <View style={styles.userInfoContainer}>
                <Text style={styles.displayName}>
                    {userData?.display_name || 'User'}
                </Text>
                <Text style={styles.username}>
                    @{userData?.username || 'username'}
                </Text>
                {(userData?.city || userData?.zipcode) && (
                    <Text style={styles.location}>
                        {[userData?.city, userData?.zipcode]
                            .filter(Boolean)
                            .join(' - ')}
                    </Text>
                )}
                <Text style={styles.subscriberCount}>
                    {subscriberCount} subscribers
                </Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    headerContainer: {
        alignItems: 'center',
        marginBottom: DaPaintSpacing.xl,
    },
    avatarContainer: {
        borderColor: DaPaintColors.primaryDeep,
        borderRadius: DaPaintRadius.full,
        borderWidth: 3,
        height: 120,
        marginBottom: DaPaintSpacing.md,
        overflow: 'hidden',
        width: 120,
        ...DaPaintShadows.medium,
        position: 'relative',
    },
    avatar: {
        height: '100%',
        width: '100%',
    },
    changePictureButton: {
        backgroundColor: DaPaintColors.primaryDeep,
        borderColor: DaPaintColors.bg0,
        borderRadius: DaPaintRadius.full,
        borderWidth: 2,
        bottom: -8,
        padding: DaPaintSpacing.xs,
        position: 'absolute',
        right: -8,
        zIndex: 10,
    },
    changePictureText: {
        color: '#FFFFFF',
        ...DaPaintTypography.labelSmall,
        fontSize: 10,
    },
    userInfoContainer: {
        alignItems: 'center',
        marginBottom: DaPaintSpacing.md,
    },
    displayName: {
        color: DaPaintColors.textPrimary,
        ...DaPaintTypography.displayMedium,
        marginBottom: DaPaintSpacing.xxs,
    },
    username: {
        color: DaPaintColors.textSecondary,
        ...DaPaintTypography.bodyMedium,
        marginBottom: DaPaintSpacing.xxs,
    },
    location: {
        color: DaPaintColors.textTertiary,
        ...DaPaintTypography.bodySmall,
        marginBottom: DaPaintSpacing.xxs,
    },
    subscriberCount: {
        color: DaPaintColors.textTertiary,
        ...DaPaintTypography.bodySmall,
    },
});
