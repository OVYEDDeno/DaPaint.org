import React from "react";
import { View, Image, StyleSheet } from "react-native";

export const ImageBackground = () => {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
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


