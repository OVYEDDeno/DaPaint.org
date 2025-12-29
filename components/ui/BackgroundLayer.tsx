import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { View, StyleSheet, Image, Platform } from 'react-native';

interface BackgroundLayerProps {
  zIndex?: number;
}

export default function BackgroundLayer({ zIndex = -1 }: BackgroundLayerProps) {
  // Web-specific props to prevent focus and accessibility warnings
  // Don't apply aria-hidden to the main container as it may become an ancestor of focusable elements
  const webProps =
    Platform.OS === 'web'
      ? {
          // @ts-ignore - web-only props
          // aria-hidden is removed from container to prevent accessibility conflicts
        }
      : {};

  return (
    <View
      style={[styles.container, { zIndex, pointerEvents: 'none' }]}
      {...webProps}
    >
      <Image
        source={require('../../assets/DaPaintbg.jpeg')}
        style={styles.image}
        resizeMode="cover"
        // Also mark image as decorative
        {...(Platform.OS === 'web'
          ? {
              // @ts-ignore
              'aria-hidden': true,
              alt: '',
            }
          : {})}
      />
      {/* Background gradient overlay for text readability */}
      <LinearGradient
        colors={['rgba(0,0,0,0.12)', 'rgba(0,0,0,0.0)', 'rgba(0,0,0,0.25)']}
        locations={[0, 0.5, 1]}
        style={styles.gradient}
        // @ts-ignore - web-only prop
        {...(Platform.OS === 'web' ? { 'aria-hidden': true } : {})}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  gradient: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  image: {
    height: '100%',
    width: '100%',
  },
});
