import React from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';

interface HeroTextSectionProps {
  animation?: any;
  enterStyle?: object;
  exitStyle?: object;
  onShowFAQ?: () => void;
}

export const HeroTextSection: React.FC<HeroTextSectionProps> = ({
  enterStyle,
  exitStyle,
  onShowFAQ,
}) => {
  return (
    <View style={[styles.container, enterStyle, exitStyle]}>
      <Text style={styles.mainTitle}>The Fast Way to Earn $1,000,000</Text>
      <Text style={styles.subtitle}>
        Make custom DaPaints. Compete in under 24 hours in 140+ countries.
      </Text>

      {onShowFAQ && (
        <View style={styles.buttonContainer}>
          <Pressable style={styles.faqButton} onPress={onShowFAQ}>
            <Text style={styles.faqButtonText}>FAQ</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  buttonContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    width: '100%',
  },
  faqButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 92, 130, 0.1)',
    borderColor: 'rgba(0, 92, 130, 0.3)',
    borderRadius: 20,
    borderWidth: 1,
    height: 40,
    justifyContent: 'center',
    paddingHorizontal: 15,
  },
  faqButtonText: {
    color: '#005c82',
    fontSize: 14,
    fontWeight: '600',
  },
  mainTitle: {
    color: '#005c82',
    fontSize: 34,
    fontWeight: '700',
    marginBottom: 10,
    marginTop: 20,
    textAlign: 'center',
    ...Platform.select({
      web: {
        textShadow: '0px 1px 3px rgba(0, 0, 0, 0.25)',
      },
      default: {
        textShadowColor: 'rgba(0, 0, 0, 0.25)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 3,
      },
    }),
  },
  subtitle: {
    color: '#005c82',
    fontSize: 17,
    marginBottom: 20,
    marginHorizontal: 30,
    opacity: 0.85,
    textAlign: 'center',
    ...Platform.select({
      web: {
        textShadow: '0px 1px 3px rgba(0, 0, 0, 0.25)',
      },
      default: {
        textShadowColor: 'rgba(0, 0, 0, 0.25)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 3,
      },
    }),
  },
});
