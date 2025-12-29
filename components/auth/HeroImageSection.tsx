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
  exitStyle,
}) => {
  return (
    <View style={[styles.container, enterStyle, exitStyle]}>
      <Image
        source={require('../../assets/DaPainthero.png')}
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
    height: height * 0.3,
    width: '100%',
  },
});
