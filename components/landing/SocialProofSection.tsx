import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface SocialProofSectionProps {
  animation?: any;
  enterStyle?: object;
  exitStyle?: object;
}

export const SocialProofSection: React.FC<SocialProofSectionProps> = ({ 
  animation,
  enterStyle,
  exitStyle
}) => {
  return (
    <View 
      style={[styles.container, enterStyle, exitStyle]}
    >
      <Text style={styles.joinText}>
        Join 100,000+ Indulgers worldwide.
      </Text>
      <View style={styles.avatarContainer}>
        {[1, 2, 3, 4, 5].map((item) => (
          <View
            key={item}
            style={styles.avatar}
          >
            <Text style={styles.avatarText}>👤</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
    marginTop: 1,
  },
  joinText: {
    color: '#2B5275',
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 5,
    opacity: 0.85,
  },
  avatarContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: 'rgba(255,255,255,0.5)',
    borderWidth: 2,
    shadowColor: 'rgba(0, 0, 0, 0.35)',
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 10,
    elevation: 8,
  },
  avatarText: {
    color: 'white',
    fontSize: 16,
  },
});