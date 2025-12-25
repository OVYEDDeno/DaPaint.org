import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { SocialProofSection } from './SocialProofSection';

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
    <View
      style={[styles.container, enterStyle, exitStyle]}
    >
      <SocialProofSection />

      <Text style={styles.mainTitle}>
        The Fast Way to Earn $1,000,000
      </Text>
      <Text style={styles.subtitle}>
        Make custom DaPaints. Compete in under 24 hours in 140+ countries.
      </Text>

      {onShowFAQ && (
        <View style={styles.buttonContainer}>
          <Pressable
            style={styles.faqButton}
            onPress={onShowFAQ}
          >
            <Text style={styles.faqButtonText}>
              FAQ
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    flexGrow: 1,
    justifyContent: 'center',
  },
  mainTitle: {
    color: '#005c82',
    fontSize: 34,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 10,
    textShadowColor: 'rgba(0, 0, 0, 0.25)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  subtitle: {
    color: '#005c82',
    fontSize: 17,
    textAlign: 'center',
    opacity: 0.85,
    marginBottom: 20,
    marginHorizontal: 30,
    textShadowColor: 'rgba(0, 0, 0, 0.25)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  buttonContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  faqButton: {
    backgroundColor: 'rgba(0, 92, 130, 0.1)',
    borderColor: 'rgba(0, 92, 130, 0.3)',
    borderWidth: 1,
    borderRadius: 20,
    height: 40,
    paddingHorizontal: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  faqButtonText: {
    color: '#005c82',
    fontSize: 14,
    fontWeight: '600',
  },
});
