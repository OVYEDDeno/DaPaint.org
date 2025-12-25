import React from 'react';
import { View, StyleSheet } from 'react-native';

interface TermsSectionProps {
  animation?: any;
  enterStyle?: object;
  exitStyle?: object;
}

export const TermsSection: React.FC<TermsSectionProps> = ({
  enterStyle,
  exitStyle
}) => {
  return (
    <View style={[styles.container, enterStyle, exitStyle]} />
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    padding: 10,
  },
  text: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  link: {
    color: '#005c82',
    textDecorationLine: 'underline',
  },
});
