// components/swipe/MatchScreen.tsx - cinematic match with global theme
import * as Sharing from 'expo-sharing';
import React, { useMemo, useRef } from 'react';
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

type MatchScreenProps = {
  dapaint: DaPaint;
  onContinue: () => void;
  onGoToActive: () => void;
};

export default function MatchScreen({
  dapaint,
  onGoToActive,
}: MatchScreenProps) {
  const viewRef = useRef(null);

  const when = useMemo(() => {
    const d = new Date(dapaint.starts_at);
    if (Number.isNaN(d.getTime())) return 'TBD';
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  }, [dapaint.starts_at]);

  const handleShare = async () => {
    // Check if we're on web platform where captureRef might not work
    if (Platform.OS === 'web') {
      Alert.alert(
        'Not Supported',
        'Screenshot sharing is not available on web. Please use the mobile app.'
      );
      return;
    }

    // Check if captureRef is available
    if (!captureRef) {
      Alert.alert(
        'Not Supported',
        'Screenshot sharing is not available on this platform.'
      );
      return;
    }

    try {
      if (!viewRef.current) {
        Alert.alert('Error', 'Unable to capture screenshot');
        return;
      }

      // Capture the view as an image
      const uri = await captureRef(viewRef.current, {
        format: 'png',
        quality: 0.8,
      });

      // Check if sharing is available
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert(
          'Sharing Unavailable',
          'Sharing is not available on your device'
        );
        return;
      }

      // Share the captured image
      await Sharing.shareAsync(uri, {
        mimeType: 'image/png',
        dialogTitle: 'Share your DaPaint match',
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
        <View style={styles.iconWrap}>
          <Text style={styles.emoji}>🎉</Text>
        </View>

        <Text style={styles.title}>Locked in.</Text>
        <Text style={styles.subtitle}>You joined:</Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle} numberOfLines={2}>
            {dapaint.dapaint}
          </Text>

          <View style={styles.row}>
            <Text style={styles.icon}>👤</Text>
            <Text style={styles.rowText}>
              Hosted by {dapaint.host_display_name}
            </Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.icon}>📍</Text>
            <Text style={styles.rowText}>
              {dapaint.location}, {dapaint.city}
            </Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.icon}>🕒</Text>
            <Text style={styles.rowText}>{when}</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.icon}>🏅</Text>
            <Text style={styles.rowText}>
              {dapaint.how_winner_is_determined}
            </Text>
          </View>
        </View>

        <View style={styles.buttons}>
          <Pressable
            style={({ pressed }) => [
              styles.primaryBtn,
              pressed && styles.pressed,
            ]}
            onPress={onGoToActive}
          >
            <Text style={styles.primaryText}>View DaPaint →</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.secondaryBtn,
              pressed && styles.pressed,
            ]}
            onPress={handleShare}
          >
            <Text style={styles.secondaryText}>Share</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  buttons: {
    gap: theme.space.sm,
    width: '100%',
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.xl,
    borderWidth: 1,
    marginBottom: theme.space.lg,
    padding: theme.space.lg,
    width: '100%',
    ...theme.shadow.medium,
  },

  cardTitle: {
    ...theme.type.displayMedium,
    color: theme.colors.textPrimary,
    marginBottom: theme.space.sm,
  },
  container: {
    alignItems: 'center',
    backgroundColor: 'transparent',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: theme.space.lg,
  },

  content: {
    alignItems: 'center',
    maxWidth: 420,
    width: '100%',
  },
  emoji: { fontSize: 64 },

  icon: { fontSize: 20 },
  iconWrap: {
    alignItems: 'center',
    backgroundColor: 'rgba(46,196,255,0.10)',
    borderColor: 'rgba(46,196,255,0.25)',
    borderRadius: 60,
    borderWidth: 1,
    height: 120,
    justifyContent: 'center',
    marginBottom: theme.space.lg,
    width: 120,
    ...theme.shadow.glowPrimary,
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.985 }],
  },
  primaryBtn: {
    alignItems: 'center',
    backgroundColor: theme.colors.primaryDeep,
    borderRadius: theme.radius.md,
    paddingVertical: theme.space.sm,
    ...theme.shadow.glowPrimary,
  },
  primaryText: {
    ...theme.type.labelLarge,
    color: '#ffffff',
  },

  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.space.sm,
    marginTop: theme.space.xs,
  },
  rowText: {
    flex: 1,
    ...theme.type.bodyLarge,
    color: theme.colors.textPrimary,
  },
  secondaryBtn: {
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderColor: theme.colors.primaryDeep,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    paddingVertical: theme.space.sm,
  },
  secondaryText: {
    ...theme.type.labelLarge,
    color: theme.colors.primaryDeep,
  },
  subtitle: {
    ...theme.type.bodyLarge,
    color: theme.colors.textSecondary,
    marginBottom: theme.space.lg,
    textAlign: 'center',
  },
  title: {
    ...theme.type.displayXL,
    color: theme.colors.textPrimary,
    marginBottom: theme.space.xxs,
    textAlign: 'center',
  },
});
