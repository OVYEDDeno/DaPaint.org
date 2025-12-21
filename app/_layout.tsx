// app/_layout.tsx
import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { supabase } from '../lib/supabase';
import logger from '../lib/logger';
import BackgroundLayer from '../components/ui/BackgroundLayer';

export default function RootLayout() {
  const [sessionChecked, setSessionChecked] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    // Check for existing session
    const checkSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        // Handle session retrieval errors
        if (error) {
          logger.error('Error getting session:', error);
          // Clear any invalid session data
          try {
            await supabase.auth.signOut();
          } catch (signOutError) {
            logger.error('Error during sign out:', signOutError);
          }
          setIsLoggedIn(false);
          setSessionChecked(true);
          return;
        }
        
        setIsLoggedIn(!!session);
        logger.debug('Session check complete. Logged in:', !!session);
      } catch (error) {
        logger.error('Unexpected error checking session:', error);
        // Clear any invalid session data
        try {
          await supabase.auth.signOut();
        } catch (signOutError) {
          logger.error('Error during sign out:', signOutError);
        }
        setIsLoggedIn(false);
      } finally {
        setSessionChecked(true);
      }
    };

    checkSession();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      logger.debug('Auth state changed:', _event);
      setIsLoggedIn(!!session);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Don't render anything until we've checked the session
  if (!sessionChecked) {
    return null;
  }

  return (
    <View style={styles.root}>
      <BackgroundLayer />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
      </Stack>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
