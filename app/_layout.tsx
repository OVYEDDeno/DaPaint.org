// app/_layout.tsx
import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { supabase } from '../lib/supabase';
import logger from '../lib/logger';
import BackgroundLayer from '../components/ui/BackgroundLayer';
import Head from 'expo-router/head';

export default function RootLayout() {
  const [sessionChecked, setSessionChecked] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    // Web-specific: Load theme.css
    if (Platform.OS === 'web') {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = '/theme.css';
      document.head.appendChild(link);
    }

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
    <>
      {Platform.OS === 'web' && (
        <Head>
          <title>DaPaint.org - Compete. Win. Get Paid.</title>
          <meta name="description" content="Create and join competitive challenges. Win streaks earn real money." />
          <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
          <meta property="og:title" content="DaPaint.org" />
          <meta property="og:description" content="Compete. Win. Get Paid." />
          <meta property="og:type" content="website" />
          <link rel="icon" href="/favicon.ico" />
        </Head>
      )}
      <View style={styles.root}>
        <BackgroundLayer />
        <Stack screenOptions={{ headerShown: false }}>
          {isLoggedIn ? (
            <Stack.Screen name="(tabs)" />
          ) : (
            <Stack.Screen name="(auth)" />
          )}
        </Stack>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});