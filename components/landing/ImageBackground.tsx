import React from "react";
import { View, Image, StyleSheet, Platform } from "react-native";

export const ImageBackground = () => {
  const nativePointerEventsProps = Platform.OS === "web" ? {} : ({ pointerEvents: "none" } as const);
  const webPointerEvents = Platform.OS === "web" ? ({ pointerEvents: "none" } as any) : null;
  return (
    <View style={[StyleSheet.absoluteFill, webPointerEvents]} {...nativePointerEventsProps}>
      <Image
        source={require("../../assets/DaPaintbg.jpeg")}
        style={StyleSheet.absoluteFillObject}
        resizeMode="cover"
      />
      {/* dark cinematic overlay */}
      {/* <View style={styles.overlay} /> */}
      {/* subtle vignette */}
      {/* <View style={styles.vignette} /> */}
    </View>
  );
};


