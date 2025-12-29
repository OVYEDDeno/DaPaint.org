import * as Sentry from '@sentry/react-native';
import React, { useCallback } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  View,
  Platform,
} from 'react-native';

interface FeedbackButtonProps {
  visible?: boolean;
}

const FeedbackButton: React.FC<FeedbackButtonProps> = ({ visible = true }) => {
  // Sentry React Native feedback widgets rely on native/modal infrastructure and can break on RN-web.
  if (Platform.OS === 'web') {
    return null;
  }

  const anySentry = Sentry as any;
  const canShowFeedback =
    typeof anySentry.showFeedbackWidget === 'function' ||
    typeof anySentry.showFeedbackForm === 'function';

  const showFeedback = useCallback(() => {
    try {
      if (typeof anySentry.showFeedbackWidget === 'function') {
        anySentry.showFeedbackWidget();
        return;
      }
      if (typeof anySentry.showFeedbackForm === 'function') {
        anySentry.showFeedbackForm();
      }
    } catch {
      // No-op: feedback widgets require Sentry's provider wiring to be present.
    }
  }, [anySentry]);

  if (!visible || !canShowFeedback) {
    // If we want to hide the button but still allow feedback functionality
    return null;
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.button} onPress={showFeedback}>
        <Text style={styles.buttonText}>Feedback</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#6a1b9a', // Purple color matching the submit button in Sentry config
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
      },
      android: {
        elevation: 5,
      },
      web: {
        boxShadow: '0px 2px 3.84px rgba(0,0,0,0.25)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
      },
    }),
  },
  buttonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  container: {
    bottom: 20,
    position: 'absolute',
    right: 20,
    zIndex: 9999,
  },
});

export default FeedbackButton;
