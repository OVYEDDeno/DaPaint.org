import React from 'react';
import { View, StyleSheet, Image } from 'react-native';

interface LogoSectionProps {
  animation?: any;
  enterStyle?: any;
  exitStyle?: any;
}

export const LogoSection: React.FC<LogoSectionProps> = ({
  animation,
  enterStyle,
  exitStyle,
  ...props
}) => {
  return (
    <View
      style={[styles.container, props.style]}
      {...props}
    >
      <Image
        source={require("../../assets/logo.png")}
        style={styles.logo}
        resizeMode="contain"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    position: 'relative',
  },
  logo: {
    width: 51,
    height: 51,
  },
});