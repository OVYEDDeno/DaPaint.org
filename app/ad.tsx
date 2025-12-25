import { View, StyleSheet } from 'react-native';
import AdScreen from '../components/swipe/AdScreen';
import { theme } from '../constants/theme';

export default function AdRoute() {
  const handleComplete = () => {
    // For standalone ad screen, we'll just log completion
    console.log('Ad completed');
  };

  return (
    <View style={styles.container}>
      <AdScreen onComplete={handleComplete} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bg0,
  },
});