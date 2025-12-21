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

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(7,10,18,0.72)",
  },
  vignette: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.25)",
  },
});
