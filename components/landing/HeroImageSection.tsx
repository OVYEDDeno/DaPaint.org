import React from 'react';
import { View, StyleSheet, Image, Dimensions } from 'react-native';

const { height } = Dimensions.get('window');

interface HeroImageSectionProps {
  animation?: any;
  enterStyle?: object;
  exitStyle?: object;
}

export const HeroImageSection: React.FC<HeroImageSectionProps> = ({ 
  enterStyle,
  exitStyle
}) => {
  return (
    <View
      style={[styles.container, enterStyle, exitStyle]}
    >
      <Image
        source={require('../../assets/DaPaintbghero.png')}
        style={styles.image}
        resizeMode="contain"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  image: {
    width: '100%',
    height: height * 0.3,
  },
});