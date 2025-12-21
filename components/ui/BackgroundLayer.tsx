import React from "react";
import { View, StyleSheet, Image } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

interface BackgroundLayerProps {
  zIndex?: number;
}

export default function BackgroundLayer({ zIndex = -1 }: BackgroundLayerProps) {
  return (
    <View style={[styles.container, { zIndex }]} pointerEvents="none">  
      <Image
        source={require("../../assets/DaPaintbg.jpeg")}
        style={styles.image}
        resizeMode="cover"
      />
      {/* Background gradient overlay for text readability */}
      <LinearGradient
        colors={['rgba(0,0,0,0.12)', 'rgba(0,0,0,0.0)', 'rgba(0,0,0,0.25)']}
        locations={[0, 0.5, 1]}
        style={styles.gradient}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  gradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
});
